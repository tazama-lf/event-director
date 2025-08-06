// SPDX-License-Identifier: Apache-2.0
import apm from '../apm';
import { unwrap } from '@tazama-lf/frms-coe-lib/lib/helpers/unwrap';
import { NetworkMap, type DataCache, type Message, type Rule } from '@tazama-lf/frms-coe-lib/lib/interfaces';
import type { MetaData } from '@tazama-lf/frms-coe-lib/lib/interfaces/metaData';
import { configuration, databaseManager, loggerService, nodeCache, server } from '..';
import * as util from 'node:util';

interface UnknownTransaction {
  TxTp: string;
  TenantId?: string;
  [key: string]: unknown;
}

const calculateDuration = (startTime: bigint): number => {
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime);
};

/**
 *Create a list of all the rules for this transaction type from the network map
 
 * @param {NetworkMap} networkMap
 * @param {string} transactionType
 * @return {*}  {Rule[]}
 */
function getRuleMap(networkMap: NetworkMap, transactionType: string): Rule[] {
  const rules: Rule[] = new Array<Rule>();

  // Find the message object in the network map for the transaction type of THIS transaction
  const messages = networkMap.messages.find((tran) => tran.txTp === transactionType);

  // Populate a list of all the rules that's required for this transaction type
  if (messages) {
    for (const typology of messages.typologies) {
      for (const rule of typology.rules) {
        const ruleIndex = rules.findIndex((r: Rule) => r.id === rule.id && r.cfg === rule.cfg);
        if (ruleIndex < 0) {
          rules.push(rule);
        }
      }
    }
  }

  return rules;
}

export const handleTransaction = async (req: unknown): Promise<void> => {
  const startTime = process.hrtime.bigint();
  let networkMap: NetworkMap = new NetworkMap();
  let cachedActiveNetworkMap: NetworkMap;
  let prunedMap: Message[] = [];

  const parsedRequest = req as { transaction: UnknownTransaction; DataCache: DataCache; metaData?: MetaData };
  const traceParent = parsedRequest.metaData?.traceParent;
  const apmTransaction = apm.startTransaction('eventDirector.handleTransaction', {
    childOf: typeof traceParent === 'string' ? traceParent : undefined,
  });

  // Extract tenantId from transaction - this should be surfaced independently in Protobuf payload
  const tenantId = parsedRequest.transaction.TenantId;

  // Validate tenantId based on authentication mode
  const isAuthenticated = process.env.AUTHENTICATED === 'true';

  if (isAuthenticated && (!tenantId || tenantId === '')) {
    throw new Error('TenantId is required in authenticated mode but was not provided by TMS');
  }

  if (!tenantId) {
    loggerService.warn('No tenantId found in transaction payload, using default configuration');
  } else if (tenantId === 'DEFAULT') {
    loggerService.debug('Using DEFAULT tenant configuration for unauthenticated request from TMS');
  } else {
    loggerService.debug(`Processing transaction for tenant: ${tenantId}`);
  }

  // Normalize tenantId for cache key creation (treat 'DEFAULT' as null for backward compatibility)
  const normalizedTenantId = tenantId === 'DEFAULT' ? null : tenantId;

  // Create tenant-specific cache key or use default for backward compatibility
  const tenantCacheKey = normalizedTenantId ? `tenant:${normalizedTenantId}` : 'default';
  const transactionCacheKey = normalizedTenantId
    ? `tenant:${normalizedTenantId}:${parsedRequest.transaction.TxTp}`
    : parsedRequest.transaction.TxTp;

  // Check if there's a tenant-specific active network map in memory for this transaction type
  const activeNetworkMap = nodeCache.get(transactionCacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = activeNetworkMap as NetworkMap;
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    loggerService.debug(`Using cached networkMap for ${tenantId ? `tenant ${tenantId}` : 'default'}: ${util.inspect(prunedMap)}`);
  } else {
    // Check if we have the tenant's full network configuration in cache
    const tenantNetworkMap = nodeCache.get(tenantCacheKey);

    if (tenantNetworkMap) {
      networkMap = tenantNetworkMap as NetworkMap;
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);

      // Cache the transaction-specific network map for this tenant
      const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
      nodeCache.set(transactionCacheKey, networkMap, localCacheTTL);

      loggerService.debug(`Using tenant network map for ${tenantId ? `tenant ${tenantId}` : 'default'}: ${util.inspect(prunedMap)}`);
    } else {
      // Fetch the network map from db
      // Note: Database manager will need enhancement to support tenantId filtering
      const spanNetworkMap = apm.startSpan('db.get.NetworkMap');
      const networkConfigurationList = await databaseManager.getNetworkMap();
      const unwrappedNetworkMap = unwrap<NetworkMap>(networkConfigurationList as NetworkMap[][]);
      spanNetworkMap?.end();

      if (unwrappedNetworkMap) {
        // Check if this network map belongs to the requested tenant (support both cases)
        const networkMapWithTenant = unwrappedNetworkMap as NetworkMap & { TenantId?: string; tenantId?: string };
        const networkMapTenantId = networkMapWithTenant.TenantId ?? networkMapWithTenant.tenantId;

        // Check if this network map belongs to the requested tenant
        // Handle DEFAULT tenant case and tenant matching
        const isDefaultConfig = !networkMapTenantId;
        const isMatchingTenant = networkMapTenantId === tenantId || networkMapTenantId === normalizedTenantId;
        const shouldUseConfig = !normalizedTenantId || isDefaultConfig || isMatchingTenant;

        if (shouldUseConfig) {
          networkMap = unwrappedNetworkMap;
          // Save networkmap in memory cache with tenant-specific key
          const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
          nodeCache.set(tenantCacheKey, networkMap, localCacheTTL);
          nodeCache.set(transactionCacheKey, networkMap, localCacheTTL);
          prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);

          loggerService.log(
            `Loaded and cached network map for ${normalizedTenantId ? `tenant: ${normalizedTenantId}` : 'default configuration'}`,
          );
        } else {
          loggerService.log(
            `No network map found in DB for ${normalizedTenantId ? `tenant: ${normalizedTenantId}` : 'default configuration'}`,
          );
          const result = {
            prcgTmED: calculateDuration(startTime),
            rulesSentTo: [],
            failedToSend: [],
            networkMap: {},
            transaction: parsedRequest.transaction,
            DataCache: parsedRequest.DataCache,
          };
          loggerService.debug(util.inspect(result));
          apmTransaction?.end();
          return;
        }
      } else {
        loggerService.log(`No network map found in DB for ${tenantId ? `tenant: ${tenantId}` : 'default configuration'}`);
        const result = {
          prcgTmED: calculateDuration(startTime),
          rulesSentTo: [],
          failedToSend: [],
          networkMap: {},
          transaction: parsedRequest.transaction,
          DataCache: parsedRequest.DataCache,
        };
        loggerService.debug(util.inspect(result));
        apmTransaction?.end();
        return;
      }
    }
  }
  if (prunedMap.length > 0) {
    // Create network sub-map, preserving tenant information if present
    const networkMapWithTenant = networkMap as NetworkMap & { TenantId?: string };
    const networkSubMap: NetworkMap & { TenantId?: string } = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
      ...(networkMapWithTenant.TenantId && { TenantId: networkMapWithTenant.TenantId }),
    });

    // Deduplicate all rules
    const rules = getRuleMap(networkMap, parsedRequest.transaction.TxTp);

    // Send transaction to all rules
    const promises: Array<Promise<void>> = [];
    const metaData: MetaData = { prcgTmDp: 0, ...parsedRequest.metaData, prcgTmED: calculateDuration(startTime) };

    for (const rule of rules) {
      promises.push(sendRuleToRuleProcessor(rule, networkSubMap, parsedRequest.transaction, parsedRequest.DataCache, metaData));
    }
    await Promise.all(promises);
  } else {
    loggerService.log(
      `No corresponding message found in Network map for ${normalizedTenantId ? `tenant ${normalizedTenantId}` : 'default configuration'}`,
    );
    const result = {
      metaData: { ...parsedRequest.metaData, prcgTmED: calculateDuration(startTime) },
      networkMap: {},
      transaction: parsedRequest.transaction,
      DataCache: parsedRequest.DataCache,
    };
    loggerService.debug(util.inspect(result));
  }
  apmTransaction?.end();
};

const sendRuleToRuleProcessor = async (
  rule: Rule,
  networkMap: NetworkMap,
  req: UnknownTransaction,
  dataCache: DataCache,
  metaData: MetaData,
): Promise<void> => {
  const span = apm.startSpan(`send.rule${rule.id}.to.proc`);
  try {
    const toSend = {
      transaction: req,
      networkMap,
      DataCache: dataCache,
      metaData: { ...metaData, traceParent: apm.getCurrentTraceparent() },
    };
    await server.handleResponse(toSend, [`sub-rule-${rule.id}`]);
    loggerService.log(`Successfully sent to ${rule.id}`);
  } catch (error) {
    loggerService.error(`Failed to send to Rule ${rule.id} with Error: ${util.inspect(error)}`);
  }
  span?.end();
};

/**
 * Load all active network configurations into cache at startup
 * Each tenant's network configuration is cached separately by tenantId
 */
export const loadAllNetworkConfigurations = async (): Promise<void> => {
  try {
    loggerService.log('Loading all tenant network configurations at startup...');

    // Fetch all network maps from database
    const networkConfigurationList = (await databaseManager.getNetworkMap()) as NetworkMap[][];

    if (networkConfigurationList && networkConfigurationList.length > 0) {
      const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
      let loadedCount = 0;

      // Process each network configuration
      for (const networkMapArray of networkConfigurationList) {
        if (networkMapArray && networkMapArray.length > 0) {
          for (const networkMap of networkMapArray) {
            const unwrappedNetworkMap = networkMap;

            if (unwrappedNetworkMap?.active) {
              // Check if this network map has a tenantId (support both cases for compatibility)
              const networkMapWithTenant = unwrappedNetworkMap as NetworkMap & { TenantId?: string; tenantId?: string };
              const tenantIdValue = networkMapWithTenant.TenantId ?? networkMapWithTenant.tenantId;

              if (tenantIdValue) {
                // Normalize tenantId - treat 'DEFAULT' as legacy configuration
                const normalizedTenantForCache = tenantIdValue === 'DEFAULT' ? null : tenantIdValue;

                if (normalizedTenantForCache) {
                  // Cache the tenant's network configuration
                  const tenantCacheKey = `tenant:${normalizedTenantForCache}`;
                  nodeCache.set(tenantCacheKey, unwrappedNetworkMap, localCacheTTL);
                  loggerService.log(`Loaded network configuration for tenant: ${normalizedTenantForCache}`);
                  loadedCount++;
                } else {
                  // Handle DEFAULT tenant from TMS or legacy configurations
                  const legacyCacheKey = 'default';
                  nodeCache.set(legacyCacheKey, unwrappedNetworkMap, localCacheTTL);
                  loggerService.log('Loaded DEFAULT tenant network configuration from TMS');
                  loadedCount++;
                }
              } else {
                // For backward compatibility, cache without tenant prefix for legacy configurations
                const legacyCacheKey = 'default';
                nodeCache.set(legacyCacheKey, unwrappedNetworkMap, localCacheTTL);
                loggerService.log('Loaded default network configuration (no tenantId specified)');
                loadedCount++;
              }
            }
          }
        }
      }

      if (loadedCount > 0) {
        loggerService.log(`Successfully loaded ${loadedCount} network configurations for multi-tenant support`);
      } else {
        loggerService.log('No active network configurations found in database');
      }
    } else {
      loggerService.log('No network configurations found in database');
    }
  } catch (error) {
    loggerService.error(`Failed to load network configurations at startup: ${util.inspect(error)}`);
    throw error;
  }
};
