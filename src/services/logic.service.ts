// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-explicit-any */
import apm from '../apm';
import { NetworkMap, type DataCache, type Message, type Rule } from '@frmscoe/frms-coe-lib/lib/interfaces';
import { databaseManager, nodeCache, server, loggerService } from '..';
import { unwrap } from '@frmscoe/frms-coe-lib/lib/helpers/unwrap';
import { config } from '../config';

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
  const MessageChannel = networkMap.messages.find((tran) => tran.txTp === transactionType);

  // Populate a list of all the rules that's required for this transaction type
  if (MessageChannel && MessageChannel.channels && MessageChannel.channels.length > 0) {
    for (const channel of MessageChannel.channels) {
      if (channel.typologies && channel.typologies.length > 0)
        for (const typology of channel.typologies) {
          if (typology.rules && typology.rules.length > 0)
            for (const rule of typology.rules) {
              const ruleIndex = rules.findIndex((r: Rule) => `${r.id}` === `${rule.id}` && `${r.cfg}` === `${rule.cfg}`);
              if (ruleIndex < 0) {
                rules.push(rule);
              }
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

  const parsedRequest = req as any;
  const traceParent = parsedRequest.metaData?.traceParent;
  const apmTransaction = apm.startTransaction('crsp.handleTransaction', { childOf: traceParent });

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  const cacheKey = `${parsedRequest.transaction.TxTp}`;
  // check if there's an active network map in memory
  const activeNetworkMap = nodeCache.get(cacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = activeNetworkMap as NetworkMap;
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    loggerService.debug(`Using cached networkMap ${prunedMap.toString()}`);
  } else {
    // Fetch the network map from db
    const spanNetworkMap = apm.startSpan('db.get.NetworkMap');
    const networkConfigurationList = await databaseManager.getNetworkMap();
    const unwrappedNetworkMap = unwrap<NetworkMap>(networkConfigurationList as NetworkMap[][]);
    spanNetworkMap?.end();

    if (unwrappedNetworkMap) {
      networkMap = unwrappedNetworkMap;
      // save networkmap in memory cache
      nodeCache.set(cacheKey, networkMap, config.cacheTTL);
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    } else {
      loggerService.log('No network map found in DB');
      const result = {
        prcgTmCRSP: calculateDuration(startTime),
        rulesSentTo: [],
        failedToSend: [],
        networkMap: {},
        transaction: parsedRequest.transaction,
        DataCache: parsedRequest.DataCache,
      };
      loggerService.debug(JSON.stringify(result));
    }
  }
  if (prunedMap && prunedMap[0]) {
    const networkSubMap: NetworkMap = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
    });

    // Deduplicate all rules
    const rules = getRuleMap(networkMap, parsedRequest.transaction.TxTp as string);

    // Send transaction to all rules
    const promises: Array<Promise<void>> = [];
    const metaData = { ...parsedRequest.metaData, prcgTmCRSP: calculateDuration(startTime) };

    for (const rule of rules) {
      promises.push(
        sendRuleToRuleProcessor(rule, networkSubMap, parsedRequest.transaction, parsedRequest.DataCache as DataCache, metaData),
      );
    }
    await Promise.all(promises);
  } else {
    loggerService.log('No coresponding message found in Network map');
    const result = {
      metaData: { ...parsedRequest.metaData, prcgTmCRSP: calculateDuration(startTime) },
      networkMap: {},
      transaction: parsedRequest.transaction,
      DataCache: parsedRequest.DataCache,
    };
    loggerService.debug(JSON.stringify(result));
  }
  apmTransaction?.end();
};

const sendRuleToRuleProcessor = async (
  rule: Rule,
  networkMap: NetworkMap,
  req: any,
  dataCache: DataCache,
  metaData: any,
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
    loggerService.error(`Failed to send to Rule ${rule.id} with Error: ${JSON.stringify(error)}`);
  }
  span?.end();
};
