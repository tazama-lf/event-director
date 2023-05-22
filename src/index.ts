import cluster from 'cluster';
import apm from 'elastic-apm-node';
import os from 'os';
import App from './app';
import { config } from './config';
import { Services } from './services';
import { LoggerService } from './services/logger.service';
import { CreateDatabaseManager, DatabaseManagerInstance } from '@frmscoe/frms-coe-lib';

if (config.apmLogging) {
  apm.start({
    serviceName: config.functionName,
    secretToken: config.apmSecretToken,
    serverUrl: config.apmURL,
    usePathAsTransactionName: true,
    active: config.apmLogging,
    transactionIgnoreUrls: ['/health'],
  });
}

// Set config for lib (network map db config you want to use)
const databaseManagerConfig = {
  networkMap: {
    certPath: config.dbCertPath,
    databaseName: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    url: config.dbURL,
  },
};

let databaseManager: DatabaseManagerInstance<typeof databaseManagerConfig>;
export const cacheClient = Services.getCacheClientInstance();

let app: App;

const runServer = (): App => {
  /**
   * KOA Rest Server
   */
  const koaApp = new App();
  koaApp.listen(config.restPort, () => {
    LoggerService.log(`HTTP Server listening on port ${config.restPort}`);
  });

  return koaApp;
};

process.on('uncaughtException', (err) => {
  LoggerService.error(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', (err) => {
  LoggerService.error(`process on unhandledRejection error: ${err}`);
});

const numCPUs = os.cpus().length > config.maxCPU ? config.maxCPU + 1 : os.cpus().length + 1;

export const init = async () => {
  const manager = await CreateDatabaseManager(databaseManagerConfig);
  databaseManager = manager;
};

(async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      // setup lib - create database instance
      await init();
    }
  } catch (err) {
    LoggerService.error('Error while starting HTTP server', err as Error);
  }
})();

if (cluster.isMaster && config.maxCPU !== 1) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 1; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died, starting another worker`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  try {
    app = runServer();
  } catch (err) {
    LoggerService.error(`Error while starting HTTP server on Worker ${process.pid}`, err);
  }
  console.log(`Worker ${process.pid} started`);
}

export { app, databaseManager };
