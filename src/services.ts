import { RedisService } from './helpers/redis';

export class Services {
  private static cacheClient: RedisService;

  public static getCacheClientInstance(): RedisService {
    if (!Services.cacheClient) Services.cacheClient = new RedisService();

    return Services.cacheClient;
  }
}
