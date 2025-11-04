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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Placeholder for additional env
interface AdditionalEnvironmentVariables {
  // ENVIRONMENTVARIABLENAME: string;
}

export const additionalEnvironmentVariables: AdditionalConfig[] = [];
export type Databases = Required<Pick<ManagerConfig, 'configuration' | 'redisConfig' | 'localCacheConfig'>>;
export type Configuration = ProcessorConfig & Databases & AdditionalEnvironmentVariables;
