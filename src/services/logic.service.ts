// SPDX-License-Identifier: Apache-2.0
import apm from '../apm';
import { unwrap } from '@tazama-lf/frms-coe-lib/lib/helpers/unwrap';
import { NetworkMap, type DataCache, type Message, type Rule } from '@tazama-lf/frms-coe-lib/lib/interfaces';
import type { MetaData } from '@tazama-lf/frms-coe-lib/lib/interfaces/metaData';
import { configuration, databaseManager, loggerService, nodeCache, server } from '..';
import * as util from 'node:util';

interface UnknownTransaction {
  TxTp: string;
  tenantId?: string;
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
  let prunedMap: Message[] = [];

  const parsedRequest = req as { transaction: UnknownTransaction; DataCache: DataCache; metaData?: MetaData };
  const traceParent = parsedRequest.metaData?.traceParent;
  const apmTransaction = apm.startTransaction('eventDirector.handleTransaction', {
    childOf: typeof traceParent === 'string' ? traceParent : undefined,
  });

  // Extract tenantId from transaction - this should be surfaced independently in Protobuf payload
  const { tenantId } = parsedRequest.transaction;

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

  // Create transaction-specific cache key for optimal performance
  // Format: "tenant:${tenantId}:${transactionType}" or just "${transactionType}" for default tenant
  const cacheKey = normalizedTenantId ? `tenant:${normalizedTenantId}:${parsedRequest.transaction.TxTp}` : parsedRequest.transaction.TxTp;

  // First, check if we have a cached network map for this specific tenant + transaction type combination
  const cachedNetworkMap = nodeCache.get(cacheKey);
  if (cachedNetworkMap) {
    networkMap = cachedNetworkMap as NetworkMap;
    prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    loggerService.debug(`Using cached networkMap for ${tenantId ? `tenant ${tenantId}` : 'default'}: ${util.inspect(prunedMap)}`);
  } else {
    // Cache miss - need to load from database
    const spanNetworkMap = apm.startSpan('db.get.NetworkMap');
    const networkConfigurationList = await databaseManager.getNetworkMap();
    const unwrappedNetworkMap = unwrap<NetworkMap>(networkConfigurationList as NetworkMap[][]);
    spanNetworkMap?.end();

    if (unwrappedNetworkMap) {
      // Validate that this network map matches the requested tenant
      const networkMapTenantId = unwrappedNetworkMap.tenantId;

      // Determine if we should use this configuration:
      // 1. If no specific tenant requested (normalizedTenantId is null), use any config
      // 2. If config has no tenantId (legacy), it's a default config - use for any tenant
      // 3. If tenantIds match exactly, use the config
      const isDefaultConfig = !networkMapTenantId;
      const isMatchingTenant = networkMapTenantId === tenantId || networkMapTenantId === normalizedTenantId;
      const shouldUseConfig = !normalizedTenantId || isDefaultConfig || isMatchingTenant;

      if (shouldUseConfig) {
        networkMap = unwrappedNetworkMap;
        prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);

        // Cache this network map using the transaction-specific key for future requests
        const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
        nodeCache.set(cacheKey, networkMap, localCacheTTL);

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
  if (prunedMap.length > 0) {
    // Create network sub-map using NetworkMap interface (supports tenantId natively with frms-coe-lib@6.0.0-rc.1)
    const networkSubMap: NetworkMap = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
      tenantId: networkMap.tenantId, // Use tenantId directly from NetworkMap interface
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
              const tenantIdValue = unwrappedNetworkMap.tenantId;

              if (tenantIdValue && tenantIdValue !== 'DEFAULT') {
                // Cache network map for each transaction type supported by this tenant
                const tenantId = tenantIdValue;
                for (const message of unwrappedNetworkMap.messages) {
                  const cacheKey = `tenant:${tenantId}:${message.txTp}`;
                  nodeCache.set(cacheKey, unwrappedNetworkMap, localCacheTTL);
                }
                loggerService.log(
                  `Loaded network configuration for tenant: ${tenantId} (${unwrappedNetworkMap.messages.length} transaction types)`,
                );
                loadedCount++;
              } else {
                // Handle DEFAULT tenant or legacy configurations without tenantId
                for (const message of unwrappedNetworkMap.messages) {
                  const cacheKey = message.txTp; // Legacy cache key format for default tenant
                  nodeCache.set(cacheKey, unwrappedNetworkMap, localCacheTTL);
                }
                const tenantType = tenantIdValue === 'DEFAULT' ? 'DEFAULT tenant' : 'legacy default';
                loggerService.log(`Loaded ${tenantType} network configuration (${unwrappedNetworkMap.messages.length} transaction types)`);
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
