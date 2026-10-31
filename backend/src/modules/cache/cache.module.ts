import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { CACHE_REDIS } from './cache.constants';

@Global()
@Module({
  providers: [
    { provide: CACHE_REDIS, inject: [ConfigService], useFactory: (config: ConfigService) => {
      const redis = new Redis(config.getOrThrow<string>('REDIS_URL'), { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      redis.on('error', (error) => console.warn(`Redis cache error: ${error.message}`));
      return redis;
    } },
    CacheService,
  ],
  exports: [CacheService, CACHE_REDIS],
})
export class CacheModule {}
