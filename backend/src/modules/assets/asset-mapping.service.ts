import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

@Injectable()
export class AssetMappingService {
  async upsertFromCoinGecko(client: PoolClient, asset: { id: string; name: string; symbol: string; image?: string; rank?: number | null; sourceUpdatedAt?: string | null }): Promise<string> {
    const result = await client.query<{ id: string }>(`INSERT INTO assets (name,symbol,slug,rank,is_active,coingecko_id,image_url,source_updated_at,updated_at)
      VALUES ($1,$2,$3,$4,true,$5,$6,$7,now()) ON CONFLICT (coingecko_id) WHERE coingecko_id IS NOT NULL DO UPDATE
      SET name=EXCLUDED.name,symbol=EXCLUDED.symbol,slug=EXCLUDED.slug,rank=EXCLUDED.rank,image_url=EXCLUDED.image_url,source_updated_at=EXCLUDED.source_updated_at,updated_at=now() RETURNING id`,
    [asset.name,asset.symbol.toUpperCase(),asset.id,asset.rank ?? null,asset.id,asset.image ?? null,asset.sourceUpdatedAt ?? null]);
    const internalId = result.rows[0].id;
    await client.query(`INSERT INTO asset_identifiers(asset_id,provider_code,identifier_type,identifier_value,normalized_value)
      VALUES($1,'coingecko','coin_id',$2,lower($2)) ON CONFLICT(provider_code,identifier_type,normalized_value) DO UPDATE SET asset_id=EXCLUDED.asset_id`,[internalId,asset.id]);
    return internalId;
  }
}
