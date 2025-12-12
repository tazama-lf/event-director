// SPDX-License-Identifier: Apache-2.0
import { Database } from '@tazama-lf/frms-coe-lib/lib/config/database.config';
import { Cache } from '@tazama-lf/frms-coe-lib/lib/config/redis.config';
import { CreateStorageManager, type DatabaseManagerInstance, type ManagerConfig } from '@tazama-lf/frms-coe-lib/lib/services/dbManager';
import type { MsgHdrs } from 'nats';
import { databaseManager, loggerService } from '..';
import type { Configuration } from '../config';
import { loadAllNetworkConfigurations } from './logic.service';

/* eslint-disable @typescript-eslint/no-extraneous-class -- singleton*/
export class Singleton {
  private static dbManager: DatabaseManagerInstance<Configuration>;

  public static async getDatabaseManager(
    configuration: Configuration,
  ): Promise<{ db: DatabaseManagerInstance<Configuration>; config: ManagerConfig }> {
    if (!Singleton.dbManager) {
      const requireAuth = configuration.nodeEnv === 'production';

      const { db } = await CreateStorageManager<typeof configuration>(
        [Database.CONFIGURATION, Cache.DISTRIBUTED, Cache.LOCAL],
        requireAuth,
      );

      Singleton.dbManager = db;
    }
    return { db: Singleton.dbManager, config: configuration };
  }
}
export async function handleReload(object: unknown): Promise<void> {
  const { headers } = object as { message: unknown; headers: MsgHdrs | null };
  if (headers?.get('config-type') === 'network-map') {
    // Clear node cache
    loggerService.log('Clearing node cache');
    databaseManager.nodeCache?.flushAll();
    loggerService.log('Re-establishing network-map node cache');
    await loadAllNetworkConfigurations();
  }
}
/* eslint-enable @typescript-eslint/no-extraneous-class */
