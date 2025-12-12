// SPDX-License-Identifier: Apache-2.0
import type { ManagerConfig } from '@tazama-lf/frms-coe-lib';
import type { AdditionalConfig, ProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';

/**
 * Additional environment variables are accompanied by their interface.
 * The interface defines the key as the actual environment variable name,
 * and the corresponding type must match the one specified within the array
 * of additional environment variables.
 * @example { HOST: string, PORT: number }
 */

export const additionalEnvironmentVariables: AdditionalConfig[] = [
  {
    name: 'COMMAND_CHANNEL_STREAM_SUBJECT',
    type: 'string',
    optional: false,
  },
  {
    name: 'COMMAND_CHANNEL_CONSUMER_STREAM',
    type: 'string',
    optional: false,
  },
  {
    name: 'COMMAND_CHANNEL_PRODUCER_STREAM',
    type: 'string',
    optional: false,
  },
];

interface AdditionalEnvironmentVariables {
  COMMAND_CHANNEL_STREAM_SUBJECT: string;
  COMMAND_CHANNEL_CONSUMER_STREAM: string;
  COMMAND_CHANNEL_PRODUCER_STREAM: string;
}

export type Databases = Required<Pick<ManagerConfig, 'configuration' | 'redisConfig' | 'localCacheConfig'>>;
export type Configuration = ProcessorConfig & Databases & AdditionalEnvironmentVariables;
