// SPDX-License-Identifier: Apache-2.0

import apm from '../apm';
import type { NetworkMap, DataCache, Message, Rule } from '@tazama-lf/frms-coe-lib/lib/interfaces';
import type { MetaData } from '@tazama-lf/frms-coe-lib/lib/interfaces/metaData';
import { configuration, databaseManager, loggerService, nodeCache, server } from '..';
import * as util from 'node:util';
import { getEvictionGeneration } from './service-channel.service';

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

  const messages = networkMap.messages.find((tran) => tran.txTp === transactionType);

  // Extract all rules from typologies
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
 * 2. Checks the cache for the tenant's network map (one entry per tenant, keyed `${tenantId}:networkMap`)
 * 3. On a miss, reads only that tenant's active network map from the database and caches it - or, when
 *    the tenant has none, a `null` "no map" marker with the same TTL. A read overtaken by a
 *    network-map.activated eviction is used for this transaction but not cached.
 * 4. Routes the transaction to appropriate rule processors
 *
 * @param req - The incoming request containing transaction data, cache, and metadata
 */
export const handleTransaction = async (req: unknown): Promise<void> => {
  const startTime = process.hrtime.bigint();

  const parsedRequest = req as { transaction: UnknownTransaction; DataCache: DataCache; metaData?: MetaData };
  const traceParent = parsedRequest.metaData?.traceParent;
  const apmTransaction = apm.startTransaction('eventDirector.handleTransaction', {
    childOf: typeof traceParent === 'string' ? traceParent : undefined,
  });

  const { TenantId: tenantId, TxTp: txTp } = parsedRequest.transaction;

  loggerService.debug(`Processing transaction for tenant: ${tenantId}, TxTp: ${txTp}`);

  const cacheKey = `${tenantId}:networkMap`;

  // undefined = cache miss; null = cached "no active network map" marker
  let networkMap = nodeCache.get<NetworkMap | null>(cacheKey);
  let source: 'cache' | 'db' = 'cache';

  if (networkMap === undefined) {
    source = 'db';
    const generation = getEvictionGeneration(tenantId);

    const spanNetworkMap = apm.startSpan('db.get.NetworkMap');
    const loadedMaps = await databaseManager.getNetworkMap(tenantId);
    spanNetworkMap?.end();

    networkMap = loadedMaps.find((map) => map.tenantId === tenantId) ?? null;

    if (getEvictionGeneration(tenantId) === generation) {
      const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
      for (const loadedMap of loadedMaps) {
        nodeCache.set(`${loadedMap.tenantId}:networkMap`, loadedMap, localCacheTTL);
      }
      if (networkMap) {
        loggerService.log(`Loaded and cached network map for tenant: ${tenantId}, TxTp: ${txTp}`);
      } else {
        nodeCache.set(cacheKey, null, localCacheTTL);
      }
    } else {
      loggerService.debug(`Discarded network map read evicted during load for tenant: ${tenantId}, TxTp: ${txTp}`);
    }
  }

  const prunedMessage: Message[] = networkMap ? networkMap.messages.filter((msg) => msg.txTp === txTp) : [];

  if (networkMap && source === 'cache') {
    loggerService.debug(`Using cached network map for tenant: ${tenantId}, TxTp: ${txTp}: ${util.inspect(prunedMessage)}`);
  }

  if (networkMap && prunedMessage.length) {
    const networkSubMap: NetworkMap = {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMessage,
      tenantId: networkMap.tenantId,
    };

    const rules = getRuleMap(networkMap, txTp);

    const promises: Array<Promise<void>> = [];
    const metaData: MetaData = { prcgTmDp: 0, ...parsedRequest.metaData, prcgTmED: calculateDuration(startTime) };

    for (const rule of rules) {
      promises.push(sendRuleToRuleProcessor(rule, networkSubMap, parsedRequest.transaction, parsedRequest.DataCache, metaData));
    }
    await Promise.all(promises);
  } else {
    if (networkMap) {
      loggerService.log(`No route in network map for tenant: ${tenantId}, TxTp: ${txTp}`);
    } else {
      loggerService.log(`No active network map for tenant: ${tenantId}, TxTp: ${txTp} (source: ${source})`);
    }
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
