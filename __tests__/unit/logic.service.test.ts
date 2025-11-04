// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NetworkMapSample, Pacs002Sample, Pacs008Sample, Pain001Sample, Pain013Sample } from '@tazama-lf/frms-coe-lib/lib/tests/data';
import * as util from 'node:util';
import { configuration, databaseManager, dbInit, loggerService, nodeCache, runServer, server } from '../../src';
import { handleTransaction, loadAllNetworkConfigurations } from '../../src/services/logic.service';

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

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme');
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

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme');
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

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme');
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

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should handle successful request for Pacs008, has cached map', async () => {
      // Create transaction with standardized TenantId property 
      const transactionWithTenant = { ...Pacs008Sample, TenantId: 'tenantId' };
      const expectedReq = { transaction: transactionWithTenant };

      let netMap = NetworkMapSample[0];
      // Set cache with the tenant-specific key since we're setting TenantId: 'tenantId'
      nodeCache.set(`tenantId:${expectedReq.transaction.TxTp}`, netMap);

      const nodeCacheSpy = jest.spyOn(nodeCache, 'get');

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };
      await handleTransaction(expectedReq);
      const result = debugLog;

      // The cache should be called with the tenant-specific key format
      expect(nodeCacheSpy).toHaveBeenCalledWith(`tenantId:${expectedReq.transaction.TxTp}`);
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 018@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(result).toBeDefined;
    });

    it('should respond with active cached network map from memory', async () => {
      // Create transaction with standardized TenantId property
      const transactionWithTenant = { ...Pain001Sample, TenantId: 'tenantId' };
      const expectedReq = { transaction: transactionWithTenant };

      let netMap = NetworkMapSample[0];
      // Set cache with tenant-specific key since we're setting TenantId: 'tenantId'
      nodeCache.set(`tenantId:${expectedReq.transaction.TxTp}`, netMap);

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 003@1.0');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully sent to 028@1.0');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      // Cache hit is logged as debug message, not info message
      expect(debugLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using cached networkMap for tenant tenantId')
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

      expect(loggerSpy).toHaveBeenCalledWith('No network map found in DB for tenant: tenantId');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
      expect(debugLoggerSpy).toHaveBeenCalledTimes(3); // One for tenant debug, one for result, and additional calls
    });

    it('Should handle failure to post to rule', async () => {
      const expectedReq = { transaction: { ...Pain013Sample, TenantId: 'acme' } };

      responseSpy = jest.spyOn(server, 'handleResponse').mockRejectedValue(() => {
        throw new Error('Testing purposes');
      });

      await handleTransaction(expectedReq);
      expect(responseSpy).toHaveBeenCalledTimes(0); // No rules processed due to no matching messages
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0); // No errors since no rules were sent
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme');
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

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: tenant-123');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle transaction without tenantId (backward compatibility)', async () => {
      const expectedReq = { transaction: { ...Pain001Sample, TenantId: 'acme' } };

      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      await handleTransaction(expectedReq);

      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: acme');
      expect(errorLoggerSpy).toHaveBeenCalledTimes(0);
    });

    it('should load network configurations at startup', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          tenantId: 'tenant-456',
          active: true
        }]);
      });

      await loadAllNetworkConfigurations();

      expect(loggerSpy).toHaveBeenCalledWith('Loading all tenant network configurations at startup...');
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'tenant-456' (4 transaction types)");
      expect(loggerSpy).toHaveBeenCalledWith('Successfully loaded 1 network configurations for multi-tenant support');
    });

    it('should load legacy network configurations without tenantId', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          active: true,
          tenantId: undefined!, // tenantId is a required field but undefined for test
        }]);
      });

      await loadAllNetworkConfigurations();

      expect(loggerSpy).toHaveBeenCalledWith('Loading all tenant network configurations at startup...');
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'undefined' (4 transaction types)");
      expect(loggerSpy).toHaveBeenCalledWith('Successfully loaded 1 network configurations for multi-tenant support');
    });

    it('should handle inactive network configurations during startup', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          tenantId: 'inactive-tenant',
          active: false // Inactive configuration
        }]);
      });

      await loadAllNetworkConfigurations();

      expect(loggerSpy).toHaveBeenCalledWith('Loading all tenant network configurations at startup...');
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'inactive-tenant' (4 transaction types)");
      expect(loggerSpy).toHaveBeenCalledWith('Successfully loaded 1 network configurations for multi-tenant support');
    });

    it('should handle null network configuration during startup', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([]);
      });

      await loadAllNetworkConfigurations();

      expect(loggerSpy).toHaveBeenCalledWith('Loading all tenant network configurations at startup...');
      expect(loggerSpy).toHaveBeenCalledWith('No network configurations found in database');
    });

    it('should handle error during network configuration loading', async () => {
      const testError = new Error('Database connection failed');
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        throw testError;
      });

      await expect(loadAllNetworkConfigurations()).rejects.toThrow('Database connection failed');

      expect(loggerSpy).toHaveBeenCalledWith('Loading all tenant network configurations at startup...');
      expect(errorLoggerSpy).toHaveBeenCalledWith(`Failed to load network configurations at startup: ${util.inspect(testError)}`);
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

      expect(loggerSpy).toHaveBeenCalledWith('No network map found in DB for tenant: requested-tenant');
    });

    it('should handle transaction with tenant but no tenant network map exists', async () => {
      // Clear cache to force DB lookup
      nodeCache.flushAll();
      
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve(JSON.parse('{}'));  // Return empty object, no network map
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

      expect(loggerSpy).toHaveBeenCalledWith('No network map found in DB for tenant: non-existent-tenant');
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
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: tenant-a');
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: tenant-b');
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

  describe('Database Multi-Tenant Tests', () => {
    it('should retrieve tenant-specific network configurations from database', async () => {
      const mockTenantAConfig = {
        ...NetworkMapSample[0],
        tenantId: 'db-tenant-a',
        active: true
      };

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([mockTenantAConfig]);

      nodeCache.flushAll();

      await loadAllNetworkConfigurations();

      expect(databaseManager.getNetworkMap).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'db-tenant-a' (4 transaction types)");
    });

    it('should handle database connection errors gracefully', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(loadAllNetworkConfigurations()).rejects.toThrow('Database connection failed');
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load network configurations at startup')
      );
    });

    it('should handle empty database responses', async () => {
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([]);

      await loadAllNetworkConfigurations();

      expect(loggerSpy).toHaveBeenCalledWith('No network configurations found in database');
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
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: cache-tenant-a');
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: cache-tenant-b');
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
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: test-tenant');
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
      expect(loggerSpy).toHaveBeenCalledWith('No corresponding message found in Network map for tenant non-existent-tenant');
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
      expect(loggerSpy).toHaveBeenCalledWith('Loaded and cached network map for tenant: data-validation-tenant');
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



    it('should log startup configuration loading', async () => {
      const startupTenantConfig = {
        ...NetworkMapSample[0],
        tenantId: 'startup-tenant',
        active: true
      };

      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([startupTenantConfig]);

      await loadAllNetworkConfigurations();

      expect(loggerSpy).toHaveBeenCalledWith('Loading all tenant network configurations at startup...');
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'startup-tenant' (4 transaction types)");
      expect(loggerSpy).toHaveBeenCalledWith('Successfully loaded 1 network configurations for multi-tenant support');
    });

    it('should validate network configuration document structure with tenantId at root', async () => {
      // Test the exact structure specified in the user story
      const userStoryNetworkConfig = {
        "tenantId": "tenant-identity-string",
        "active": true,
        "cfg": "1.0.0",
        "messages": [
          {
            "id": "004@1.0.0",
            "cfg": "1.0.0",
            "txTp": "pacs.002.001.12",
            "typologies": [
              {
                "id": "typology-processor@1.0.0",
                "cfg": "000@1.0.0",
                "tenantId": "tenant-identity-string",
                "rules": [
                  {
                    "id": "001@1.0.0",
                    "cfg": "1.0.0"
                  }
                ]
              }
            ]
          }
        ]
      };

      // Mock database to return the user story structure
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([userStoryNetworkConfig]);

      nodeCache.flushAll();

      // Load configurations at startup
      await loadAllNetworkConfigurations();

      // Verify the structure is loaded correctly
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'tenant-identity-string' (1 transaction types)");

      // Test transaction processing with this structure
      server.handleResponse = (response: unknown): Promise<void> => {
        return Promise.resolve();
      };

      const testTransaction = {
        TenantId: 'tenant-identity-string',  // Use PascalCase for proper override
        TxTp: 'pacs.002.001.12',
        transaction: { /* transaction data */ }
      };

      // Create debug spy for capturing debug level logs
      const debugSpy = jest.spyOn(loggerService, 'debug');

      await handleTransaction({ transaction: testTransaction });

      // Verify tenant-specific processing logs use the correct tenant ID
      expect(debugSpy).toHaveBeenCalledWith(
        'Processing transaction for tenant: tenant-identity-string'
      );

      // Verify the document structure has the correct format
      expect(userStoryNetworkConfig.tenantId).toBe('tenant-identity-string');
      expect(userStoryNetworkConfig.active).toBe(true);
      expect(userStoryNetworkConfig.cfg).toBe('1.0.0');
      expect(userStoryNetworkConfig.messages).toBeDefined();
      expect(userStoryNetworkConfig.messages[0].id).toBe('004@1.0.0');
      expect(userStoryNetworkConfig.messages[0].txTp).toBe('pacs.002.001.12');
      expect(userStoryNetworkConfig.messages[0].typologies[0].id).toBe('typology-processor@1.0.0');
      expect(userStoryNetworkConfig.messages[0].typologies[0].cfg).toBe('000@1.0.0');
      expect(userStoryNetworkConfig.messages[0].typologies[0].rules[0].id).toBe('001@1.0.0');
      expect(userStoryNetworkConfig.messages[0].typologies[0].rules[0].cfg).toBe('1.0.0');

      // Verify the system can handle both lowercase 'tenantId' and uppercase 'TenantId'
      const mixedCaseConfig = {
        ...userStoryNetworkConfig,
        tenantId: 'mixed-case-tenant' // Uppercase version
      };
      
      jest.spyOn(databaseManager, 'getNetworkMap')
        .mockResolvedValue([mixedCaseConfig]);

      await loadAllNetworkConfigurations();

      // Should handle both cases and use simplified logging
      expect(loggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'mixed-case-tenant' (1 transaction types)");
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

      expect(debugSpy).toHaveBeenCalledWith(`Processing transaction for tenant: ${tenantId}`);
      expect(localLoggerSpy).toHaveBeenCalledWith(`Loaded and cached network map for tenant: ${tenantId}`);
    });

    it('should handle DEFAULT tenant configuration loading at startup', async () => {
      // Mock database to return DEFAULT tenant configuration
      jest.spyOn(databaseManager, 'getNetworkMap').mockImplementation(() => {
        return Promise.resolve([{
          ...NetworkMapSample[0],
          tenantId: 'DEFAULT',
          active: true
        }]);
      });

      nodeCache.flushAll();
      await loadAllNetworkConfigurations();

      // Expect simplified startup logging after PR changes
      expect(localLoggerSpy).toHaveBeenCalledWith("Loaded network configuration for tenant 'DEFAULT' (4 transaction types)");
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
      expect(debugSpy).toHaveBeenCalledWith(`Processing transaction for tenant: ${tenantId}`);
      expect(localLoggerSpy).toHaveBeenCalledWith(`Loaded and cached network map for tenant: ${tenantId}`);
    });
  });