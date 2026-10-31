import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AssetsModule } from '../assets/assets.module';
import { CacheModule } from '../cache/cache.module';
import { ProvidersModule } from '../providers/providers.module';
import { MarketModule } from '../market/market.module';
import { MARKET_QUEUE } from './ingestion.constants';
import { IngestionController } from './ingestion.controller';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionScheduler } from './ingestion.scheduler';
import { MarketIngestionService } from './market-ingestion.service';
import { AdminKeyGuard } from '../../common/admin-key.guard';

@Module({
  imports: [BullModule.registerQueueAsync({ name: MARKET_QUEUE, inject: [ConfigService], useFactory: (config: ConfigService) => ({ prefix: config.get<string>('QUEUE_PREFIX') ?? 'falconstats' }) }), AssetsModule, MarketModule, ProvidersModule, CacheModule],
  controllers: [IngestionController],
  providers: [MarketIngestionService, IngestionProcessor, IngestionScheduler, AdminKeyGuard],
  exports: [MarketIngestionService],
})
export class IngestionModule {}
