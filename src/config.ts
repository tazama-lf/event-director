// SPDX-License-Identifier: Apache-2.0
import { type ManagerConfig } from '@tazama-lf/frms-coe-lib';
import {
  validateProcessorConfig,
  validateEnvVar,
  validateRedisConfig,
  validateLogConfig,
  validateDatabaseConfig,
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
  nodeCacheTTL: number;
  sidecarHost?: string;
  nodeEnv: string;
}

const generalConfig = validateProcessorConfig();
const authEnabled = generalConfig.nodeEnv === 'production';
const redisConfig = validateRedisConfig(authEnabled);
const logConfig = validateLogConfig();
const configDBConfig = validateDatabaseConfig(authEnabled, Database.CONFIGURATION);

export const configuration: IConfig = {
  nodeEnv: generalConfig.nodeEnv,
  maxCPU: generalConfig.maxCPU,
  db: {
    redisConfig,
    configuration: configDBConfig,
  },
  functionName: generalConfig.functionName,
  nodeCacheTTL: validateEnvVar('CACHETTL', 'number'),
  sidecarHost: logConfig.sidecarHost,
};
