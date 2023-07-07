import apm from 'elastic-apm-node';
import os from 'os';
import { config } from './config';
import { LoggerService } from './services/logger.service';
import { CreateDatabaseManager, DatabaseManagerInstance } from '@frmscoe/frms-coe-lib';
import { handleTransaction } from './services/logic.service';
import cluster from 'cluster';
import { StartupFactory, IStartupService } from 'startup';

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
  redisConfig: {
    db: config.redis.db,
    host: config.redis.host,
    password: config.redis.auth,
    port: config.redis.port,
  },
};

let databaseManager: DatabaseManagerInstance<typeof databaseManagerConfig>;
export let server: IStartupService;

const runServer = async () => {
  server = new StartupFactory();
  for (let retryCount = 0; retryCount < 10; retryCount++) {
    console.log('Connecting to nats server...');
    if (!(await server.init(handleTransaction))) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      console.log('Connected to nats');
      break;
    }
  }
};

process.on('uncaughtException', (err) => {
  LoggerService.error(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', (err) => {
  LoggerService.error(`process on unhandledRejection error: ${err}`);
});

const numCPUs = os.cpus().length > config.maxCPU ? config.maxCPU + 1 : os.cpus().length + 1;
export const dbInit = async () => {
  const manager = await CreateDatabaseManager(databaseManagerConfig);
  console.log(manager.isReadyCheck());
  databaseManager = manager;
};

(async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      // setup lib - create database instance
      await dbInit();
    }
  } catch (err) {
    LoggerService.error('Error while starting HTTP server', err as Error);
  }
})();

if (cluster.isPrimary && config.maxCPU !== 1) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 1; i < 2; i++) {
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
    if (config.nodeEnv !== "test") {
      runServer();
    }
  } catch (err) {
    LoggerService.error(`Error while starting HTTP server on Worker ${process.pid}`, err);
  }
  console.log(`Worker ${process.pid} started`);
}

export { databaseManager };
