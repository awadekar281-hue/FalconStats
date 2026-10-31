import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { CMC_MARKET_JOB, CMC_MARKET_QUEUE } from './ingestion.constants';

@Injectable()
export class IngestionScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionScheduler.name);
  private timer?: NodeJS.Timeout;
  constructor(@InjectQueue(CMC_MARKET_QUEUE) private readonly queue: Queue, private readonly config: ConfigService) {}
  onModuleInit(): void {
    const seconds = this.config.get<number>('CMC_INGEST_INTERVAL_SECONDS') ?? 300;
    void this.enqueueScheduled();
    this.timer = setInterval(() => { void this.enqueueScheduled(); }, seconds * 1000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
  async enqueueScheduled(): Promise<void> {
    const seconds = this.config.get<number>('CMC_INGEST_INTERVAL_SECONDS') ?? 300;
    const slot = Math.floor(Date.now() / (seconds * 1000));
    try { await this.queue.add(CMC_MARKET_JOB, { scheduled: true, slot }, { jobId: `market-${slot}`, attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 500 }); }
    catch (error) { this.logger.error(`Unable to enqueue scheduled market sync: ${(error as Error).message}`); }
  }
}
