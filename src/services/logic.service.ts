/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoggerService } from './logger.service';
import { NetworkMap, Rule } from '../classes/network-map';
import axios from 'axios';
import { cacheClient, databaseManager } from '..';
import { config } from '../config';

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

export const handleTransaction = async (req: any) => {
  let networkMap: NetworkMap;
  let cachedActiveNetworkMap: NetworkMap;
  let prunedMap;
  const cacheKey = `${req.TxTp}`;
  // check if there's an active network map in memory
  const activeNetworkMap = await cacheClient.getJson(cacheKey);
  if (activeNetworkMap) {
    cachedActiveNetworkMap = Object.assign(JSON.parse(activeNetworkMap));
    networkMap = cachedActiveNetworkMap;
    prunedMap = cachedActiveNetworkMap.messages.filter((msg) => msg.txTp === req.TxTp);
  } else {
    // Fetch the network map from db
    const networkConfigurationList = await databaseManager.getNetworkMap();
    if (networkConfigurationList && networkConfigurationList[0]) {
      networkMap = networkConfigurationList[0][0];
      // save networkmap in redis cache
      await cacheClient.setJson(cacheKey, JSON.stringify(networkMap), 'EX', config.redis.timeout);
      prunedMap = networkMap.messages.filter((msg) => msg.txTp === req.TxTp);
    } else {
      LoggerService.log('No network map found in DB');
      const result = {
        rulesSentTo: [],
        failedToSend: [],
        networkMap: {},
        transaction: req,
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
    const rules = getRuleMap(networkMap, req.TxTp);

    // Send transaction to all rules
    const promises: Array<Promise<void>> = [];
    const failedRules: Array<string> = [];
    const sentTo: Array<string> = [];

    for (const rule of rules) {
      promises.push(sendRuleToRuleProcessor(rule, networkSubMap, req, sentTo, failedRules));
    }
    await Promise.all(promises);

    const result = {
      rulesSentTo: sentTo,
      failedToSend: failedRules,
      transaction: req,
      networkMap: networkMap,
    };
    return result;
  } else {
    LoggerService.log('No coresponding message found in Network map');
    const result = {
      rulesSentTo: [],
      failedToSend: [],
      networkMap: {},
      transaction: req,
    };
    return result;
  }
};

const sendRuleToRuleProcessor = async (rule: Rule, networkMap: NetworkMap, req: any, sentTo: Array<string>, failedRules: Array<string>) => {
  const toSend = { transaction: req, networkMap };
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
