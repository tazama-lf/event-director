/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database } from 'arangojs';
import { config } from '../config';
import { iDBService } from '../interfaces/iDBService';
import { LoggerService } from '../services/logger.service';
import * as fs from 'fs'

export class ArangoDBService implements iDBService {
  client: Database;

  constructor() {
    const caOption = fs.existsSync("/usr/local/share/ca-certificates/ca-certificates.crt") ? [fs.readFileSync("/usr/local/share/ca-certificates/ca-certificates.crt")] : []
    this.client = new Database({
      url: config.dbURL,
      databaseName: config.dbName,
      auth: {
        username: config.dbUser,
        password: config.dbPassword,
      },
      agentOptions: {
        ca: caOption
      },
    });

    LoggerService.log('✅ ArangoDB connection is ready');
  }

  getNetworkMap(): Promise<any> {
    const networkConfigurationQuery = `
    FOR doc IN networkConfiguration
    FILTER doc.active == true
    RETURN UNSET(doc, ['_key', '_id', '_rev' ])
  `;
    return this.query(networkConfigurationQuery);
  }

  //   async query(query: string): Promise<string[][] | undefined | any> {
  private async query(query: string): Promise<any> {
    try {
      const cycles = await this.client.query(query);

      const results = await cycles.batches.all();

      return results;
    } catch (error) {
      LoggerService.error('Error while executing query from arango with message:', error as any, 'ArangoDBService');
    }
  }
}
