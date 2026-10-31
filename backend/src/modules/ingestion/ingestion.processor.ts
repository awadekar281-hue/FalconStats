import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MARKET_JOB, MARKET_QUEUE } from './ingestion.constants';
import { MarketIngestionService } from './market-ingestion.service';

@Processor(MARKET_QUEUE, { concurrency: 1 })
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);
  constructor(private readonly ingestion: MarketIngestionService) { super(); }
  async process(job: Job): Promise<unknown> {
    if (job.name !== MARKET_JOB) throw new Error(`Unknown ingestion job: ${job.name}`);
    this.logger.log(`Starting market ingestion job ${job.id}`);
    return this.ingestion.ingest();
  }
}
