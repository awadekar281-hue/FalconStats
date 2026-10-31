import { Injectable } from '@nestjs/common';
import { PgService } from '../database/pg.service';

@Injectable()
export class AssetRepository {
  constructor(private readonly db: PgService) {}
  async list(input: { limit: number; offset: number; search?: string }): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const term = input.search?.trim() || null;
    const values = [term, input.limit, input.offset];
    const result = await this.db.query(`SELECT a.id, a.cmc_id, a.name, a.symbol, a.slug, a.rank, a.platform_name, a.contract_address,
      s.quote_currency, s.price, s.volume_24h, s.market_cap, s.fully_diluted_market_cap, s.circulating_supply, s.total_supply, s.max_supply,
      s.percent_change_1h, s.percent_change_24h, s.percent_change_7d, s.source, s.source_as_of
      FROM assets a LEFT JOIN LATERAL (SELECT * FROM market_snapshots ms WHERE ms.asset_id=a.id ORDER BY source_as_of DESC NULLS LAST LIMIT 1) s ON true
      WHERE $1::text IS NULL OR a.name ILIKE '%' || $1 || '%' OR a.symbol ILIKE '%' || $1 || '%'
      ORDER BY a.rank NULLS LAST, a.name LIMIT $2 OFFSET $3`, values);
    const count = await this.db.query<{ count: string }>(`SELECT count(*)::text AS count FROM assets WHERE $1::text IS NULL OR name ILIKE '%' || $1 || '%' OR symbol ILIKE '%' || $1 || '%'`, [term]);
    return { rows: result.rows, total: Number(count.rows[0].count) };
  }
  async getById(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.db.query(`SELECT a.id, a.cmc_id, a.name, a.symbol, a.slug, a.rank, a.platform_cmc_id, a.platform_name, a.platform_symbol, a.contract_address, a.source_updated_at,
      s.quote_currency, s.price, s.volume_24h, s.market_cap, s.fully_diluted_market_cap, s.circulating_supply, s.total_supply, s.max_supply,
      s.percent_change_1h, s.percent_change_24h, s.percent_change_7d, s.source, s.source_as_of
      FROM assets a LEFT JOIN LATERAL (SELECT * FROM market_snapshots ms WHERE ms.asset_id=a.id ORDER BY source_as_of DESC NULLS LAST LIMIT 1) s ON true WHERE a.id=$1`, [id]);
    return result.rows[0] ?? null;
  }
}
