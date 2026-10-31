import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Queue } from 'bullmq';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { envelope } from '../../common/api-envelope';
import { CMC_MARKET_JOB, CMC_MARKET_QUEUE } from './ingestion.constants';
import { CmcClient } from '../cmc/cmc.client';
import { CmcTelemetryService } from '../cmc/cmc-telemetry.service';

@ApiTags('providers')
@Controller('providers/cmc')
export class IngestionController {
  constructor(@InjectQueue(CMC_MARKET_QUEUE) private readonly queue: Queue, private readonly cmc: CmcClient, private readonly telemetry: CmcTelemetryService) {}
  @Get('status') @ApiOperation({ summary: 'Provider access mode and ingestion health summary' })
  async status(): Promise<object> { return envelope({ provider: 'coinmarketcap', accessMode: this.cmc.accessMode, ...(await this.telemetry.status()) }); }
  @Post('ingestion/market') @UseGuards(AdminKeyGuard) @ApiSecurity('admin-key') @ApiOperation({ summary: 'Queue an immediate market data ingestion' })
  async ingestMarket(): Promise<object> {
    const job = await this.queue.add(CMC_MARKET_JOB, { scheduled: false, requestedAt: new Date().toISOString() }, { attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 500 });
    return envelope({ queued: true, jobId: job.id, state: await job.getState() });
  }
  @Post('key-info') @UseGuards(AdminKeyGuard) @ApiSecurity('admin-key') @ApiOperation({ summary: 'Read CMC /v1/key/info usage limits and persist the latest subscription usage' })
  async keyInfo(): Promise<object> {
    const info = await this.cmc.getKeyInfo();
    return envelope({ plan: info.plan, usage: info.usage, capturedAt: new Date().toISOString() }, { source: 'coinmarketcap-key-info' });
  }
  @Get('quota') @UseGuards(AdminKeyGuard) @ApiSecurity('admin-key') @ApiOperation({ summary: 'Read provider request credits and latest subscription quota snapshot' })
  async quota(): Promise<object> { return envelope(await this.telemetry.quota(this.cmc.accessMode)); }
}
