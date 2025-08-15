// SPDX-License-Identifier: Apache-2.0
import { Database } from '@tazama-lf/frms-coe-lib/lib/config/database.config';
import { Cache } from '@tazama-lf/frms-coe-lib/lib/config/redis.config';
import { CreateStorageManager, type DatabaseManagerInstance, type ManagerConfig } from '@tazama-lf/frms-coe-lib/lib/services/dbManager';
import type { Configuration } from '../config';
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
/* eslint-enable @typescript-eslint/no-extraneous-class */
