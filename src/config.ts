// SPDX-License-Identifier: Apache-2.0
import { type ManagerConfig } from '@tazama-lf/frms-coe-lib';
import { type AdditionalConfig, type ProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';

/**
 * Aadditional environment variables are accompanied by their interface.
 * The interface defines the key as the actual environment variable name,
 * and the corresponding type must match the one specified within the array
 * of additional environment variables.
 * @example { HOST: string, PORT: number }
 */
interface AdditionalEnvironmentVariables {
  ENVIRONMENTVARIABLENAME: string;
}

export const additionalEnvironmentVariables: AdditionalConfig[] = [];

export type Configuration = ProcessorConfig & ManagerConfig & AdditionalEnvironmentVariables;
