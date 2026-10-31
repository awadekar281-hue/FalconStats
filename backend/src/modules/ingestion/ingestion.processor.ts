import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CMC_MARKET_JOB, CMC_MARKET_QUEUE } from './ingestion.constants';
import { MarketIngestionService } from './market-ingestion.service';

@Processor(CMC_MARKET_QUEUE, { concurrency: 1 })
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);
  constructor(private readonly ingestion: MarketIngestionService) { super(); }
  async process(job: Job): Promise<unknown> {
    if (job.name !== CMC_MARKET_JOB) throw new Error(`Unknown ingestion job: ${job.name}`);
    this.logger.log(`Starting market ingestion job ${job.id}`);
    return this.ingestion.ingest();
  }
}
