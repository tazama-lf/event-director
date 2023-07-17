/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoggerService } from './logger.service';
import { NetworkMap, Rule } from '../classes/network-map';
import axios from 'axios';
import { dbService, cacheClient } from '..';
import { config } from '../config';

const calculateDuration = (startHrTime: Array<number>, endHrTime: Array<number>): number => {
  return (endHrTime[0] - startHrTime[0]) * 1000 + (endHrTime[1] - startHrTime[1]) / 1000000;
};

function getRuleMap(networkMap: NetworkMap, transactionType: string): Rule[] {
  const rules: Rule[] = new Array<Rule>();

  const MessageChannel = networkMap.messages.find((tran) => tran.txTp === transactionType);

  if (MessageChannel && MessageChannel.channels && MessageChannel.channels.length > 0) {
    for (const channel of MessageChannel.channels) {
      if (channel.typologies && channel.typologies.length > 0)
        for (const typology of channel.typologies) {
          if (typology.rules && typology.rules.length > 0)
            for (const rule of typology.rules) {
              const ruleIndex = rules.findIndex((r: Rule) => `${r.id}` === `${rule.id}`);
              if (ruleIndex < 0) {
                rules.push(rule);
              }
            }
        }
    }
  }

  return rules;
}

let networkMap: NetworkMap;
let cachedActiveNetworkMap: NetworkMap;
export const handleTransaction = async (req: any): Promise<any> => {
  const startHrTime = process.hrtime();
  let prunedMap;
  const cacheKey = `${req.transaction.TxTp}`;
  // check if there's an active network map in memory
  const activeNetworkMap = await cacheClient.getJson(cacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = Object.assign(JSON.parse(activeNetworkMap));
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === req.transaction.TxTp);
  } else {
    // Fetch the network map from db
    const networkConfigurationList = await dbService.getNetworkMap();
    if (networkConfigurationList && networkConfigurationList[0]) {
      networkMap = networkConfigurationList[0][0];
      // save networkmap in redis cache
      await cacheClient.setJson(cacheKey, JSON.stringify(networkMap), 'EX', config.redis.timeout);
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === req.transaction.TxTp);
    } else {
      LoggerService.log('No network map found in DB');
      const result = {
        metaData: {...req?.metaData,prcgTmCRSP: calculateDuration(startHrTime, process.hrtime())},
        rulesSentTo: [],
        failedToSend: [],
        networkMap: {},
        transaction: req.transaction,
        DataCache: req.DataCache,
      };
      return result;
    }
  }
  if (prunedMap && prunedMap[0]) {
    const networkSubMap: NetworkMap = Object.assign(new NetworkMap(), {
      active: networkMap.active,
      cfg: networkMap.cfg,
      messages: prunedMap,
    });

    // Deduplicate all rules
    const rules = getRuleMap(networkMap, req.transaction.TxTp);

    // Send transaction to all rules
    const promises: Array<Promise<void>> = [];
    const failedRules: Array<string> = [];
    const sentTo: Array<string> = [];
    const endHrTime = process.hrtime();

    for (const rule of rules) {
      promises.push(sendRuleToRuleProcessor(rule, networkSubMap, req, sentTo, failedRules));
    }
    await Promise.all(promises);

    const result = {
      metaData: {...req?.metaData,prcgTmCRSP: calculateDuration(startHrTime, endHrTime)},
      rulesSentTo: sentTo,
      failedToSend: failedRules,
      transaction: req.transaction,
      DataCache: req.DataCache,
      networkMap: networkMap,
    };
    return result;
  } else {
    LoggerService.log('No corresponding message found in Network map');
    const result = {
      metaData: {...req?.metaData,prcgTmCRSP: calculateDuration(startHrTime, process.hrtime())},
      rulesSentTo: [],
      failedToSend: [],
      networkMap: {},
      transaction: req.transaction,
      DataCache: req.DataCache,
    };
    return result;
  }
};

const sendRuleToRuleProcessor = async (rule: Rule, networkMap: NetworkMap, req: any, sentTo: Array<string>, failedRules: Array<string>) => {
  const toSend = { transaction: req.transaction, networkMap, DataCache: req.DataCache };
  try {
    const ruleRes = await axios.post(`${rule.host}/execute`, toSend);
    if (ruleRes.status === 200) {
      sentTo.push(rule.id);
      LoggerService.log(`Successfully sent to ${rule.id}`);
    }
  } catch (error) {
    failedRules.push(rule.id);
    LoggerService.trace(`Failed to send to Rule ${rule.id}`);
    LoggerService.error(`Failed to send to Rule ${rule.id} with Error: ${error}`);
  }
};
