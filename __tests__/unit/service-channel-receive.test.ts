// SPDX-License-Identifier: Apache-2.0

process.env.SERVICE_CHANNEL_CONSUMER = 'service-channel';
process.env.SERVICE_CHANNEL_PRODUCER = 'service-channel-ack';
process.env.SERVICE_CHANNEL_SOURCE_URI_PREFIX = '';
process.env.SERVICE_CHANNEL_CLASS = 'event-director';

const mockStartupService = {
  init: jest.fn().mockResolvedValue(true),
  initServiceChannel: jest.fn().mockResolvedValue(true),
  handleResponse: jest.fn().mockResolvedValue(undefined),
};

const mockHandleTransaction = jest.fn();

jest.mock('@tazama-lf/frms-coe-startup-lib', () => ({
  StartupFactory: jest.fn(() => mockStartupService),
}));

jest.mock('../../src/services/logic.service', () => ({
  handleTransaction: (...args: unknown[]) => mockHandleTransaction(...args),
}));

import { additionalEnvironmentVariables } from '../../src/config';
import { configuration, loggerService, runServer } from '../../src';
import { SERVICE_CHANNEL_AUDIENCE } from '@tazama-lf/frms-coe-lib';

describe('service-channel receive seam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configuration.nodeEnv = 'dev';
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
  });

  afterEach(() => {
    configuration.nodeEnv = 'test';
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR;
  });

  it('registers the service-channel environment variables for startup validation', () => {
    expect(additionalEnvironmentVariables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'SERVICE_CHANNEL_PRODUCER', type: 'string' }),
        expect.objectContaining({ name: 'SERVICE_CHANNEL_CONSUMER', type: 'string' }),
        expect.objectContaining({ name: 'SERVICE_CHANNEL_SOURCE_URI_PREFIX', type: 'string' }),
        expect.objectContaining({ name: 'SERVICE_CHANNEL_CLASS', type: 'string' }),
      ]),
    );
  });

  it('subscribes to the forward service-channel subject during startup', async () => {
    await runServer();

    expect(mockStartupService.init).toHaveBeenCalledTimes(1);
    expect(mockStartupService.init.mock.calls[0]?.[0]).toEqual(expect.any(Function));
    expect(mockStartupService.initServiceChannel).toHaveBeenCalledTimes(1);

    const [, subject] = mockStartupService.initServiceChannel.mock.calls[0];
    expect(subject).toBe(process.env.SERVICE_CHANNEL_CONSUMER);
  });

  it('fails fast when SERVICE_CHANNEL_CLASS is not event-director', async () => {
    configuration.SERVICE_CHANNEL_CLASS = SERVICE_CHANNEL_AUDIENCE.RULE_PROCESSOR;

    await expect(runServer()).rejects.toThrow(/SERVICE_CHANNEL_CLASS/);
    expect(mockStartupService.initServiceChannel).not.toHaveBeenCalled();
  });

  it('routes received bytes through the service-channel handler without invoking transaction handling', async () => {
    await runServer();

    const warnSpy = jest.spyOn(loggerService, 'warn').mockImplementation(() => undefined);
    const [onMessage] = mockStartupService.initServiceChannel.mock.calls[0] as [
      (data: Uint8Array) => void | Promise<void>,
      string,
      unknown,
    ];

    const body = new TextEncoder().encode('{"type":"org.tazama.network-map.activated"}');
    await onMessage(body);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(mockHandleTransaction).not.toHaveBeenCalled();
  });

  it('drops a non-JSON service-channel payload at warn without crashing', async () => {
    await runServer();

    const warnSpy = jest.spyOn(loggerService, 'warn').mockImplementation(() => undefined);
    const [onMessage] = mockStartupService.initServiceChannel.mock.calls[0] as [
      (data: Uint8Array) => void | Promise<void>,
      string,
      unknown,
    ];

    const body = new TextEncoder().encode('not-json');
    await expect(Promise.resolve(onMessage(body))).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(mockHandleTransaction).not.toHaveBeenCalled();
  });
});