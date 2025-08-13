// SPDX-License-Identifier: Apache-2.0
import apm from '../apm';
import { unwrap } from '@tazama-lf/frms-coe-lib/lib/helpers/unwrap';
import { NetworkMap, type DataCache, type Message, type Rule } from '@tazama-lf/frms-coe-lib/lib/interfaces';
import type { MetaData } from '@tazama-lf/frms-coe-lib/lib/interfaces/metaData';
import { configuration, databaseManager, loggerService, nodeCache, server } from '..';
import * as util from 'node:util';

interface UnknownTransaction {
  TxTp: string;
  [key: string]: unknown;
}

const calculateDuration = (startTime: bigint): number => {
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime);
};

/**
 *Create a list of all the rules for this transaction type from the network map
 *
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

  const cacheKey = parsedRequest.transaction.TxTp;
  // check if there's an active network map in memory
  const activeNetworkMap = nodeCache.get(cacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = activeNetworkMap as NetworkMap;
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    loggerService.debug(`Using cached networkMap ${util.inspect(prunedMap)}`);
  } else {
    // Fetch the network map from db
    const spanNetworkMap = apm.startSpan('db.get.NetworkMap');
    const networkConfigurationList = await databaseManager.getNetworkMap();
    const unwrappedNetworkMap = unwrap<NetworkMap>(networkConfigurationList as NetworkMap[][]);
    spanNetworkMap?.end();

    if (unwrappedNetworkMap) {
      networkMap = unwrappedNetworkMap;
      // save networkmap in memory cache
      const localCacheTTL: number = configuration.localCacheConfig?.localCacheTTL ?? 0;
      nodeCache.set(cacheKey, networkMap, localCacheTTL);
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    } else {
      loggerService.log('No network map found in DB');
      const result = {
        prcgTmED: calculateDuration(startTime),
        rulesSentTo: [],
        failedToSend: [],
        networkMap: {},
        transaction: parsedRequest.transaction,
        DataCache: parsedRequest.DataCache,
      };
      loggerService.debug(util.inspect(result));
    }
  }
  if (prunedMap.length > 0) {
    const networkSubMap: NetworkMap = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
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
    loggerService.log('No corresponding message found in Network map');
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