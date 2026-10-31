import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgService } from '../database/pg.service';
import { CmcClient } from '../cmc/cmc.client';
import { normalizeGlobalMetrics, normalizeListings } from '../cmc/cmc-normalizer';
import { AssetMappingService } from '../assets/asset-mapping.service';
import { MarketRepository } from '../market/market.repository';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MarketIngestionService {
  private readonly logger = new Logger(MarketIngestionService.name);
  constructor(private readonly config: ConfigService, private readonly cmc: CmcClient, private readonly db: PgService, private readonly assetMapping: AssetMappingService, private readonly market: MarketRepository, private readonly cache: CacheService) {}
  async ingest(): Promise<{ assetsReceived: number; snapshotsWritten: number; globalMetricWritten: boolean; source: string; accessMode: string }> {
    const currency = this.config.get<string>('CMC_CONVERT') ?? 'USD';
    const limit = this.config.get<number>('CMC_LISTINGS_LIMIT') ?? 100;
    const [listingsResponse, globalResponse] = await Promise.all([this.cmc.getListings(1, limit, currency), this.cmc.getGlobalMetrics(currency)]);
    const listings = normalizeListings(listingsResponse, currency);
    const metrics = normalizeGlobalMetrics(globalResponse, currency);
    await this.db.transaction(async (client) => {
      for (const listing of listings) {
        const assetId = await this.assetMapping.upsertFromCmc(client, listing);
        await client.query(`INSERT INTO market_snapshots
          (asset_id,quote_currency,price,volume_24h,market_cap,fully_diluted_market_cap,circulating_supply,total_supply,max_supply,percent_change_1h,percent_change_24h,percent_change_7d,source,source_as_of)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'coinmarketcap',$13)
          ON CONFLICT (asset_id,quote_currency,source_as_of) DO NOTHING`,
        [assetId, listing.quoteCurrency, listing.price, listing.volume24h, listing.marketCap, listing.fullyDilutedMarketCap, listing.circulatingSupply, listing.totalSupply, listing.maxSupply, listing.percentChange1h, listing.percentChange24h, listing.percentChange7d, listing.quoteAsOf]);
      }
      await this.market.saveGlobalMetrics(metrics, client);
    });
    await this.cache.deleteByPrefix('api:market:');
    this.logger.log(`Stored ${listings.length} CMC assets and global metrics (${this.cmc.accessMode} access)`);
    return { assetsReceived: listings.length, snapshotsWritten: listings.length, globalMetricWritten: true, source: 'coinmarketcap', accessMode: this.cmc.accessMode };
  }
}
