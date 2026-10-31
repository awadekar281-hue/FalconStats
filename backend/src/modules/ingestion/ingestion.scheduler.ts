import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { MARKET_JOB, MARKET_QUEUE } from './ingestion.constants';

@Injectable()
export class IngestionScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionScheduler.name);
  private timer?: NodeJS.Timeout;
  constructor(@InjectQueue(MARKET_QUEUE) private readonly queue: Queue, private readonly config: ConfigService) {}
  onModuleInit(): void {
    const seconds = this.config.get<number>('MARKET_INGEST_INTERVAL_SECONDS') ?? 900;
    void this.enqueueScheduled();
    this.timer = setInterval(() => { void this.enqueueScheduled(); }, seconds * 1000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
  async enqueueScheduled(): Promise<void> {
    const seconds = this.config.get<number>('MARKET_INGEST_INTERVAL_SECONDS') ?? 900;
    const slot = Math.floor(Date.now() / (seconds * 1000));
    try { await this.queue.add(MARKET_JOB, { scheduled: true, slot }, { jobId: `market-${slot}`, attempts: 2, backoff: { type: 'exponential', delay: 30000 }, removeOnComplete: 1000, removeOnFail: 500 }); }
    catch (error) { this.logger.error(`Unable to enqueue scheduled market sync: ${(error as Error).message}`); }
  }
}
