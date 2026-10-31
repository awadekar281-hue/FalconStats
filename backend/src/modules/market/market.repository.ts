import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { PgService } from '../database/pg.service';
import type { NormalizedGlobalMetrics } from '../cmc/cmc.types';

@Injectable()
export class MarketRepository {
  constructor(private readonly db: PgService) {}
  async saveGlobalMetrics(metrics: NormalizedGlobalMetrics, client?: PoolClient): Promise<void> {
    const executor = client ?? this.db.pool;
    await executor.query(`INSERT INTO global_metric_snapshots
      (quote_currency,total_market_cap,total_volume_24h,btc_dominance,eth_dominance,active_cryptocurrencies,total_cryptocurrencies,active_exchanges,active_market_pairs,source,source_as_of)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'coinmarketcap',$10) ON CONFLICT (quote_currency,source_as_of) DO NOTHING`,
    [metrics.quoteCurrency, metrics.totalMarketCap, metrics.totalVolume24h, metrics.btcDominance, metrics.ethDominance, metrics.activeCryptocurrencies, metrics.totalCryptocurrencies, metrics.activeExchanges, metrics.activeMarketPairs, metrics.sourceAsOf]);
  }
  async saveAssetSnapshot(assetId: string, listing: { quoteCurrency: string; price: string | null; volume24h: string | null; marketCap: string | null; fullyDilutedMarketCap: string | null; circulatingSupply: string | null; totalSupply: string | null; maxSupply: string | null; percentChange1h: string | null; percentChange24h: string | null; percentChange7d: string | null; quoteAsOf: string | null }): Promise<void> {
    await this.db.query(`INSERT INTO market_snapshots
      (asset_id,quote_currency,price,volume_24h,market_cap,fully_diluted_market_cap,circulating_supply,total_supply,max_supply,percent_change_1h,percent_change_24h,percent_change_7d,source,source_as_of)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'coinmarketcap',$13) ON CONFLICT (asset_id,quote_currency,source_as_of) DO NOTHING`,
    [assetId, listing.quoteCurrency, listing.price, listing.volume24h, listing.marketCap, listing.fullyDilutedMarketCap, listing.circulatingSupply, listing.totalSupply, listing.maxSupply, listing.percentChange1h, listing.percentChange24h, listing.percentChange7d, listing.quoteAsOf]);
  }
  async latestGlobalMetrics(currency: string): Promise<Record<string, unknown> | null> {
    const result = await this.db.query(`SELECT quote_currency,total_market_cap,total_volume_24h,btc_dominance,eth_dominance,active_cryptocurrencies,total_cryptocurrencies,active_exchanges,active_market_pairs,source,source_as_of,received_at
      FROM global_metric_snapshots WHERE quote_currency=$1 ORDER BY source_as_of DESC NULLS LAST,received_at DESC LIMIT 1`, [currency.toUpperCase()]);
    return result.rows[0] ?? null;
  }
}
