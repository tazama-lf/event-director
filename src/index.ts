// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import './apm';
import os from 'os';
import { config } from './config';
import { LoggerService, type DatabaseManagerInstance } from '@frmscoe/frms-coe-lib';
import { handleTransaction } from './services/logic.service';
import cluster from 'cluster';
import { StartupFactory, type IStartupService } from '@frmscoe/frms-coe-startup-lib';
import NodeCache from 'node-cache';
import { Singleton } from './services/services';

// Set config for lib (network map db config you want to use)
const databaseManagerConfig = {
  networkMap: {
    certPath: config.dbCertPath,
    databaseName: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    url: config.dbURL,
  },
  redisConfig: {
    db: config.redis.db,
    servers: config.redis.servers,
    password: config.redis.password,
    isCluster: config.redis.isCluster,
  },
};

export const loggerService: LoggerService = new LoggerService(config.sidecarHost);

let databaseManager: DatabaseManagerInstance<typeof databaseManagerConfig>;
export const nodeCache = new NodeCache();
export let server: IStartupService;

export const runServer = async (): Promise<void> => {
  server = new StartupFactory();
  if (config.nodeEnv !== 'test') {
    let isConnected = false;
    for (let retryCount = 0; retryCount < 10; retryCount++) {
      loggerService.log('Connecting to nats server...');
      if (!(await server.init(handleTransaction))) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        loggerService.log('Connected to nats');
        isConnected = true;
        break;
      }
    }
    if (!isConnected) {
      throw new Error('Unable to connect to nats after 10 retries');
    }
  }
};

process.on('uncaughtException', (err) => {
  loggerService.error(`process on uncaughtException error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
});

process.on('unhandledRejection', (err) => {
  loggerService.error(`process on unhandledRejection error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
});

const numCPUs = os.cpus().length > config.maxCPU ? config.maxCPU + 1 : os.cpus().length + 1;
export const dbInit = async (): Promise<void> => {
  const manager = await Singleton.getDatabaseManager(databaseManagerConfig);
  console.log(manager.isReadyCheck());
  databaseManager = manager;
};

if (cluster.isPrimary && config.maxCPU !== 1) {
  loggerService.log(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 1; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    loggerService.log(`worker ${Number(worker.process.pid)} died, starting another worker`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  (async () => {
    try {
      if (config.nodeEnv !== 'test') {
        await runServer();
        await dbInit();
      }
    } catch (err) {
      loggerService.error(`Error while starting NATS server on Worker ${process.pid}`, err);
      process.exit(1);
    }
  })();
  loggerService.log(`Worker ${process.pid} started`);
}

export { databaseManager };
