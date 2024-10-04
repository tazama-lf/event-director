// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-console */
import './apm';
import { LoggerService, type DatabaseManagerInstance } from '@tazama-lf/frms-coe-lib';
import { StartupFactory, type IStartupService } from '@tazama-lf/frms-coe-startup-lib';
import cluster from 'cluster';
import NodeCache from 'node-cache';
import os from 'os';
import { configuration } from './config';
import { handleTransaction } from './services/logic.service';
import { Singleton } from './services/services';

const databaseManagerConfig = configuration.db;

export const loggerService: LoggerService = new LoggerService(configuration.sidecarHost);

let databaseManager: DatabaseManagerInstance<typeof databaseManagerConfig>;
export const nodeCache = new NodeCache();
export let server: IStartupService;

export const runServer = async (): Promise<void> => {
  server = new StartupFactory();
  if (configuration.nodeEnv !== 'test') {
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

const numCPUs = os.cpus().length > configuration.maxCPU ? configuration.maxCPU + 1 : os.cpus().length + 1;
export const dbInit = async (): Promise<void> => {
  const manager = await Singleton.getDatabaseManager(databaseManagerConfig);
  console.log(manager.isReadyCheck());
  databaseManager = manager;
};

if (cluster.isPrimary && configuration.maxCPU !== 1) {
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
      if (configuration.nodeEnv !== 'test') {
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
