import { Database } from 'arangojs';

/* eslint-disable */
export interface iDBService {
  client: Database;
  getNetworkMap(): Promise<any>;
}
