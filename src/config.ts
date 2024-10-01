// SPDX-License-Identifier: Apache-2.0
import { type ManagerConfig } from '@tazama-lf/frms-coe-lib';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/helpers/env/processor.config';
import { validateRedisConfig } from '@tazama-lf/frms-coe-lib/lib/helpers/env/redis.config';
import { validateLogConfig } from '@tazama-lf/frms-coe-lib/lib/helpers/env/monitoring.config';
import { Database, validateDatabaseConfig } from '@tazama-lf/frms-coe-lib/lib/helpers/env/database.config';
import { validateEnvVar } from '@tazama-lf/frms-coe-lib/lib/helpers/env';
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
  sidecarHost: string;
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
    configuration: {
      url: configDBConfig.url,
      databaseName: configDBConfig.name,
      user: configDBConfig.user,
      password: configDBConfig.password ?? '',
      certPath: configDBConfig.certPath,
    },
  },
  functionName: generalConfig.functionName,
  nodeCacheTTL: validateEnvVar('CACHETTL', 'number'),
  sidecarHost: logConfig.sidecarHost,
};
