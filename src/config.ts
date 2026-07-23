// SPDX-License-Identifier: Apache-2.0
import { SERVICE_CHANNEL_AUDIENCE, type ManagerConfig, type ServiceChannelAudienceClass } from '@tazama-lf/frms-coe-lib';
import type { AdditionalConfig, ProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';

/**
 * Additional environment variables are accompanied by their interface.
 * The interface defines the key as the actual environment variable name,
 * and the corresponding type must match the one specified within the array
 * of additional environment variables.
 * @example { HOST: string, PORT: number }
 */

interface AdditionalEnvironmentVariables {
  SERVICE_CHANNEL_PRODUCER?: string;
  SERVICE_CHANNEL_CONSUMER?: string;
  SERVICE_CHANNEL_SOURCE_URI_PREFIX?: string;
  SERVICE_CHANNEL_CLASS: ServiceChannelAudienceClass;
}

export const additionalEnvironmentVariables: AdditionalConfig[] = [
  {
    name: 'SERVICE_CHANNEL_PRODUCER',
    type: 'string',
    optional: true,
  },
  {
    name: 'SERVICE_CHANNEL_CONSUMER',
    type: 'string',
    optional: true,
  },
  {
    name: 'SERVICE_CHANNEL_SOURCE_URI_PREFIX',
    type: 'string',
    optional: true,
  },
  {
    name: 'SERVICE_CHANNEL_CLASS',
    type: 'string',
    optional: false,
  },
];
export type Databases = Required<Pick<ManagerConfig, 'configuration' | 'redisConfig' | 'localCacheConfig'>>;
export type Configuration = ProcessorConfig & Databases & AdditionalEnvironmentVariables;

export const validateServiceChannelConfiguration = (configuration: Configuration): void => {
  if (configuration.SERVICE_CHANNEL_CLASS !== SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR) {
    throw new Error(`Environment variable SERVICE_CHANNEL_CLASS must be '${SERVICE_CHANNEL_AUDIENCE.EVENT_DIRECTOR}'.`);
  }
};
