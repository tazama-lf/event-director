/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCache, Message, NetworkMap, Rule } from '@frmscoe/frms-coe-lib/lib/interfaces';
import apm from 'elastic-apm-node';
import { databaseManager, server } from '..';
import { LoggerService } from './logger.service';

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

export const handleTransaction = async (req: unknown) => {
  const span = apm.startSpan('handleTransaction');
  const startTime = process.hrtime.bigint();
  let networkMap: NetworkMap = new NetworkMap();
  let cachedActiveNetworkMap: NetworkMap;
  let prunedMap: Message[] = [];

  const parsedRequest = req as any;

  const cacheKey = `${parsedRequest.transaction.TxTp}`;
  // check if there's an active network map in memory
  const activeNetworkMap = await databaseManager.getJson(cacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = Object.assign(JSON.parse(activeNetworkMap));
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
  } else {
    // Fetch the network map from db
    const spanNetworkMap = apm.startSpan('db.get.NetworkMap', { childOf: span?.ids['span.id'] });
    const networkConfigurationList = await databaseManager.getNetworkMap();
    spanNetworkMap?.end();
    if (networkConfigurationList && networkConfigurationList[0]) {
      networkMap = networkConfigurationList[0][0];
      // save networkmap in redis cache
      // await databaseManager.setJson(cacheKey, JSON.stringify(networkMap), config.redis.timeout);
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.transaction.TxTp);
    } else {
      LoggerService.log('No network map found in DB');
      const result = {
        prcgTmCRSP: calculateDuration(startTime),
        rulesSentTo: [],
        failedToSend: [],
        networkMap: {},
        transaction: parsedRequest.transaction,
        DataCache: parsedRequest.DataCache,
      };
      LoggerService.debug(JSON.stringify(result));
    }
  }
  if (prunedMap && prunedMap[0]) {
    const networkSubMap: NetworkMap = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
    });

    // Deduplicate all rules
    const rules = getRuleMap(networkMap, parsedRequest.transaction.TxTp);

    // Send transaction to all rules
    const promises: Array<Promise<void>> = [];
    const failedRules: Array<string> = [];
    const sentTo: Array<string> = [];
    const metaData = { ...parsedRequest.metaData, prcgTmCRSP: calculateDuration(startTime) };

    for (const rule of rules) {
      promises.push(
        sendRuleToRuleProcessor(
          rule,
          networkSubMap,
          parsedRequest.transaction,
          parsedRequest.DataCache,
          sentTo,
          failedRules,
          metaData,
          span?.ids['span.id'],
        ),
      );
    }
    await Promise.all(promises);

    const result = {
      metaData,
      rulesSentTo: sentTo,
      failedToSend: failedRules,
      transaction: parsedRequest.transaction,
      DataCache: parsedRequest.DataCache,
      networkMap,
    };
    LoggerService.debug(JSON.stringify(result));
  } else {
    LoggerService.log('No coresponding message found in Network map');
    const result = {
      metaData: { ...parsedRequest.metaData, prcgTmCRSP: calculateDuration(startTime) },
      rulesSentTo: [],
      failedToSend: [],
      networkMap: {},
      transaction: parsedRequest.transaction,
      DataCache: parsedRequest.DataCache,
    };
    LoggerService.debug(JSON.stringify(result));
  }
  span?.end();
};

const sendRuleToRuleProcessor = async (
  rule: Rule,
  networkMap: NetworkMap,
  req: any,
  dataCache: DataCache,
  sentTo: Array<string>,
  failedRules: Array<string>,
  metaData: any,
  parentSpanId: string | undefined,
) => {
  const span = apm.startSpan(`send.${rule.getStrValue()}.to.proc`, {
    childOf: parentSpanId,
  });
  try {
    const toSend = { transaction: req, networkMap, DataCache: dataCache, metaData };
    await server.handleResponse(toSend, [rule.host]);
    sentTo.push(rule.id);
    LoggerService.log(`Successfully sent to ${rule.id}`);
  } catch (error) {
    failedRules.push(rule.id);
    LoggerService.trace(`Failed to send to Rule ${rule.id}`);
    LoggerService.error(`Failed to send to Rule ${rule.id} with Error: ${error}`);
  }
  span?.end();
};
