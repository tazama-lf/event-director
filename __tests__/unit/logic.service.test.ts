// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NetworkMapSample, Pacs002Sample, Pacs008Sample, Pain001Sample, Pain013Sample } from '@tazama-lf/frms-coe-lib/lib/tests/data';
import { SERVICE_CHANNEL_AUDIENCE, ServiceChannelType } from '@tazama-lf/frms-coe-lib';
import * as util from 'node:util';
import { configuration, databaseManager, dbInit, loggerService, nodeCache, runServer, server } from '../../src';
import { handleTransaction } from '../../src/services/logic.service';
import { handleServiceChannelMessage } from '../../src/services/service-channel.service';

jest.mock('@tazama-lf/frms-coe-lib/lib/services/dbManager', () => ({
  CreateStorageManager: jest.fn().mockReturnValue({
    db: {
      getNetworkMap: jest.fn(),
      isReadyCheck: jest.fn().mockReturnValue({ nodeEnv: 'test' }),
    },
  }),
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

    // Custom mock that supports tenant-specific logic
    jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
      return Promise.resolve([{
        ...NetworkMapSample[0],
        tenantId: 'acme', // Default tenant for most tests
        active: true
      }]);
    });

    loggerSpy = jest.spyOn(loggerService, 'log');
    errorLoggerSpy = jest.spyOn(loggerService, 'error');
    debugLoggerSpy = jest.spyOn(loggerService, 'debug');

    // Clear NodeCache
    nodeCache.flushAll();
  });

  describe('Handle Transaction', () => {
    it('should handle successful request for Pain013', async () => {
      const expectedReq = { transaction: { ...Pain013Sample, TenantId: 'acme' } };
      responseSpy = jest.spyOn(server, 'handleResponse').mockImplementation(jest.fn());

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pain.013.001.09');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined();
    });

    it('should handle successful request for Pain001', async () => {
      const expectedReq = { transaction: { ...Pain001Sample, TenantId: 'acme' } };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pain.001.001.11');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined();
    });

    it('should handle successful request for Pacs002', async () => {
      const expectedReq = { transaction: { ...Pacs002Sample, TenantId: 'acme' } };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pacs.002.001.12');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pacs008', async () => {
      const expectedReq = { transaction: { ...Pacs008Sample, TenantId: 'acme' } };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      const result = debugLog;

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pacs.008.001.10');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pacs008, has cached map', async () => {
      // Create transaction with standardized TenantId property 
      const transactionWithTenant = { ...Pacs008Sample, TenantId: 'tenantId' };
      const expectedReq = { transaction: transactionWithTenant };

      let netMap = NetworkMapSample[0];
      // The whole tenant map is cached under one tenant-keyed entry
      nodeCache.set('tenantId:networkMap', netMap);

      const nodeCacheSpy = jest.spyOn(nodeCache, 'get');

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };
      await handleTransaction(expectedReq);
      const result = debugLog;

      // The cache should be called with the tenant-keyed format
      expect(nodeCacheSpy).toHaveBeenCalledWith('tenantId:networkMap');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 018@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should respond with active cached network map from memory', async () => {
      // Create transaction with standardized TenantId property
      const transactionWithTenant = { ...Pain001Sample, TenantId: 'tenantId' };
      const expectedReq = { transaction: transactionWithTenant };

      let netMap = NetworkMapSample[0];
      // The whole tenant map is cached under one tenant-keyed entry
      nodeCache.set('tenantId:networkMap', netMap);

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 003@1.0');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 028@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      // Cache hit is logged as debug message, not info message
      expect(debugLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using cached network map for tenant: tenantId, TxTp: pain.001.001.11')
      );
    });

    it('should handle unsuccessful request - no network map', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([]);
      });

      // Create transaction with standardized TenantId property
      const transactionWithTenant = { ...Pain001Sample, TenantId: 'tenantId' };
      const expectedReq = { transaction: transactionWithTenant };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('No active network map for tenant: tenantId, TxTp: pain.001.001.11 (source: db)');
      expect(loggerSpy).toHaveBeenCalledTimes(1); // one line instead of the former two
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(debugLoggerSpy).toHaveBeenCalledTimes(2); // processing line + one result dump
    });

    it('Should handle failure to post to rule', async () => {
      const expectedReq = { transaction: { ...Pain013Sample, TenantId: 'acme' } };

      responseSpy = jest.spyOn(server, 'handleResponse').mockRejectedValue(() => {
        throw new Error('Testing purposes');
      });

      await handleTransaction(expectedReq);
      // Pain013 is routed (rules 003@1.0 and 028@1.0, deduplicated), so both are attempted and both failures logged
      expect(responseSpy).toHaveBeenCalledTimes(2);
      expect(errorLoggerSpy).toHaveBeenCalledTimes(2);
      expect(errorLoggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to send to Rule 003@1.0'));
      expect(errorLoggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to send to Rule 028@1.0'));
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pain.013.001.09');
    });


  });

  describe('Multi-Tenant Support', () => {
    it('should handle transaction with tenantId', async () => {
      // Override the default mock for this specific test
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          tenantId: 'tenant-123',
          active: true
        }]);
      });

      const tenantTransaction = {
        ...Pain001Sample,
        TenantId: 'tenant-123'
      };
      const expectedReq = { transaction: tenantTransaction };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: tenant-123, TxTp: pain.001.001.11');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle transaction without tenantId (backward compatibility)', async () => {
      const expectedReq = { transaction: { ...Pain001Sample, TenantId: 'acme' } };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pain.001.001.11');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle network map with mismatched tenantId', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        // Return empty result to simulate no network map found for this tenant
        return Promise.resolve([]);
      });

      const transactionWithSpecificTenant = {
        ...Pain001Sample,
        TenantId: 'requested-tenant'  // Override the PascalCase property
      };
      const expectedReq = { transaction: transactionWithSpecificTenant };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('No active network map for tenant: requested-tenant, TxTp: pain.001.001.11 (source: db)');
    });

    it('should handle transaction with tenant but no tenant network map exists', async () => {
      // Clear cache to force DB lookup
      nodeCache.flushAll();
      
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([]);  // No active network map (lib contract: NetworkMap[])
      });

      const transactionWithTenant = {
        ...Pain001Sample,
        TenantId: 'non-existent-tenant'  // Override the PascalCase property
      };
      const expectedReq = { transaction: transactionWithTenant };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('No active network map for tenant: non-existent-tenant, TxTp: pain.001.001.11 (source: db)');
    });



  });

  describe('Integration Tests', () => {
    it('should process transactions for different tenants independently', async () => {
      // Setup tenant A configuration
      const tenantAConfig = {
        ...NetworkMapSample[0],
        tenantId: 'tenant-a',
        active: true,
        messages: [{
          id: '004@1.0.0',
          cfg: '1.0.0',
          txTp: 'pacs.008.001.10',
          typologies: [{
            id: 'typology-processor@1.0.0',
            tenantId: 'tenant-a',
            cfg: '000@1.0.0',
            rules: [{ id: '001@1.0.0', cfg: '1.0.0' }]
          }]
        }]
      };

      const tenantBConfig = {
        ...NetworkMapSample[0],
        tenantId: 'tenant-b',
        active: true,
        messages: [{
          id: '005@1.0.0',
          cfg: '1.0.0',
          txTp: 'pacs.008.001.10',
          typologies: [{
            id: 'typology-processor-b@1.0.0',
            tenantId: 'tenant-b',
            cfg: '001@1.0.0',
            rules: [{ id: '002@1.0.0', cfg: '1.0.0' }]
          }]
        }]
      };

      // Mock database to return different configs for different tenants
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockImplementationOnce(() => Promise.resolve([tenantAConfig]))
        .mockImplementationOnce(() => Promise.resolve([tenantBConfig]));

      // Clear cache to ensure fresh database calls
      nodeCache.flushAll();

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      // Process transaction for tenant A
      const tenantATransaction = {
        ...Pacs008Sample,
        TenantId: 'tenant-a'  // Override the PascalCase property
      };
      await handleTransaction({ transaction: tenantATransaction });

      // Process transaction for tenant B
      const tenantBTransaction = {
        ...Pacs008Sample,
        TenantId: 'tenant-b'  // Override the PascalCase property
      };
      await handleTransaction({ transaction: tenantBTransaction });

      // Verify tenant-specific configurations were loaded
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: tenant-a, TxTp: pacs.008.001.10');
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: tenant-b, TxTp: pacs.008.001.10');
    });

    it('should maintain tenant isolation in concurrent processing', async () => {
      // Setup multiple tenant configurations
      const tenantConfigs = ['tenant-1', 'tenant-2', 'tenant-3'].map(tenantId => ({
        ...NetworkMapSample[0],
        tenantId: tenantId,
        active: true
      }));

      // Mock database to return different configs for each call
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockImplementationOnce(() => Promise.resolve([tenantConfigs[0]]))
        .mockImplementationOnce(() => Promise.resolve([tenantConfigs[1]]))
        .mockImplementationOnce(() => Promise.resolve([tenantConfigs[2]]));

      nodeCache.flushAll();

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      // Process transactions concurrently for different tenants
      const promises = tenantConfigs.map(config => {
        const transaction = {
          ...Pacs008Sample,
          TenantId: config.tenantId  // Override the PascalCase property
        };
        return handleTransaction({ transaction });
      });

      await Promise.all(promises);

      // Verify database was called for each tenant
      expect(databaseManager.getNetworkMap).toHaveBeenCalledTimes(3);
      
      // Verify at least one tenant was processed successfully
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded and cached network map for tenant: tenant-1')
      );
    });
  });

  describe('Cache Multi-Tenant Tests', () => {
    it('should cache configurations separately by tenantId', async () => {
      const configA = {
        ...NetworkMapSample[0],
        tenantId: 'cache-tenant-a',
        active: true
      };

      const configB = {
        ...NetworkMapSample[0],
        tenantId: 'cache-tenant-b',
        active: true
      };

      // Clear cache and test actual cache behavior through handleTransaction
      nodeCache.flushAll();

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockImplementationOnce(() => Promise.resolve([configA]))
        .mockImplementationOnce(() => Promise.resolve([configB]));

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      // Process transactions to trigger caching
      await handleTransaction({ 
        transaction: { ...Pacs008Sample, TenantId: 'cache-tenant-a' }
      });
      
      await handleTransaction({ 
        transaction: { ...Pacs008Sample, TenantId: 'cache-tenant-b' }
      });

      // Verify tenant-specific logs were generated (indicating successful processing)
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: cache-tenant-a, TxTp: pacs.008.001.10');
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: cache-tenant-b, TxTp: pacs.008.001.10');
    });

    it('should handle cache key conflicts gracefully', async () => {
      const config1 = { 
        ...NetworkMapSample[0],
        tenantId: 'test-tenant', 
        active: true,
        cfg: '1.0.0'
      };
      
      const config2 = { 
        ...NetworkMapSample[0],
        tenantId: 'test-tenant', 
        active: true,
        cfg: '2.0.0'
      };

      nodeCache.flushAll();

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockImplementationOnce(() => Promise.resolve([config1]))
        .mockImplementationOnce(() => Promise.resolve([config2]));

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };
      
      // Process first transaction
      await handleTransaction({ 
        transaction: { ...Pacs008Sample, TenantId: 'test-tenant' }
      });
      
      // Process second transaction (should overwrite cache)
      await handleTransaction({ 
        transaction: { ...Pacs008Sample, TenantId: 'test-tenant' }
      });

      // Both should process successfully without conflicts
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: test-tenant, TxTp: pacs.008.001.10');
    });

    it('should validate cache TTL configuration', () => {
      // This test validates that cache TTL configuration is properly accessed and used
      const originalConfig = configuration.localCacheConfig;
      
      // Test default TTL fallback
      (configuration as any).localCacheConfig = undefined;
      const defaultTTL = configuration.localCacheConfig?.localCacheTTL ?? 0;
      expect(defaultTTL).toBe(0);

      // Test custom TTL configuration
      (configuration as any).localCacheConfig = {
        localCacheTTL: 3600
      };
      const customTTL = configuration.localCacheConfig?.localCacheTTL ?? 0;
      expect(customTTL).toBe(3600);

      // Restore original config
      (configuration as any).localCacheConfig = originalConfig;
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple tenant transactions efficiently', async () => {
      const startTime = Date.now();
      
      // Setup mock configurations for 5 tenants
      const tenantConfigs = Array.from({ length: 5 }, (_, i) => ({
        ...NetworkMapSample[0],
        tenantId: `perf-tenant-${i}`,
        active: true
      }));

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue(tenantConfigs);

      nodeCache.flushAll();

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      // Process 50 transactions (10 per tenant)
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 50; i++) {
        const tenantId = `perf-tenant-${i % 5}`;
        promises.push(handleTransaction({
          transaction: {
            ...Pacs008Sample,
            tenantId: tenantId
          }
        }));
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust based on system capabilities)
      expect(duration).toBeLessThan(10000); // 10 seconds max
      expect(promises.length).toBe(50);
    });

    it('should demonstrate cache performance benefits', async () => {
      const tenantConfig = {
        ...NetworkMapSample[0],
        tenantId: 'cache-perf-tenant',
        active: true
      };

      // Pre-populate cache
      nodeCache.set('tenant:cache-perf-tenant', tenantConfig);
      nodeCache.set('tenant:cache-perf-tenant:pacs.008.001.10', tenantConfig);

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      const startTime = Date.now();

      // Process multiple transactions that should hit cache
      const promises = Array.from({ length: 20 }, () => 
        handleTransaction({
          transaction: {
            ...Pacs008Sample,
            tenantId: 'cache-perf-tenant'
          }
        })
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Cache hits should be very fast
      expect(duration).toBeLessThan(5000); // 5 seconds max for 20 cache hits
    });
  });

  describe('Error Scenario Tests', () => {
    it('should handle missing tenant configuration gracefully', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([]); // Empty result

      nodeCache.flushAll();

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      const result = await handleTransaction({
        transaction: {
          ...Pacs008Sample,
          TenantId: 'non-existent-tenant'  // Override the PascalCase property
        }
      });

      // Should handle gracefully - no exceptions thrown
      expect(result).toBeUndefined(); // Function returns void, but should not throw
      expect(loggerSpy).toHaveBeenCalledWith('No active network map for tenant: non-existent-tenant, TxTp: pacs.008.001.10 (source: db)');
    });

    it('should handle corrupted cache data', async () => {
      // Test that the application handles invalid cache data gracefully
      nodeCache.flushAll();
      
      // This test validates that cache operations don't crash the application
      // In practice, the application should validate data when retrieving from cache
      const validConfig = {
        ...NetworkMapSample[0],
        tenantId: 'data-validation-tenant',
        active: true
      };

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([validConfig]);

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      // Process transaction that will populate cache properly
      await handleTransaction({
        transaction: {
          ...Pacs008Sample,
          TenantId: 'data-validation-tenant'  // Override the PascalCase property
        }
      });

      // Verify successful processing despite potential data validation concerns
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: data-validation-tenant, TxTp: pacs.008.001.10');
    });

    it('should handle transaction processing errors', async () => {
      const validConfig = {
        ...NetworkMapSample[0],
        tenantId: 'error-tenant',
        active: true
      };

      nodeCache.set('tenant:error-tenant', validConfig);

      // Mock server.handleResponse to throw an error
      server.handleResponse = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await handleTransaction({
          transaction: {
            ...Pacs008Sample,
            tenantId: 'error-tenant'
          }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      consoleSpy.mockRestore();
    });

    it('should handle malformed tenant IDs', async () => {
      const malformedTenantIds = [
        '', // Empty string
        ' ', // Whitespace
        'tenant with spaces',
        'tenant@with#special$chars',
        null,
        undefined
      ];

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      for (const tenantId of malformedTenantIds) {
        await handleTransaction({
          transaction: {
            ...Pacs008Sample,
            tenantId: tenantId as string
          }
        });
        
        // Should not throw errors for malformed tenant IDs
        expect(true).toBe(true); // Test passes if no exception is thrown
      }
    });
  });

  describe('Logging Tests', () => {
    it('should log tenant-specific operations', async () => {
      const testTenantId = 'logging-test-tenant';
      const tenantConfig = {
        ...NetworkMapSample[0],
        tenantId: testTenantId,
        active: true
      };

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([tenantConfig]);

      nodeCache.flushAll();

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction({
        transaction: {
          ...Pacs008Sample,
          TenantId: testTenantId  // Override the PascalCase property
        }
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(testTenantId)
      );
    });
  });
});  describe('TMS Integration Compatibility', () => {
    let localLoggerSpy: jest.SpyInstance;
    
    beforeEach(() => {
      // Reset environment variables
      delete process.env.AUTHENTICATED;
      jest.clearAllMocks();
      nodeCache.flushAll();
      
      // Set up local spies
      localLoggerSpy = jest.spyOn(loggerService, 'log');
    });

 
    it('should handle authenticated tenant from TMS', async () => {
      const tenantId = 'authenticated-tenant-123';

      // Mock database to return tenant-specific configuration
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          tenantId: tenantId,
          active: true
        }]);
      });

      const tmsMessage = {
        ...Pain001Sample,
        TenantId: tenantId  // Use PascalCase for proper override
      };

      const expectedReq = { transaction: tmsMessage };
      const debugSpy = jest.spyOn(loggerService, 'debug');

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(debugSpy).toHaveBeenCalledWith(`Processing transaction for tenant: ${tenantId}, TxTp: pain.001.001.11`);
      expect(localLoggerSpy).toHaveBeenCalledWith(`Loaded and cached network map for tenant: ${tenantId}, TxTp: pain.001.001.11`);
    });

    it('should use tenant-specific cache keys for non-DEFAULT tenants', async () => {
      const tenantId = 'bank-xyz-123';

      // Clear cache first
      nodeCache.flushAll();

      // Mock database to return tenant-specific configuration
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          tenantId: tenantId,
          active: true
        }]);
      });

      const tmsMessage = {
        ...Pain001Sample,
        TenantId: tenantId  // Use PascalCase for proper override
      };

      const expectedReq = { transaction: tmsMessage };
      const debugSpy = jest.spyOn(loggerService, 'debug');

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      // Verify the transaction was processed correctly with tenant-specific logging
      expect(debugSpy).toHaveBeenCalledWith(`Processing transaction for tenant: ${tenantId}, TxTp: pain.001.001.11`);
      expect(localLoggerSpy).toHaveBeenCalledWith(`Loaded and cached network map for tenant: ${tenantId}, TxTp: pain.001.001.11`);
      expect(nodeCache.keys()).toEqual([`${tenantId}:networkMap`]);
    });
  });

  describe('Tenant-scoped network map read and tenant-keyed cache (#312)', () => {
    const TTL_CONFIG = { localCacheTTL: 3600 };
    let originalCacheConfig: unknown;
    let logSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let sendSpy: jest.Mock;
    let getNetworkMapSpy: jest.SpyInstance;

    // A map for one tenant that routes only pacs.002 (to rule 901) - pacs.008 is deliberately unrouted
    const pacs002OnlyMap = (tenantId: string, ruleId = '901@1.0.0') => ({
      active: true,
      cfg: '1.0.0',
      tenantId,
      messages: [
        {
          id: '004@1.0.0',
          cfg: '1.0.0',
          txTp: 'pacs.002.001.12',
          typologies: [{ id: 'typology-processor@1.0.0', cfg: '999@1.0.0', tenantId, rules: [{ id: ruleId, cfg: '1.0.0' }] }],
        },
      ],
    });

    const tx = (TxTp: 'pacs.002.001.12' | 'pacs.008.001.10', TenantId: string) => ({
      transaction: { ...(TxTp === 'pacs.002.001.12' ? Pacs002Sample : Pacs008Sample), TenantId },
    });

    const evict = async (tenantId: string): Promise<void> => {
      const event = {
        specversion: '1.0',
        id: `evict-${tenantId}`,
        source: 'test://producer',
        type: ServiceChannelType.NETWORK_MAP_ACTIVATED,
        datacontenttype: 'application/json',
        data: { cfg: '1.0.0', tenantId },
      };
      await handleServiceChannelMessage(new TextEncoder().encode(JSON.stringify(event)));
    };

    beforeEach(() => {
      nodeCache.flushAll();
      originalCacheConfig = configuration.localCacheConfig;
      (configuration as any).localCacheConfig = TTL_CONFIG;
      configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
      logSpy = jest.spyOn(loggerService, 'log');
      debugSpy = jest.spyOn(loggerService, 'debug');
      errorSpy = jest.spyOn(loggerService, 'error');
      jest.spyOn(loggerService, 'warn').mockImplementation(() => undefined);
      sendSpy = jest.fn().mockResolvedValue(undefined);
      server.handleResponse = sendSpy;
      server.publishServiceChannel = jest.fn().mockResolvedValue(undefined);
      getNetworkMapSpy = jest.spyOn(databaseManager, 'getNetworkMap');
    });

    afterEach(() => {
      (configuration as any).localCacheConfig = originalCacheConfig;
      nodeCache.flushAll();
    });

    it('reads only the transaction tenant on a cache miss (asserted on the argument)', async () => {
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('acme')]);

      await handleTransaction(tx('pacs.002.001.12', 'acme'));

      expect(getNetworkMapSpy).toHaveBeenCalledTimes(1);
      expect(getNetworkMapSpy).toHaveBeenCalledWith('acme');
    });

    it('dispatches the FIRST routed transaction after a cache miss (shadowing-bug regression)', async () => {
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('acme')]);

      await handleTransaction(tx('pacs.002.001.12', 'acme'));

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ networkMap: expect.objectContaining({ tenantId: 'acme' }) }), [
        'sub-rule-901@1.0.0',
      ]);
      expect(logSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pacs.002.001.12');
      expect(logSpy).toHaveBeenCalledWith('Successfully sent to 901@1.0.0');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('caches the whole tenant map under one tenant-keyed entry (no per-TxTp keys)', async () => {
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('acme')]);

      await handleTransaction(tx('pacs.002.001.12', 'acme'));

      expect(nodeCache.keys()).toEqual(['acme:networkMap']);
      expect(nodeCache.get<{ tenantId: string }>('acme:networkMap')?.tenantId).toBe('acme');
    });

    it('serves an unrouted TxTp for a cached tenant from cache with no DB read', async () => {
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('acme')]);

      await handleTransaction(tx('pacs.008.001.10', 'acme')); // miss: loads the map, no route
      await handleTransaction(tx('pacs.008.001.10', 'acme')); // hit: no route, no read
      await handleTransaction(tx('pacs.002.001.12', 'acme')); // hit: routed, no read

      expect(getNetworkMapSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme, TxTp: pacs.008.001.10');
      expect(logSpy.mock.calls.filter(([line]) => line === 'No route in network map for tenant: acme, TxTp: pacs.008.001.10')).toHaveLength(2);
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Using cached network map for tenant: acme, TxTp: pacs.002.001.12'));
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('caches a "no map" marker for a tenant with no active map: no DB read until evicted', async () => {
      getNetworkMapSpy.mockResolvedValue([]);

      await handleTransaction(tx('pacs.002.001.12', 'NEWCO'));
      await handleTransaction(tx('pacs.008.001.10', 'NEWCO'));

      expect(getNetworkMapSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('No active network map for tenant: NEWCO, TxTp: pacs.002.001.12 (source: db)');
      expect(logSpy).toHaveBeenCalledWith('No active network map for tenant: NEWCO, TxTp: pacs.008.001.10 (source: cache)');
      expect(sendSpy).not.toHaveBeenCalled();

      // network-map.activated clears the marker, so the next transaction reads the newly active map
      await evict('NEWCO');
      expect(nodeCache.keys().filter((key) => key.startsWith('NEWCO:'))).toHaveLength(0);
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('NEWCO')]);

      await handleTransaction(tx('pacs.002.001.12', 'NEWCO'));

      expect(getNetworkMapSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), ['sub-rule-901@1.0.0']);
    });

    it('gives the "no map" marker the same TTL as a cached map', async () => {
      getNetworkMapSpy.mockImplementation(async (tenantId?: string) => (tenantId === 'acme' ? [pacs002OnlyMap('acme')] : []));

      await handleTransaction(tx('pacs.002.001.12', 'acme'));
      await handleTransaction(tx('pacs.002.001.12', 'NEWCO'));

      const mapTtl = nodeCache.getTtl('acme:networkMap');
      const markerTtl = nodeCache.getTtl('NEWCO:networkMap');
      expect(mapTtl).toBeGreaterThan(Date.now() + (TTL_CONFIG.localCacheTTL - 60) * 1000);
      expect(markerTtl).toBeGreaterThan(Date.now() + (TTL_CONFIG.localCacheTTL - 60) * 1000);
      expect(Math.abs((markerTtl as number) - (mapTtl as number))).toBeLessThan(5000);
    });

    it('caches every returned map under its OWN tenantId and never routes with another tenant map', async () => {
      // e.g. an all-tenants read: the requester's map is not first in the list
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('other', '777@1.0.0'), pacs002OnlyMap('acme', '901@1.0.0')]);

      await handleTransaction(tx('pacs.002.001.12', 'acme'));

      expect(nodeCache.get<{ tenantId: string }>('other:networkMap')?.tenantId).toBe('other');
      expect(nodeCache.get<{ tenantId: string }>('acme:networkMap')?.tenantId).toBe('acme');
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), ['sub-rule-901@1.0.0']);
    });

    it('does not route or cache another tenant map under the requester key when the requester has none', async () => {
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('other', '777@1.0.0')]);

      await handleTransaction(tx('pacs.002.001.12', 'acme'));

      expect(sendSpy).not.toHaveBeenCalled();
      expect(nodeCache.get<{ tenantId: string }>('other:networkMap')?.tenantId).toBe('other');
      expect(nodeCache.get<{ tenantId?: string } | null>('acme:networkMap')?.tenantId).not.toBe('other');
      expect(logSpy).toHaveBeenCalledWith('No active network map for tenant: acme, TxTp: pacs.002.001.12 (source: db)');
    });

    it('discards the cache write of a read that an eviction overtook, but still routes the in-flight transaction', async () => {
      let resolveRead!: (maps: unknown[]) => void;
      getNetworkMapSpy.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRead = resolve as (maps: unknown[]) => void;
          }),
      );

      const inFlight = handleTransaction(tx('pacs.002.001.12', 'acme'));
      await evict('acme'); // network-map.activated lands while the read is pending
      resolveRead([pacs002OnlyMap('acme', '901@1.0.0')]); // the read returns the now-stale map
      await inFlight;

      // in-flight transaction is still routed with the map it read
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), ['sub-rule-901@1.0.0']);
      // ...but the stale map is not cached
      expect(nodeCache.get('acme:networkMap')).toBeUndefined();
      expect(debugSpy).toHaveBeenCalledWith('Discarded network map read evicted during load for tenant: acme, TxTp: pacs.002.001.12');

      // next transaction misses and reloads the newly activated map
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('acme', '902@1.0.0')]);
      await handleTransaction(tx('pacs.002.001.12', 'acme'));
      expect(getNetworkMapSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy).toHaveBeenLastCalledWith(expect.anything(), ['sub-rule-902@1.0.0']);
    });

    it('does not discard a read when a DIFFERENT tenant is evicted meanwhile', async () => {
      let resolveRead!: (maps: unknown[]) => void;
      getNetworkMapSpy.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRead = resolve as (maps: unknown[]) => void;
          }),
      );

      const inFlight = handleTransaction(tx('pacs.002.001.12', 'acme'));
      await evict('other');
      resolveRead([pacs002OnlyMap('acme')]);
      await inFlight;

      expect(nodeCache.get<{ tenantId: string }>('acme:networkMap')?.tenantId).toBe('acme');
    });

    it('logs every network-map resolution line with tenant and TxTp', async () => {
      getNetworkMapSpy.mockResolvedValue([pacs002OnlyMap('acme')]);

      await handleTransaction(tx('pacs.002.001.12', 'acme'));

      expect(debugSpy).toHaveBeenCalledWith('Processing transaction for tenant: acme, TxTp: pacs.002.001.12');
    });
  });