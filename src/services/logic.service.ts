// SPDX-License-Identifier: Apache-2.0

import apm from '../apm';
import { NetworkMap, type DataCache, type Message, type Rule } from '@tazama-lf/frms-coe-lib/lib/interfaces';
import type { MetaData } from '@tazama-lf/frms-coe-lib/lib/interfaces/metaData';
import { configuration, databaseManager, loggerService, nodeCache, server } from '..';
import * as util from 'node:util';

/**
 * Represents a transaction with unknown structure but guaranteed transaction type and optional tenant identifier
 */
interface UnknownTransaction {
  TxTp: string;
  TenantId: string;
  [key: string]: unknown;
}

/**
 * Calculates the processing duration in nanoseconds from a given start time
 * @param startTime - High-resolution start time in bigint nanoseconds
 * @returns Processing duration as a number
 */
const calculateDuration = (startTime: bigint): number => {
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime);
};

/**
 * Extracts and deduplicates rules from the network map for a specific transaction type
 *
 * @param networkMap - The complete network configuration map
 * @param transactionType - The transaction type to filter rules for
 * @returns Array of unique rules applicable to the transaction type
 */
function getRuleMap(networkMap: NetworkMap, transactionType: string): Rule[] {
  const rules: Rule[] = new Array<Rule>();

  // Locate the message configuration for the specific transaction type
  const messages = networkMap.messages.find((tran) => tran.txTp === transactionType);

  // Extract all rules from typologies, ensuring no duplicates
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

/**
 * Handles incoming transaction processing with multi-tenant support and caching
 *
 * This function is the main entry point for transaction processing. It:
 * 1. Extracts tenant information from the transaction
 * 2. Checks for cached network configurations
 * 3. Loads network configurations from database if not cached
 * 4. Routes the transaction to appropriate rule processors
 *
 * @param req - The incoming request containing transaction data, cache, and metadata
 */
export const handleTransaction = async (req: unknown): Promise<void> => {
  const startTime = process.hrtime.bigint();
  let networkMap: NetworkMap = new NetworkMap();
  let prunedMap: Message[] = [];

  const parsedRequest = req as { transaction: UnknownTransaction; DataCache: DataCache; metaData?: MetaData };
  const traceParent = parsedRequest.metaData?.traceParent;
  const apmTransaction = apm.startTransaction('eventDirector.handleTransaction', {
    childOf: typeof traceParent === 'string' ? traceParent : undefined,
  });

  const tenantId = parsedRequest.transaction.TenantId;

  loggerService.debug(`Processing transaction for tenant: ${tenantId}`);

  const cacheKey = `${tenantId}:${parsedRequest.transaction.TxTp}`;

  const cachedNetworkMap = nodeCache.get(cacheKey);
  if (cachedNetworkMap) {
    networkMap = cachedNetworkMap as NetworkMap;
    prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    loggerService.debug(`Using cached networkMap for tenant ${tenantId}: ${util.inspect(prunedMap)}`);
  } else {
    const spanNetworkMap = apm.startSpan('db.get.NetworkMap');
    const networkConfigurationList = (await databaseManager.getNetworkMap()) as NetworkMap[][];
    spanNetworkMap?.end();

    if (Array.isArray(networkConfigurationList) && networkConfigurationList.length > 0) {
      const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
      let foundTenantMap: NetworkMap | undefined;

      for (const networkMapArray of networkConfigurationList) {
        if (Array.isArray(networkMapArray) && networkMapArray.length > 0) {
          for (const networkMap of networkMapArray) {
            if (networkMap?.active) {
              const { tenantId } = networkMap;
              for (const message of networkMap.messages) {
                const cacheKey = `${tenantId}:${message.txTp}`;
                nodeCache.set(cacheKey, networkMap, localCacheTTL);
                if (tenantId === parsedRequest.transaction.TenantId && message.txTp === parsedRequest.transaction.TxTp) {
                  foundTenantMap = networkMap;
                }
              }
              loggerService.log(`Loaded and cached network map for tenant: ${tenantId}`);
            }
          }
        }
      }

      if (foundTenantMap) {
        networkMap = foundTenantMap;
        prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
      } else {
        loggerService.log(`No network map found in DB for tenant: ${tenantId}`);
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
      loggerService.log(`No network map found in DB for tenant: ${tenantId}`);
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
    const networkSubMap: NetworkMap = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
      tenantId: networkMap.tenantId,
    });

    const rules = getRuleMap(networkMap, parsedRequest.transaction.TxTp);

    const promises: Array<Promise<void>> = [];
    const metaData: MetaData = { prcgTmDp: 0, ...parsedRequest.metaData, prcgTmED: calculateDuration(startTime) };

    for (const rule of rules) {
      promises.push(sendRuleToRuleProcessor(rule, networkSubMap, parsedRequest.transaction, parsedRequest.DataCache, metaData));
    }
    await Promise.all(promises);
  } else {
    loggerService.log(`No corresponding message found in Network map for tenant ${tenantId}`);
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

    const networkConfigurationList = (await databaseManager.getNetworkMap()) as NetworkMap[][];

    if (networkConfigurationList && networkConfigurationList.length > 0) {
      const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
      let loadedCount = 0;

      for (const networkMapArray of networkConfigurationList) {
        if (networkMapArray?.length > 0) {
          for (const networkMap of networkMapArray) {
            if (networkMap?.active) {
              const { tenantId } = networkMap;
              for (const message of networkMap.messages) {
                const cacheKey = `${tenantId}:${message.txTp}`;
                nodeCache.set(cacheKey, networkMap, localCacheTTL);
              }
              loggerService.log(`Loaded network configuration for tenant '${tenantId}' (${networkMap.messages.length} transaction types)`);
              loadedCount++;
            }
          }
        }
      }

      if (loadedCount > 0) {
        loggerService.log(`Successfully loaded ${loadedCount} network configurations for multi-tenant support`);
        // Debug: verify tenant-specific cache keys
        const allCacheKeys = nodeCache.keys();
        loggerService.debug(`Cache keys after refresh: ${JSON.stringify(allCacheKeys)}`);
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
