// SPDX-License-Identifier: Apache-2.0
import path from 'path';
import * as dotenv from 'dotenv';
import { type IConfig } from './interfaces/iConfig';

// Load .env file into process.env if it exists. This is convenient for running locally.
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

export const config: IConfig = {
  maxCPU: parseInt(process.env.MAX_CPU!, 10) || 1,
  redis: {
    password: process.env.REDIS_AUTH!,
    db: parseInt(process.env.REDIS_DB ?? ''),
    servers: JSON.parse(process.env.REDIS_SERVERS! || '[{"hostname": "127.0.0.1", "port":6379}]'),
    isCluster: process.env.REDIS_IS_CLUSTER === 'true',
  },
  dbURL: process.env.DATABASE_URL!,
  dbName: process.env.DATABASE_NAME!,
  dbUser: process.env.DATABASE_USER!,
  dbPassword: process.env.DATABASE_PASSWORD!,
  dbCertPath: process.env.DATABASE_CERT_PATH!,
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
  cacheTTL: parseInt(process.env.CACHETTL ?? '300', 10),
  sidecarHost: process.env.SIDECAR_HOST!,
};
