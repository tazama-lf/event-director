// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-explicit-any */
import { databaseManager, dbInit, loggerService, nodeCache, runServer, server } from '../../src';
import { handleTransaction } from '../../src/services/logic.service';
import { Pacs008Sample, Pacs002Sample, Pain001Sample, Pain013Sample, NetworkMapSample } from '@tazama-lf/frms-coe-lib/lib/tests/data';
import { DatabaseNetworkMapMocks } from '@tazama-lf/frms-coe-lib/lib/tests/mocks/mock-networkmap';
import { validateAPMConfig, validateProcessorConfig, validateRedisConfig } from '@tazama-lf/frms-coe-lib/lib/helpers/env';
import { startupConfig } from '@tazama-lf/frms-coe-startup-lib/lib/interfaces/iStartupConfig';

jest.mock('@tazama-lf/frms-coe-lib/lib/helpers/env', () => ({
  validateAPMConfig: jest.fn().mockReturnValue({
    apmServiceName: '',
  }),
  validateLogConfig: jest.fn().mockReturnValue({}),
  validateProcessorConfig: jest.fn().mockReturnValue({
    functionName: 'test-ed',
    nodeEnv: 'test',
  }),
  validateEnvVar: jest.fn().mockReturnValue(''),
  validateRedisConfig: jest.fn().mockReturnValue({
    db: 0,
    servers: [
      {
        host: 'redis://localhost',
        port: 6379,
      },
    ],
    password: '',
    isCluster: false,
  }),
  validateDatabaseConfig: jest.fn().mockReturnValue({}),
}));

jest.mock('@tazama-lf/frms-coe-lib/lib/helpers/env/database.config', () => ({
  Database: {
    CONFIGURATION: 'MOCK_DB',
  },
}));

jest.mock('@tazama-lf/frms-coe-startup-lib/lib/interfaces/iStartupConfig', () => ({
  startupConfig: {
    startupType: 'nats',
    consumerStreamName: 'consumer',
    serverUrl: 'server',
    producerStreamName: 'producer',
    functionName: 'producer',
  },
}));

beforeAll(async () => {
  await dbInit();
  await runServer();
});

afterAll((done) => {
  done();
});

describe('Logic Service', () => {
  let debugLog = '';
  let loggerSpy: jest.SpyInstance;
  let debugLoggerSpy: jest.SpyInstance;
  let errorLoggerSpy: jest.SpyInstance;
  let responseSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('@tazama-lf/frms-coe-startup-lib/lib/interfaces/iStartupConfig', () => ({ startupType: 'nats' }));

    DatabaseNetworkMapMocks(databaseManager);

    (validateAPMConfig as jest.MockedFunction<typeof validateAPMConfig>).mockImplementation(() => {
      return { apmServiceName: 'test', apmUrl: '', apmActive: false, apmSecretToken: '' };
    });
    loggerSpy = jest.spyOn(loggerService, 'log');
    errorLoggerSpy = jest.spyOn(loggerService, 'error');
    debugLoggerSpy = jest.spyOn(loggerService, 'debug');

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
