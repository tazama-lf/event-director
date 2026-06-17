// SPDX-License-Identifier: Apache-2.0

process.env.SERVICE_CHANNEL_CONSUMER = 'service-channel';
process.env.SERVICE_CHANNEL_PRODUCER = 'service-channel-ack';
process.env.SERVICE_CHANNEL_SOURCE_URI_PREFIX = '';
process.env.SERVICE_CHANNEL_CLASS = 'event-director';

jest.mock('@tazama-lf/frms-coe-startup-lib', () => ({
  StartupFactory: jest.fn(() => ({
    init: jest.fn().mockResolvedValue(true),
    initServiceChannel: jest.fn().mockResolvedValue(true),
  })),
}));

import { ServiceChannelType, SERVICE_CHANNEL_AUDIENCE } from '@tazama-lf/frms-coe-lib';
import { configuration, loggerService, nodeCache } from '../../src';
import { handleServiceChannelMessage } from '../../src/services/service-channel.service';

const encode = (event: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(event));

const buildEvent = (overrides: Record<string, unknown> = {}): Uint8Array =>
  encode({
    specversion: '1.0',
    id: 'evt-1',
    source: 'test://producer',
    type: ServiceChannelType.NETWORK_MAP_ACTIVATED,
    datacontenttype: 'application/json',
    data: { cfg: '1.0.0', tenantId: 'tenant-A' },
    ...overrides,
  });

const seedTenant = (tenantId: string): void => {
  nodeCache.set(`${tenantId}:pain.001.001.11`, { tenantId });
  nodeCache.set(`${tenantId}:pacs.008.001.10`, { tenantId });
};

describe('service-channel dispatch + cache-bust (#390)', () => {
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    nodeCache.flushAll();
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
    warnSpy = jest.spyOn(loggerService, 'warn').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(loggerService, 'debug').mockImplementation(() => undefined);
    logSpy = jest.spyOn(loggerService, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nodeCache.flushAll();
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
  });

  describe('valid network-map.activated', () => {
    it('evicts every cache entry for the addressed tenant', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('leaves cache entries for other tenants untouched', () => {
      seedTenant('tenant-A');
      seedTenant('tenant-B');

      handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-B:'))).toHaveLength(2);
    });

    it('is an idempotent no-op on re-delivery of the same event', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));
      expect(() => {
        handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));
      }).not.toThrow();

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('malformed input is dropped at warn without crashing', () => {
    it('drops non-JSON bytes', () => {
      seedTenant('tenant-A');

      expect(() => {
        handleServiceChannelMessage(new TextEncoder().encode('not-json'));
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });

    it('drops an envelope missing the required type attribute', () => {
      seedTenant('tenant-A');

      expect(() => {
        handleServiceChannelMessage(buildEvent({ type: undefined }));
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });

  describe('unknown type is dropped at warn', () => {
    it('does not evict and does not throw', () => {
      seedTenant('tenant-A');

      expect(() => {
        handleServiceChannelMessage(buildEvent({ type: 'org.tazama.network-map.deactivated' }));
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });

  describe('audience gate', () => {
    it('acts when audience is absent (broadcast default)', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent());

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('acts when audience is the broadcast token', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent({ audience: SERVICE_CHANNEL_AUDIENCE.ALL }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('acts when audience is its own class token', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent({ audience: SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('acts when audience is its own function name (distinct from the class token)', () => {
      const originalFunctionName = configuration.functionName;
      configuration.functionName = 'event-director-worker-1';
      seedTenant('tenant-A');

      try {
        handleServiceChannelMessage(buildEvent({ audience: 'event-director-worker-1' }));
        expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
      } finally {
        configuration.functionName = originalFunctionName;
      }
    });

    it('ignores a message addressed to another tier at debug, leaving cache intact', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent({ audience: SERVICE_CHANNEL_AUDIENCE.RULE_PROCESSOR }));

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });

    it('ignores an empty-string audience at debug (not broadcast), leaving cache intact', () => {
      seedTenant('tenant-A');

      handleServiceChannelMessage(buildEvent({ audience: '' }));

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });

  describe('malformed network-map.activated payload is dropped at warn', () => {
    it('drops an event with no data, leaving cache intact', () => {
      seedTenant('tenant-A');

      expect(() => {
        handleServiceChannelMessage(buildEvent({ data: undefined }));
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });

    it('drops an event whose data is missing tenantId, leaving cache intact', () => {
      seedTenant('tenant-A');

      expect(() => {
        handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0' } }));
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });
});
