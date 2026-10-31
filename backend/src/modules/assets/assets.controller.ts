import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { envelope, classifyFreshness } from '../../common/api-envelope';
import { AssetRepository } from './asset.repository';
import { PgService } from '../database/pg.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { CacheService } from '../cache/cache.service';
import { normalizeCoinGeckoHistory } from '../providers/provider-normalizers';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetRepository, private readonly config: ConfigService, private readonly db: PgService, private readonly providers:ProviderRegistryService, private readonly cache:CacheService) {}
  @Get() @ApiOperation({ summary: 'List canonical assets with their latest stored market snapshot' }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'offset', required: false }) @ApiQuery({ name: 'search', required: false })
  async list(@Req() req: Request, @Query('limit') rawLimit?: string, @Query('offset') rawOffset?: string, @Query('search') search?: string): Promise<object> {
    const limit = rawLimit === undefined ? 50 : Number(rawLimit); const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 250 || !Number.isInteger(offset) || offset < 0) throw new BadRequestException('limit must be 1-250 and offset must be non-negative');
    const result = await this.assets.list({ limit, offset, search });
    const asOf = result.rows.find((row) => row.source_as_of)?.source_as_of as string | undefined;
    return envelope({ items: result.rows, pagination: { limit, offset, total: result.total } }, { requestId: req.headers['x-request-id'] as string | undefined, source: 'coingecko', asOf: asOf ?? null, freshness: classifyFreshness(asOf, this.config.get<number>('DATA_STALE_AFTER_SECONDS') ?? 3600) });
  }
  @Get(':assetId/markets') @ApiOperation({ summary: 'Get provider-specific exchange quotes mapped to this canonical asset' })
  async markets(@Param('assetId') id:string):Promise<object>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new BadRequestException('assetId must be a UUID');const r=await this.db.query(`SELECT DISTINCT ON(q.exchange_code,q.symbol,q.market_type) q.exchange_code,q.symbol,q.base_asset,q.quote_asset,q.market_type,q.price,q.volume_24h,q.change_24h,q.source_as_of,q.received_at FROM exchange_quotes q WHERE q.asset_id=$1 ORDER BY q.exchange_code,q.symbol,q.market_type,q.source_as_of DESC`,[id]);return envelope({items:r.rows,quoteCurrencyNote:'Exchange quotes retain their original quote currency and are not global reference prices.'},{source:'binance,bybit',asOf:r.rows[0]?.source_as_of??null});}
  @Get(':assetId/ohlcv') @ApiOperation({ summary: 'Report OHLCV history availability for a canonical asset' })
  async ohlcv(@Param('assetId') id:string):Promise<object>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new BadRequestException('assetId must be a UUID');return envelope({status:'UNSUPPORTED',items:[],reason:'Historical OHLCV sync is not enabled yet. No chart points are generated from price-change summaries.'},{freshness:'unavailable'});}
  @Get(':assetId/history') @ApiOperation({ summary: 'Report historical series availability for a canonical asset' })
  async history(@Param('assetId') id:string,@Query('days') rawDays='7'):Promise<object>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new BadRequestException('assetId must be a UUID');
    const days=Number(rawDays);if(!Number.isInteger(days)||days<1||days>30)throw new BadRequestException('days must be between 1 and 30 for the current free provider integration');
    const asset=await this.assets.getById(id);if(!asset)throw new NotFoundException('Asset not found');const coinId=asset.coingecko_id;if(typeof coinId!=='string')return envelope({status:'UNAVAILABLE',items:[],reason:'This asset has no CoinGecko identity mapping.'},{freshness:'unavailable'});
    return this.cache.getOrLoad(`api:asset:history:${id}:${days}`,3600,async()=>{
      const prior=await this.db.query(`SELECT source_as_of,price,market_cap,total_volume FROM historical_price_snapshots WHERE asset_id=$1 AND quote_currency='USD' AND source='coingecko' AND source_as_of>=now()-($2::int*interval '1 day') ORDER BY source_as_of`,[id,days]);
      const priorLatest=prior.rows.at(-1);
      if(priorLatest&&Date.now()-new Date(String(priorLatest.source_as_of)).getTime()<60*60*1000)return envelope({status:'AVAILABLE',days,items:prior.rows},{source:'coingecko',asOf:priorLatest.source_as_of as string,freshness:'fresh'});
      try{
        const raw=await this.providers.coingecko.history!(coinId,days);const points=normalizeCoinGeckoHistory(raw);
        await this.db.transaction(async(client)=>{for(const point of points)await client.query(`INSERT INTO historical_price_snapshots(asset_id,quote_currency,price,market_cap,total_volume,source,source_as_of) VALUES($1,'USD',$2,$3,$4,'coingecko',$5) ON CONFLICT(asset_id,quote_currency,source,source_as_of) DO UPDATE SET price=EXCLUDED.price,market_cap=EXCLUDED.market_cap,total_volume=EXCLUDED.total_volume`,[id,point.price,point.marketCap,point.totalVolume,point.sourceAsOf]);});
        const saved=await this.db.query(`SELECT source_as_of,price,market_cap,total_volume FROM historical_price_snapshots WHERE asset_id=$1 AND quote_currency='USD' AND source='coingecko' AND source_as_of>=now()-($2::int*interval '1 day') ORDER BY source_as_of`,[id,days]);
        return envelope({status:'AVAILABLE',days,items:saved.rows},{source:'coingecko',asOf:saved.rows.at(-1)?.source_as_of as string|null??null,freshness:saved.rows.length?'fresh':'unavailable'});
      }catch(error){if(prior.rows.length)return envelope({status:'STALE',days,reason:'CoinGecko history is temporarily unavailable; showing the last stored series.',items:prior.rows},{source:'coingecko',asOf:prior.rows.at(-1)?.source_as_of as string,freshness:'stale'});return envelope({status:'UNAVAILABLE',days,reason:`CoinGecko history is temporarily unavailable: ${(error as Error).message}`,items:[]},{source:'coingecko',freshness:'unavailable'});}
    });
  }
  @Get(':assetId') @ApiOperation({ summary: 'Get an asset by FalconStats UUID' })
  async get(@Req() req: Request, @Param('assetId') id: string): Promise<object> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('assetId must be a UUID');
    const asset = await this.assets.getById(id); if (!asset) throw new NotFoundException('Asset not found');
    return envelope(asset, { requestId: String(req.headers['x-request-id'] ?? ''), source: 'coingecko', asOf: asset.source_as_of as string | null, freshness: classifyFreshness(asset.source_as_of as string | null, this.config.get<number>('DATA_STALE_AFTER_SECONDS') ?? 3600) });
  }
}
