// SPDX-License-Identifier: Apache-2.0
import { type ManagerConfig } from '@tazama-lf/frms-coe-lib';
import {
  validateDatabaseConfig,
  validateLocalCacheConfig,
  validateLogConfig,
  validateProcessorConfig,
  validateRedisConfig,
} from '@tazama-lf/frms-coe-lib/lib/helpers/env';
import { Database } from '@tazama-lf/frms-coe-lib/lib/helpers/env/database.config';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file into process.env if it exists. This is convenient for running locally.
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

export interface IConfig {
  maxCPU: number;
  db: ManagerConfig;
  functionName: string;
  sidecarHost?: string;
  nodeEnv: string;
}

const logConfig = validateLogConfig();
const generalConfig = validateProcessorConfig();
const localCacheConfig = validateLocalCacheConfig();
const authEnabled = generalConfig.nodeEnv === 'production';
const redisConfig = validateRedisConfig(authEnabled);
const configDBConfig = validateDatabaseConfig(authEnabled, Database.CONFIGURATION);

export const configuration: IConfig = {
  nodeEnv: generalConfig.nodeEnv,
  functionName: generalConfig.functionName,
  maxCPU: generalConfig.maxCPU || 1,
  db: {
    redisConfig,
    configuration: configDBConfig,
    localCacheConfig,
  },

  sidecarHost: logConfig.sidecarHost,
};
