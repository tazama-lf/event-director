// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-console */
import { LoggerService, type DatabaseManagerInstance, type ManagerConfig } from '@tazama-lf/frms-coe-lib';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/';
import { StartupFactory, type IStartupService } from '@tazama-lf/frms-coe-startup-lib';
import cluster from 'cluster';
import NodeCache from 'node-cache';
import os from 'os';
import './apm';
import { additionalEnvironmentVariables, type Configuration } from './config';
import { handleTransaction } from './services/logic.service';
import { Singleton } from './services/services';

let configuration = validateProcessorConfig(additionalEnvironmentVariables) as Configuration;

export const loggerService: LoggerService = new LoggerService(configuration);

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

let databaseManager: DatabaseManagerInstance<ManagerConfig>;

export const dbInit = async (): Promise<void> => {
  const { config, db: manager } = await Singleton.getDatabaseManager(configuration);
  console.log(manager.isReadyCheck());
  databaseManager = manager;
  configuration = { ...configuration, ...config };
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

export { configuration, databaseManager };
