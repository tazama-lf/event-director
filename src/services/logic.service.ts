/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCache, Message, NetworkMap, Rule } from '@frmscoe/frms-coe-lib/lib/interfaces';
import { databaseManager, server } from '..';
import { LoggerService } from './logger.service';

const calculateDuration = (startHrTime: Array<number>, endHrTime: Array<number>): number => {
  return (endHrTime[0] - startHrTime[0]) * 1000 + (endHrTime[1] - startHrTime[1]) / 1000000;
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
  const startHrTime = process.hrtime();
  let networkMap: NetworkMap = new NetworkMap();
  let cachedActiveNetworkMap: NetworkMap;
  let prunedMap: Message[] = [];

  const parsedRequest = req as any;

  const cacheKey = `${parsedRequest.TxTp}`;
  // check if there's an active network map in memory
  const activeNetworkMap = await databaseManager.getJson(cacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = Object.assign(JSON.parse(activeNetworkMap));
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === parsedRequest.TxTp);
  } else {
    // Fetch the network map from db
    const networkConfigurationList = await databaseManager.getNetworkMap();
    if (networkConfigurationList && networkConfigurationList[0]) {
      networkMap = networkConfigurationList[0][0];
      // save networkmap in redis cache
      // await databaseManager.setJson(cacheKey, JSON.stringify(networkMap), config.redis.timeout);
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === parsedRequest.TxTp);
    } else {
      LoggerService.log('No network map found in DB');
      const result = {
        prcgTmCRSP: calculateDuration(startHrTime, process.hrtime()),
        rulesSentTo: [],
        failedToSend: [],
        networkMap: {},
        transaction: parsedRequest,
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
    const rules = getRuleMap(networkMap, parsedRequest.TxTp);

    // Send transaction to all rules
    const promises: Array<Promise<void>> = [];
    const failedRules: Array<string> = [];
    const sentTo: Array<string> = [];
    const endHrTime = process.hrtime();

    for (const rule of rules) {
      promises.push(sendRuleToRuleProcessor(rule, networkSubMap, req, parsedRequest.DataCache, sentTo, failedRules));
    }
    await Promise.all(promises);

    const result = {
      metaData: { ...parsedRequest.metaData, prcgTmCRSP: calculateDuration(startHrTime, endHrTime) },
      rulesSentTo: sentTo,
      failedToSend: failedRules,
      transaction: req,
      networkMap,
    };
    LoggerService.debug(JSON.stringify(result));
  } else {
    LoggerService.log('No coresponding message found in Network map');
    const result = {
      metaData: { ...parsedRequest.metaData, prcgTmCRSP: calculateDuration(startHrTime, process.hrtime()) },
      rulesSentTo: [],
      failedToSend: [],
      networkMap: {},
      transaction: req,
    };
    LoggerService.debug(JSON.stringify(result));
  }
};

const sendRuleToRuleProcessor = async (
  rule: Rule,
  networkMap: NetworkMap,
  req: any,
  dataCache: DataCache,
  sentTo: Array<string>,
  failedRules: Array<string>,
) => {
  try {
    const toSend = { transaction: req, networkMap, DataCache: dataCache };
    await server.handleResponse(toSend, [rule.host]);
    sentTo.push(rule.id);
    LoggerService.log(`Successfully sent to ${rule.id}`);
  } catch (error) {
    failedRules.push(rule.id);
    LoggerService.trace(`Failed to send to Rule ${rule.id}`);
    LoggerService.error(`Failed to send to Rule ${rule.id} with Error: ${error}`);
  }
};
