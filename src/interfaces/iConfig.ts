import { type RedisConfig } from '@frmscoe/frms-coe-lib/lib/interfaces';
export interface IConfig {
  maxCPU: number;
  redis: RedisConfig;
  dbURL: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbCertPath: string;
  restPort: number;
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
  cacheTTL: number;
}
