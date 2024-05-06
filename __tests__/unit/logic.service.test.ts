// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-explicit-any */
import { databaseManager, dbInit, loggerService, nodeCache, runServer, server } from '../../src';
import { handleTransaction } from '../../src/services/logic.service';
import { Pacs008Sample, Pacs002Sample, Pain001Sample, Pain013Sample } from '@frmscoe/frms-coe-lib/lib/tests/data';

beforeAll(async () => {
  await dbInit();
  await runServer();
});

afterAll((done) => {
  done();
});

export const NetworkMapSample = [
  [
    {
      messages: [
        {
          id: '001@1.0',
          host: 'http://gateway.openfaas:8080',
          cfg: '1.0',
          txTp: 'pain.001.001.11',
          typologies: [
            {
              id: '028@1.0',
              host: 'http://gateway.openfaas:8080/function/off-typology-processor',
              cfg: '1.0',
              rules: [
                { id: '003@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-003', cfg: '1.0' },
                { id: '028@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-028', cfg: '1.0' },
              ],
            },
          ],
        },
        {
          id: '002@1.0',
          host: 'http://gateway.openfaas:8080',
          cfg: '1.0',
          txTp: 'pain.013.001.09',
          typologies: [
            {
              id: '028@1.0',
              host: 'http://gateway.openfaas:8080/function/off-typology-processor',
              cfg: '1.0',
              rules: [
                { id: '003@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-003', cfg: '1.0' },
                { id: '028@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-028', cfg: '1.0' },
              ],
            },
            {
              id: '029@1.0',
              host: 'http://gateway.openfaas:8080/function/off-typology-processor',
              cfg: '1.0',
              rules: [
                { id: '003@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-003', cfg: '1.0' },
                { id: '028@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-028', cfg: '1.0' },
              ],
            },
            {
              id: '030@1.0',
              host: 'http://gateway.openfaas:8080/function/off-typology-processor',
              cfg: '1.0',
              rules: [
                { id: '003@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-003', cfg: '1.0' },
                { id: '028@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-028', cfg: '1.0' },
              ],
            },
            {
              id: '031@1.0',
              host: 'http://gateway.openfaas:8080/function/off-typology-processor',
              cfg: '1.0',
              rules: [
                { id: '003@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-003', cfg: '1.0' },
                { id: '028@1.0', host: 'http://gateway.openfaas:8080/function/off-rule-028', cfg: '1.0' },
              ],
            },
          ],
        },
        {
          id: '004@1.0.0',
          host: 'https://gateway.openfaas:8080/function/off-transaction-aggregation-decisioning-processor-rel-1-1-0',
          cfg: '1.0.0',
          txTp: 'pacs.002.001.12',
          typologies: [
            {
              id: '028@1.0.0',
              host: 'https://gateway.openfaas:8080/function/off-typology-processor-rel-1-0-0',
              cfg: '1.0.0',
              rules: [{ id: '018@1.0', host: 'https://gateway.openfaas:8080/function/off-rule-018-rel-1-0-0', cfg: '1.0.0' }],
            },
          ],
        },
        {
          id: '005@1.0.0',
          host: 'https://gateway.openfaas:8080/function/off-transaction-aggregation-decisioning-processor-rel-1-1-0',
          cfg: '1.0.0',
          txTp: 'pacs.008.001.10',
          typologies: [
            {
              id: '028@1.0.0',
              host: 'https://gateway.openfaas:8080/function/off-typology-processor-rel-1-0-0',
              cfg: '1.0.0',
              rules: [{ id: '018@1.0', host: 'https://gateway.openfaas:8080/function/off-rule-018-rel-1-0-0', cfg: '1.0.0' }],
            },
          ],
        },
      ],
    },
  ],
];
export const DatabaseNetworkMapMocks = (databaseManager: any): void => {
  jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(async () => {
    return await Promise.resolve(NetworkMapSample);
  });
};
describe('Logic Service', () => {
  let debugLog = '';
  let loggerSpy: jest.SpyInstance;
  let debugLoggerSpy: jest.SpyInstance;
  let errorLoggerSpy: jest.SpyInstance;
  let responseSpy: jest.SpyInstance;

  beforeEach(() => {
    DatabaseNetworkMapMocks(databaseManager);

    loggerSpy = jest.spyOn(loggerService, 'log');
    errorLoggerSpy = jest.spyOn(loggerService, 'error');
    debugLoggerSpy = jest.spyOn(loggerService, 'debug');
    /* eslint-disable */

    // Clear NodeCache
    nodeCache.flushAll();
  });

  describe('Handle Transaction', () => {
    it('should handle successful request for Pain013', async () => {
      const expectedReq = { transaction: Pain013Sample };
      responseSpy = jest.spyOn(server, 'handleResponse').mockImplementation(jest.fn());

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 003@1.0');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 028@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pain001', async () => {
      const expectedReq = { transaction: Pain001Sample };

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 003@1.0');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 028@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pacs002', async () => {
      const expectedReq = { transaction: Pacs002Sample };

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 018@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pacs008', async () => {
      const expectedReq = { transaction: Pacs008Sample };

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 018@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pacs008, has cached map', async () => {
      const expectedReq = { transaction: Pacs008Sample };

      let netMap = NetworkMapSample[0][0];
      nodeCache.set(expectedReq.transaction.TxTp, netMap);

      const nodeCacheSpy = jest.spyOn(nodeCache, 'get');

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };
      await handleTransaction(expectedReq);
      const result = debugLog;

      expect(nodeCacheSpy).toHaveReturnedWith(netMap);
      expect(loggerSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 018@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle unsuccessful request - no network map', async () => {
      const expectedReq = { transaction: Pain001Sample.CstmrCdtTrfInitn, TxTp: 'invalid mock request' };
      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);
      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('No coresponding message found in Network map');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(debugLoggerSpy).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined;
    });

    it('should respond with active cached network map from memory', async () => {
      const expectedReq = { transaction: Pain001Sample };

      let netMap = NetworkMapSample[0][0];
      nodeCache.set(expectedReq.transaction.TxTp, netMap);

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 003@1.0');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 028@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
    });

    it('should respond with empty network submap no network map is found', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve(JSON.parse('{}'));
      });

      const expectedReq = { transaction: Pain001Sample };

      server.handleResponse = (reponse: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith('No network map found in DB');
      expect(loggerSpy).toHaveBeenCalledWith('No coresponding message found in Network map');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(debugLoggerSpy).toHaveBeenCalledTimes(2);
    });

    it('Should handle failure to post to rule', async () => {
      const expectedReq = { transaction: Pain013Sample };

      responseSpy = jest.spyOn(server, 'handleResponse').mockRejectedValue(() => {
        throw new Error('Testing purposes');
      });

      await handleTransaction(expectedReq);
      expect(responseSpy).toHaveBeenCalledTimes(2);
      expect(errorLoggerSpy).toHaveBeenCalledTimes(2);
      expect(errorLoggerSpy).toHaveBeenCalledWith('Failed to send to Rule 003@1.0 with Error: undefined');
      expect(errorLoggerSpy).toHaveBeenCalledWith('Failed to send to Rule 028@1.0 with Error: undefined');
    });
  });
});
