// SPDX-License-Identifier: Apache-2.0

process.env.SERVICE_CHANNEL_CONSUMER = 'service-channel';
process.env.SERVICE_CHANNEL_PRODUCER = 'service-channel-ack';
process.env.SERVICE_CHANNEL_SOURCE_URI_PREFIX = '';
process.env.SERVICE_CHANNEL_CLASS = 'event-director';

jest.mock('@tazama-lf/frms-coe-startup-lib', () => ({
  StartupFactory: jest.fn(() => ({
    init: jest.fn().mockResolvedValue(true),
    initServiceChannel: jest.fn().mockResolvedValue(true),
    publishServiceChannel: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { ServiceChannelType, SERVICE_CHANNEL_AUDIENCE } from '@tazama-lf/frms-coe-lib';
import { configuration, loggerService, nodeCache, runServer, server } from '../../src';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DecodedAck = { event: Record<string, any>; subject: string };

const decodeAck = (call: unknown[]): DecodedAck => {
  const [bytes, subject] = call as [Uint8Array, string];
  return { event: JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>, subject } as DecodedAck;
};

beforeAll(async () => {
  // Populate the exported `server` live-binding (nodeEnv === 'test' short-circuits the connect/retry
  // inside runServer) so the mocked publishServiceChannel is available for every awaited handler call.
  await runServer();
  configuration.functionName = 'event-director';
});

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
    it('evicts every cache entry for the addressed tenant', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('leaves cache entries for other tenants untouched', async () => {
      seedTenant('tenant-A');
      seedTenant('tenant-B');

      await handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-B:'))).toHaveLength(2);
    });

    it('is an idempotent no-op on re-delivery of the same event', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));
      await expect(
        handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0', tenantId: 'tenant-A' } })),
      ).resolves.toBeUndefined();

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('malformed input is dropped at warn without crashing', () => {
    it('drops non-JSON bytes', async () => {
      seedTenant('tenant-A');

      await expect(handleServiceChannelMessage(new TextEncoder().encode('not-json'))).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });

    it('drops an envelope missing the required type attribute', async () => {
      seedTenant('tenant-A');

      await expect(handleServiceChannelMessage(buildEvent({ type: undefined }))).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });

  describe('unknown type is dropped at warn', () => {
    it('does not evict and does not throw', async () => {
      seedTenant('tenant-A');

      await expect(
        handleServiceChannelMessage(buildEvent({ type: 'org.tazama.network-map.deactivated' })),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });

  describe('audience gate', () => {
    it('acts when audience is absent (broadcast default)', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent());

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('acts when audience is the broadcast token', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent({ audience: SERVICE_CHANNEL_AUDIENCE.ALL }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('acts when audience is its own class token', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent({ audience: SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR }));

      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
    });

    it('acts when audience is its own function name (distinct from the class token)', async () => {
      const originalFunctionName = configuration.functionName;
      configuration.functionName = 'event-director-worker-1';
      seedTenant('tenant-A');

      try {
        await handleServiceChannelMessage(buildEvent({ audience: 'event-director-worker-1' }));
        expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(0);
      } finally {
        configuration.functionName = originalFunctionName;
      }
    });

    it('ignores a message addressed to another tier at debug, leaving cache intact', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent({ audience: SERVICE_CHANNEL_AUDIENCE.RULE_PROCESSOR }));

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });

    it('ignores an empty-string audience at debug (not broadcast), leaving cache intact', async () => {
      seedTenant('tenant-A');

      await handleServiceChannelMessage(buildEvent({ audience: '' }));

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });

  describe('malformed network-map.activated payload is dropped at warn', () => {
    it('drops an event with no data, leaving cache intact', async () => {
      seedTenant('tenant-A');

      await expect(handleServiceChannelMessage(buildEvent({ data: undefined }))).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });

    it('drops an event whose data is missing tenantId, leaving cache intact', async () => {
      seedTenant('tenant-A');

      await expect(handleServiceChannelMessage(buildEvent({ data: { cfg: '1.0.0' } }))).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(nodeCache.keys().filter((k) => k.startsWith('tenant-A:'))).toHaveLength(2);
    });
  });
});

describe('service-channel ack emission (#391)', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let publishMock: jest.Mock;
  let originalFunctionName: string;
  let originalSourcePrefix: string | undefined;

  beforeAll(async () => {
    // Populate the exported `server` live-binding with the mocked StartupFactory instance
    // (nodeEnv === 'test' short-circuits the connect/retry inside runServer).
    await runServer();
    publishMock = server.publishServiceChannel as unknown as jest.Mock;
  });

  beforeEach(() => {
    nodeCache.flushAll();
    originalFunctionName = configuration.functionName;
    originalSourcePrefix = configuration.SERVICE_CHANNEL_SOURCE_URI_PREFIX;
    configuration.functionName = 'event-director';
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
    publishMock.mockReset();
    publishMock.mockResolvedValue(undefined);
    jest.spyOn(loggerService, 'log').mockImplementation(() => undefined);
    jest.spyOn(loggerService, 'debug').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(loggerService, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(loggerService, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nodeCache.flushAll();
    configuration.functionName = originalFunctionName;
    configuration.SERVICE_CHANNEL_SOURCE_URI_PREFIX = originalSourcePrefix;
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
  });

  it('publishes exactly one ack on the reply subject (SERVICE_CHANNEL_PRODUCER) after a successful handler', async () => {
    seedTenant('tenant-A');

    await handleServiceChannelMessage(buildEvent({ id: 'evt-success', data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

    expect(publishMock).toHaveBeenCalledTimes(1);
    const { event, subject } = decodeAck(publishMock.mock.calls[0]);
    expect(subject).toBe('service-channel-ack');
    expect(event.type).toBe(ServiceChannelType.NETWORK_MAP_ACTIVATED);
    expect(event.data.correlationId).toBe('evt-success');
    expect(event.data.outcome).toBe('success');
    expect(event.data.error).toBeUndefined();
  });

  it('mints a fresh ack id distinct from the triggering event id', async () => {
    seedTenant('tenant-A');

    await handleServiceChannelMessage(buildEvent({ id: 'evt-fresh-id', data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

    expect(publishMock).toHaveBeenCalledTimes(1);
    const { event } = decodeAck(publishMock.mock.calls[0]);
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.id).not.toBe('evt-fresh-id');
  });

  it('composes the ack source as `${SERVICE_CHANNEL_SOURCE_URI_PREFIX}${FUNCTION_NAME}`', async () => {
    configuration.SERVICE_CHANNEL_SOURCE_URI_PREFIX = 'tazama://acme/';
    configuration.functionName = 'event-director-worker-7';
    seedTenant('tenant-A');

    await handleServiceChannelMessage(buildEvent({ id: 'evt-src', data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

    expect(publishMock).toHaveBeenCalledTimes(1);
    const { event } = decodeAck(publishMock.mock.calls[0]);
    expect(event.source).toBe('tazama://acme/event-director-worker-7');
  });

  it('acks outcome:success for a non-throwing handler discard (missing tenantId), not error and not silence', async () => {
    // A matched handler that warn-returns without throwing must still produce a success ack:
    // the generic ack wrapper keys outcome strictly off whether the handler threw (AC0/AC2).
    await handleServiceChannelMessage(buildEvent({ id: 'evt-discard', data: { cfg: '1.0.0' } }));

    expect(publishMock).toHaveBeenCalledTimes(1);
    const { event } = decodeAck(publishMock.mock.calls[0]);
    expect(event.data.correlationId).toBe('evt-discard');
    expect(event.data.outcome).toBe('success');
    expect(event.data.error).toBeUndefined();
  });

  it('publishes an outcome:error ack with data.error when the handler throws', async () => {
    seedTenant('tenant-A');
    jest.spyOn(nodeCache, 'del').mockImplementation(() => {
      throw new Error('cache boom');
    });

    await handleServiceChannelMessage(buildEvent({ id: 'evt-error', data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

    expect(publishMock).toHaveBeenCalledTimes(1);
    const { event } = decodeAck(publishMock.mock.calls[0]);
    expect(event.type).toBe(ServiceChannelType.NETWORK_MAP_ACTIVATED);
    expect(event.data.correlationId).toBe('evt-error');
    expect(event.data.outcome).toBe('error');
    expect(typeof event.data.error).toBe('string');
    expect(event.data.error.length).toBeGreaterThan(0);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('sends exactly one ack on each of the success and error paths', async () => {
    seedTenant('tenant-A');
    await handleServiceChannelMessage(buildEvent({ id: 'ok', data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(decodeAck(publishMock.mock.calls[0]).event.data.outcome).toBe('success');

    seedTenant('tenant-B');
    jest.spyOn(nodeCache, 'del').mockImplementation(() => {
      throw new Error('boom');
    });
    await handleServiceChannelMessage(buildEvent({ id: 'bad', data: { cfg: '1.0.0', tenantId: 'tenant-B' } }));
    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(decodeAck(publishMock.mock.calls[1]).event.data.outcome).toBe('error');
  });

  describe('no ack on a pre-dispatch drop', () => {
    it('does not ack malformed (non-JSON) bytes', async () => {
      await handleServiceChannelMessage(new TextEncoder().encode('not-json'));
      expect(publishMock).not.toHaveBeenCalled();
    });

    it('does not ack an unknown type', async () => {
      await handleServiceChannelMessage(buildEvent({ id: 'u', type: 'org.tazama.network-map.deactivated' }));
      expect(publishMock).not.toHaveBeenCalled();
    });

    it('does not ack a message addressed to another tier', async () => {
      await handleServiceChannelMessage(buildEvent({ id: 'a', audience: SERVICE_CHANNEL_AUDIENCE.RULE_PROCESSOR }));
      expect(publishMock).not.toHaveBeenCalled();
    });
  });

  it('swallows a publish failure without throwing and logs at error', async () => {
    seedTenant('tenant-A');
    publishMock.mockRejectedValueOnce(new Error('nats down'));

    await expect(
      handleServiceChannelMessage(buildEvent({ id: 'evt-pubfail', data: { cfg: '1.0.0', tenantId: 'tenant-A' } })),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });

  it('does not log the successful ack at warn or error', async () => {
    seedTenant('tenant-A');

    await handleServiceChannelMessage(buildEvent({ id: 'evt-log', data: { cfg: '1.0.0', tenantId: 'tenant-A' } }));

    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
