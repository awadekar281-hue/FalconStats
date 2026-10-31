import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AssetsModule } from './modules/assets/assets.module';
import { CacheModule } from './modules/cache/cache.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { MarketModule } from './modules/market/market.module';
import { validateEnvironment } from './config/env.validation';
import { redisConnection } from './config/redis-connection';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ connection: redisConnection(config.getOrThrow<string>('REDIS_URL')) }),
    }),
    DatabaseModule,
    CacheModule,
    ProvidersModule,
    AssetsModule,
    MarketModule,
    IngestionModule,
    HealthModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
