import path from 'path';
import * as dotenv from 'dotenv';
import { type IConfig } from './interfaces/iConfig';

// Load .env file into process.env if it exists. This is convenient for running locally.
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

export const config: IConfig = {
  maxCPU: parseInt(process.env.MAX_CPU ?? `${Number.MAX_SAFE_INTEGER}`, 10) || Number.MAX_SAFE_INTEGER,
  redis: {
    password: process.env.REDIS_AUTH as string,
    db: parseInt(process.env.REDIS_DB ?? ''),
    servers: JSON.parse((process.env.REDIS_SERVERS as string) || '[{"hostname": "127.0.0.1", "port":6379}]'),
    isCluster: process.env.REDIS_IS_CLUSTER === 'true',
  },
  dbURL: process.env.DB_URL as string,
  dbName: process.env.DB_NAME as string,
  dbUser: process.env.DB_USER as string,
  dbPassword: process.env.DB_PASSWORD as string,
  dbCertPath: process.env.DATABASE_CERT_PATH as string,
  restPort: parseInt(process.env.REST_PORT ?? '3000', 10),
  logstashHost: process.env.LOGSTASH_HOST as string,
  logstashPort: parseInt(process.env.LOGSTASH_PORT ?? '8080', 10),
  arangoHost: process.env.ARANGO_HOST as string,
  arangoPort: parseInt(process.env.arangoPort ?? '', 10),
  functionName: process.env.FUNCTION_NAME as string,
  apmLogging: process.env.APM_LOGGING === 'true',
  apmSecretToken: process.env.APM_SECRET_TOKEN as string,
  apmURL: process.env.APM_URL as string,
  nodeEnv: process.env.NODE_ENV as string,
};
