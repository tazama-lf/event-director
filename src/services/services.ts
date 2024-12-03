// SPDX-License-Identifier: Apache-2.0
import { Database } from '@tazama-lf/frms-coe-lib/lib/config/database.config';
import { type ProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';
import { Cache } from '@tazama-lf/frms-coe-lib/lib/config/redis.config';
import { CreateStorageManager, type DatabaseManagerInstance, type ManagerConfig } from '@tazama-lf/frms-coe-lib/lib/services/dbManager';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class Singleton {
  private static dbManager: any;

  public static async getDatabaseManager(
    configuration: ProcessorConfig,
  ): Promise<{ db: DatabaseManagerInstance<ManagerConfig>; config: ManagerConfig }> {
    if (!Singleton.dbManager) {
      const requireAuth = configuration.nodeEnv === 'production';
      Singleton.dbManager = await CreateStorageManager([Database.CONFIGURATION, Cache.DISTRIBUTED, Cache.LOCAL], requireAuth);
    }
    return Singleton.dbManager;
  }
}
