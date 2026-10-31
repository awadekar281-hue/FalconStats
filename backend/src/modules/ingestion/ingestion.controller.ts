import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Queue } from 'bullmq';
import { PgService } from '../database/pg.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { envelope } from '../../common/api-envelope';
import { MARKET_JOB, MARKET_QUEUE } from './ingestion.constants';

@ApiTags('providers')
@Controller('providers')
export class IngestionController {
  constructor(@InjectQueue(MARKET_QUEUE) private readonly queue: Queue, private readonly db: PgService, private readonly registry: ProviderRegistryService) {}
  @Get('status') @ApiOperation({ summary: 'Health, freshness and usage for configured public data providers' })
  async status(): Promise<object> {
    const result=await this.db.query(`SELECT provider_code AS provider,count(*) FILTER(WHERE request_started_at>=now()-interval '24 hours')::int AS requests_24h,count(*) FILTER(WHERE NOT succeeded AND request_started_at>=now()-interval '24 hours')::int AS failures_24h,max(request_started_at) AS last_attempt_at,max(response_received_at) FILTER(WHERE succeeded) AS last_success_at,(array_agg(http_status ORDER BY request_started_at DESC))[1] AS last_http_status,(array_agg(provider_error_message ORDER BY request_started_at DESC))[1] AS last_error FROM provider_request_events GROUP BY provider_code`);
    const mapped=new Map(result.rows.map((row)=>[row.provider as string,row]));
    const providers=this.registry.all().map(({code,enabled})=>({...mapped.get(code),provider:code,enabled,status:!enabled?'disabled':mapped.get(code)?.last_success_at?'configured':'awaiting_first_sync'}));
    const metrics=await this.db.query<{source_as_of:string|null}>('SELECT max(source_as_of)::text AS source_as_of FROM global_metric_snapshots WHERE source=\'coingecko\'');
    const assets=await this.db.query<{total:number}>('SELECT count(*)::int AS total FROM assets WHERE coingecko_id IS NOT NULL');
    return envelope({providers,data:{globalMarketAsOf:metrics.rows[0]?.source_as_of??null,assetsWithCoinGeckoIdentity:assets.rows[0]?.total??0}});
  }
  @Get('usage') @UseGuards(AdminKeyGuard) @ApiSecurity('admin-key') @ApiOperation({ summary: 'Read provider call counts and configured monthly CoinGecko safety budget' })
  async usage(): Promise<object> {
    const [usage,budget]=await Promise.all([this.db.query(`SELECT provider_code AS provider,count(*)::int AS requests_month,count(*) FILTER(WHERE NOT succeeded)::int AS failures_month,max(response_received_at) FILTER(WHERE succeeded) AS last_success_at FROM provider_request_events WHERE request_started_at>=date_trunc('month',now()) GROUP BY provider_code ORDER BY provider_code`),this.db.query(`SELECT count(*)::int AS coingecko_calls FROM provider_request_events WHERE provider_code='coingecko' AND request_started_at>=date_trunc('month',now())`)]);
    return envelope({providers:usage.rows,coingecko:{used:budget.rows[0]?.coingecko_calls??0,monthlySafetyBudget:Number(process.env.COINGECKO_MONTHLY_CALL_BUDGET??9000)}});
  }
  @Post('ingestion/market') @UseGuards(AdminKeyGuard) @ApiSecurity('admin-key') @ApiOperation({ summary: 'Queue an immediate market and exchange data sync' })
  async ingestMarket(): Promise<object> {
    const job=await this.queue.add(MARKET_JOB,{scheduled:false,requestedAt:new Date().toISOString()},{attempts:2,backoff:{type:'exponential',delay:30000},removeOnComplete:1000,removeOnFail:500});
    return envelope({queued:true,jobId:job.id,state:await job.getState()});
  }
}
