// SPDX-License-Identifier: Apache-2.0
import { type ManagerConfig } from '@frmscoe/frms-coe-lib';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file into process.env if it exists. This is convenient for running locally.
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

export interface IConfig {
  maxCPU: number;
  db: ManagerConfig;
  logger: {
    logstashHost: string;
    logstashPort: number;
    logstashLevel: string;
  };
  arangoHost: string;
  arangoPort: number;
  functionName: string;
  apmLogging: boolean;
  apmSecretToken: string;
  apmURL: string;
  nodeEnv: string;
  nodeCacheTTL: number;
  sidecarHost: string;
}

export const configuration: IConfig = {
  maxCPU: parseInt(process.env.MAX_CPU!, 10) || 1,
  db: {
    redisConfig: {
      db: parseInt(process.env.REDIS_DB ?? ''),
      servers: JSON.parse(process.env.REDIS_SERVERS! || '[{"hostname": "127.0.0.1", "port":6379}]'),
      password: process.env.REDIS_AUTH!,
      isCluster: process.env.REDIS_IS_CLUSTER === 'true',
    },
    configuration: {
      url: process.env.DATABASE_URL!,
      databaseName: process.env.DATABASE_NAME!,
      user: process.env.DATABASE_USER!,
      password: process.env.DATABASE_PASSWORD!,
      certPath: process.env.DATABASE_CERT_PATH!,
    },
  },
  logger: {
    logstashHost: process.env.LOGSTASH_HOST!,
    logstashPort: parseInt(process.env.LOGSTASH_PORT ?? '0', 10),
    logstashLevel: process.env.LOGSTASH_LEVEL! || 'info',
  },
  arangoHost: process.env.ARANGO_HOST!,
  arangoPort: parseInt(process.env.arangoPort ?? '', 10),
  functionName: process.env.FUNCTION_NAME!,
  apmLogging: process.env.APM_ACTIVE === 'true',
  apmSecretToken: process.env.APM_SECRET_TOKEN!,
  apmURL: process.env.APM_URL!,
  nodeEnv: process.env.NODE_ENV!,
  nodeCacheTTL: parseInt(process.env.CACHETTL ?? '300', 10),
  sidecarHost: process.env.SIDECAR_HOST!,
};
