import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgService } from '../database/pg.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { AssetMappingService } from '../assets/asset-mapping.service';
import { MarketRepository } from '../market/market.repository';
import { CacheService } from '../cache/cache.service';
import { normalizeCoinGeckoGlobal, normalizeCoinGeckoMarkets, ratioToPercent } from '../providers/provider-normalizers';
import type { NormalizedCoinGeckoMarket } from '../providers/provider-normalizers';

type RecordValue = Record<string, unknown>;
const asObject = (value: unknown): RecordValue => value && typeof value === 'object' ? value as RecordValue : {};
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const decimal = (value: unknown): string | null => value === null || value === undefined || value === '' ? null : String(value);
const num = (value: unknown): number | null => { const n = Number(value); return Number.isFinite(n) ? n : null; };
const iso = (value: unknown, fallback = new Date()): string => {
  const n = Number(value);
  const d = value instanceof Date ? value : typeof value === 'number' || (typeof value === 'string' && /^\d{10,13}$/.test(value)) ? new Date(n < 10_000_000_000 ? n * 1000 : n) : new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
};

// Explicit provider identity and trading pair mappings avoid ticker-only asset joins.
const PAIRS: Record<string, { id: string; base: string; quote: string }[]> = {
  BTC: [{id:'bitcoin',base:'BTC',quote:'USDT'}], ETH:[{id:'ethereum',base:'ETH',quote:'USDT'}], SOL:[{id:'solana',base:'SOL',quote:'USDT'}],
  BNB:[{id:'binancecoin',base:'BNB',quote:'USDT'}], XRP:[{id:'ripple',base:'XRP',quote:'USDT'}], ADA:[{id:'cardano',base:'ADA',quote:'USDT'}],
  DOGE:[{id:'dogecoin',base:'DOGE',quote:'USDT'}], TRX:[{id:'tron',base:'TRX',quote:'USDT'}], TON:[{id:'the-open-network',base:'TON',quote:'USDT'}],
  AVAX:[{id:'avalanche-2',base:'AVAX',quote:'USDT'}], LINK:[{id:'chainlink',base:'LINK',quote:'USDT'}], DOT:[{id:'polkadot',base:'DOT',quote:'USDT'}],
};
const mappedAssets = new Map(Object.values(PAIRS).flat().map((pair) => [pair.base, pair.id]));

@Injectable()
export class MarketIngestionService {
  private readonly logger = new Logger(MarketIngestionService.name);
  constructor(private readonly config: ConfigService, private readonly providers: ProviderRegistryService, private readonly db: PgService, private readonly assetMapping: AssetMappingService, private readonly market: MarketRepository, private readonly cache: CacheService) {}

  async ingest(): Promise<Record<string, unknown>> {
    const limit = this.config.get<number>('COINGECKO_MARKET_PAGE_SIZE') ?? 250;
    const latestGlobal=await this.db.query<{source_as_of:string|null}>(`SELECT max(source_as_of)::text AS source_as_of FROM global_metric_snapshots WHERE source='coingecko' AND quote_currency='USD'`);
    const refreshGlobal=!latestGlobal.rows[0]?.source_as_of||Date.now()-new Date(latestGlobal.rows[0].source_as_of).getTime()>=(this.config.get<number>('GLOBAL_METRICS_REFRESH_SECONDS')??1800)*1000;
    const [globalResult,pageResult,binanceResult,bybitResult,bybitSpotResult] = await Promise.allSettled([refreshGlobal?this.providers.coingecko.globalMetrics!():Promise.resolve(null),this.providers.coingecko.listings!(limit,1),this.providers.binance.spotTickers(),this.providers.bybit.linearTickers(),this.providers.bybit.spotTickers()]);
    const now = new Date().toISOString();
    let listings:NormalizedCoinGeckoMarket[]=[];
    if(globalResult.status==='fulfilled'&&globalResult.value!==null){
      const globalData=asObject(asObject(globalResult.value).data);const normalizedMetrics=normalizeCoinGeckoGlobal(globalResult.value);
      const metrics={...normalizedMetrics,totalCryptocurrencies:null,activeMarketPairs:null,sourceAsOf:normalizedMetrics.sourceAsOf??(globalData.updated_at?iso(globalData.updated_at):now)};
      await this.market.saveGlobalMetrics(metrics,undefined,'coingecko');
    }
    if(pageResult.status==='fulfilled'){
      const pages=[asArray(pageResult.value)];if(pages[0].length===limit){const second=await Promise.allSettled([this.providers.coingecko.listings!(limit,2)]);if(second[0].status==='fulfilled')pages.push(asArray(second[0].value));}
      listings=normalizeCoinGeckoMarkets(pages.flat());
      await this.db.transaction(async(client)=>{
        for(const listing of listings){
          const assetId=await this.assetMapping.upsertFromCoinGecko(client,{id:listing.id,name:listing.name,symbol:listing.symbol,image:listing.image??undefined,rank:listing.rank,sourceUpdatedAt:listing.sourceAsOf});
          await client.query(`INSERT INTO market_snapshots(asset_id,quote_currency,price,volume_24h,market_cap,fully_diluted_market_cap,circulating_supply,total_supply,max_supply,percent_change_1h,percent_change_24h,percent_change_7d,source,source_as_of) VALUES($1,'USD',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'coingecko',$12) ON CONFLICT(asset_id,quote_currency,source_as_of) DO NOTHING`,[assetId,listing.price,listing.volume24h,listing.marketCap,listing.fdv,listing.circulatingSupply,listing.totalSupply,listing.maxSupply,listing.change1h,listing.change24h,listing.change7d,listing.sourceAsOf??now]);
        }
      });
    }
    let binanceWritten = 0; let bybitWritten = 0; let bybitSpotWritten=0;
    if (binanceResult.status === 'fulfilled') binanceWritten = await this.storeBinance(asArray(binanceResult.value));
    if (bybitResult.status === 'fulfilled') {const response=asObject(bybitResult.value);bybitWritten=await this.storeBybit(asArray(asObject(response.result).list),response.time,'linear');}
    if (bybitSpotResult.status === 'fulfilled') {const response=asObject(bybitSpotResult.value);bybitSpotWritten=await this.storeBybit(asArray(asObject(response.result).list),response.time,'spot');}
    try { await this.syncDefiIfDue(); } catch (error) { this.logger.warn(`DeFiLlama sync failed; existing snapshots retained: ${(error as Error).message}`); }
    await this.cache.deleteByPrefix('api:market:');
    this.logger.log(`Ingested ${listings.length} CoinGecko assets, ${binanceWritten} Binance quotes, ${bybitSpotWritten} Bybit spot quotes, ${bybitWritten} Bybit derivatives`);
    return { assetsReceived:listings.length,source:globalResult.status==='rejected'?'coingecko_partial':'coingecko',globalMetricsAttempted:refreshGlobal,coingeckoError:globalResult.status==='rejected'?String(globalResult.reason):null,binanceQuotes:binanceWritten,bybitSpotQuotes:bybitSpotWritten,bybitLinearQuotes:bybitWritten,exchangeFailures:[binanceResult,bybitResult,bybitSpotResult].filter((v)=>v.status==='rejected').map((v)=>String(v.reason)),asOf:now };
  }

  private async storeBinance(tickers: unknown[]): Promise<number> {
    let written=0;
    await this.db.transaction(async (client)=>{
      for(const raw of tickers){const t=asObject(raw);const symbol=String(t.symbol??'');const match=/^([A-Z0-9]+)(USDT|USDC|FDUSD|BTC|ETH)$/.exec(symbol);if(!match||!mappedAssets.has(match[1]))continue;
        const base=match[1],quote=match[2],asOf=iso(t.closeTime??t.openTime);const idResult=await client.query<{id:string}>(`SELECT id FROM assets WHERE coingecko_id=$1`,[mappedAssets.get(base)]);const assetId=idResult.rows[0]?.id??null;
        await client.query(`INSERT INTO exchange_quotes(asset_id,exchange_code,symbol,base_asset,quote_asset,market_type,price,volume_24h,change_24h,source_as_of) VALUES($1,'binance',$2,$3,$4,'spot',$5,$6,$7,$8) ON CONFLICT(exchange_code,symbol,market_type,source_as_of) DO NOTHING`,[assetId,symbol,base,quote,decimal(t.lastPrice),decimal(t.quoteVolume),decimal(t.priceChangePercent),asOf]);written++;
      }
    });return written;
  }

  private async storeBybit(tickers: unknown[], sourceTime?:unknown, marketType:'spot'|'linear'='linear'): Promise<number> {
    let written=0;const received=Date.now();
    await this.db.transaction(async(client)=>{
      for(const raw of tickers){const t=asObject(raw);const symbol=String(t.symbol??'');const m=/^([A-Z0-9]+)(USDT|USDC)$/.exec(symbol);if(!m||!mappedAssets.has(m[1]))continue;
        const base=m[1],quote=m[2],asOf=iso(sourceTime??t.time??received);const assetResult=await client.query<{id:string}>(`SELECT id FROM assets WHERE coingecko_id=$1`,[mappedAssets.get(base)]);const assetId=assetResult.rows[0]?.id??null;
        await client.query(`INSERT INTO exchange_quotes(asset_id,exchange_code,symbol,base_asset,quote_asset,market_type,price,volume_24h,change_24h,source_as_of) VALUES($1,'bybit',$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(exchange_code,symbol,market_type,source_as_of) DO NOTHING`,[assetId,symbol,base,quote,marketType,decimal(t.lastPrice),decimal(t.turnover24h),ratioToPercent(t.price24hPcnt),asOf]);
        if(marketType==='spot'){written++;continue;}
        const instrument=await client.query<{id:string}>(`INSERT INTO derivatives_instruments(exchange_code,symbol,base_asset,quote_asset,contract_type,funding_interval_minutes,status) VALUES('bybit',$1,$2,$3,'linear_perpetual',NULL,'Trading') ON CONFLICT(exchange_code,symbol,contract_type) DO UPDATE SET updated_at=now() RETURNING id`,[symbol,base,quote]);
        const instrumentId=instrument.rows[0].id;
        const openInterest=decimal(t.openInterest);if(openInterest!==null) await client.query(`INSERT INTO open_interest_snapshots(instrument_id,open_interest,unit,source_as_of) VALUES($1,$2,$3,$4) ON CONFLICT(instrument_id,source_as_of) DO NOTHING`,[instrumentId,openInterest,base,asOf]);
        const fundingRate=decimal(t.fundingRate);if(fundingRate!==null) await client.query(`INSERT INTO funding_rate_snapshots(instrument_id,funding_rate,funding_at,next_funding_at,source_as_of) VALUES($1,$2,NULL,$3,$4) ON CONFLICT(instrument_id,source_as_of) DO NOTHING`,[instrumentId,fundingRate,t.nextFundingTime?iso(t.nextFundingTime):null,asOf]);
        written++;
      }
    });return written;
  }

  private async syncDefiIfDue(): Promise<void> {
    const prior=await this.db.query<{last_success:string|null}>(`SELECT max(response_received_at)::text AS last_success FROM provider_request_events WHERE provider_code='defillama' AND succeeded`);
    if(prior.rows[0]?.last_success&&Date.now()-new Date(prior.rows[0].last_success).getTime()<6*60*60*1000)return;
    const [protocols,chains]=await Promise.all([this.providers.defillama.protocols(),this.providers.defillama.chains()]);const at=new Date().toISOString();
    await this.db.transaction(async(client)=>{
      for(const raw of asArray(protocols).slice(0,500)){const p=asObject(raw);if(typeof p.slug!=='string'||typeof p.name!=='string')continue;
        await client.query(`INSERT INTO defi_protocols(id,name,category,chains,tvl,url,source_as_of,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,chains=EXCLUDED.chains,tvl=EXCLUDED.tvl,url=EXCLUDED.url,source_as_of=EXCLUDED.source_as_of,updated_at=now()`,[p.slug,p.name,typeof p.category==='string'?p.category:null,Array.isArray(p.chains)?p.chains:[],decimal(p.tvl),typeof p.url==='string'?p.url:null,at]);
      }
      for(const raw of asArray(chains)){const c=asObject(raw);if(typeof c.name!=='string'||decimal(c.tvl)===null)continue;await client.query(`INSERT INTO defi_chain_tvl(chain,tvl,source_as_of,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(chain) DO UPDATE SET tvl=EXCLUDED.tvl,source_as_of=EXCLUDED.source_as_of,updated_at=now()`,[c.name,decimal(c.tvl),at]);}
    });
  }
}
