import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { NormalizedListing } from '../cmc/cmc.types';

@Injectable()
export class AssetMappingService {
  async upsertFromCmc(client: PoolClient, asset: NormalizedListing): Promise<string> {
    const result = await client.query<{ id: string }>(`INSERT INTO assets
      (cmc_id, name, symbol, slug, rank, is_active, platform_cmc_id, platform_name, platform_symbol, contract_address, source_updated_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
      ON CONFLICT (cmc_id) DO UPDATE SET name=EXCLUDED.name, symbol=EXCLUDED.symbol, slug=EXCLUDED.slug, rank=EXCLUDED.rank,
      is_active=EXCLUDED.is_active, platform_cmc_id=EXCLUDED.platform_cmc_id, platform_name=EXCLUDED.platform_name,
      platform_symbol=EXCLUDED.platform_symbol, contract_address=EXCLUDED.contract_address,
      source_updated_at=EXCLUDED.source_updated_at, updated_at=now() RETURNING id`,
    [asset.cmcId, asset.name, asset.symbol, asset.slug, asset.rank, asset.isActive, asset.platformCmcId, asset.platformName, asset.platformSymbol, asset.contractAddress, asset.sourceUpdatedAt]);
    const id = result.rows[0].id;
    await client.query(`INSERT INTO asset_identifiers (asset_id, provider_code, identifier_type, identifier_value, normalized_value)
      VALUES ($1,'coinmarketcap','cmc_id',$2,$2)
      ON CONFLICT (provider_code, identifier_type, normalized_value) DO UPDATE SET asset_id=EXCLUDED.asset_id`, [id, String(asset.cmcId)]);
    if (asset.slug) await client.query(`INSERT INTO asset_identifiers (asset_id, provider_code, identifier_type, identifier_value, normalized_value)
      VALUES ($1,'coinmarketcap','slug',$2,lower($2))
      ON CONFLICT (provider_code, identifier_type, normalized_value) DO UPDATE SET asset_id=EXCLUDED.asset_id`, [id, asset.slug]);
    if (asset.contractAddress && asset.platformCmcId) {
      const contract = `${asset.platformCmcId}:${asset.contractAddress}`;
      await client.query(`INSERT INTO asset_identifiers (asset_id, provider_code, identifier_type, identifier_value, normalized_value)
        VALUES ($1,'coinmarketcap','contract_address',$2,lower($2))
        ON CONFLICT (provider_code, identifier_type, normalized_value) DO UPDATE SET asset_id=EXCLUDED.asset_id`, [id, contract]);
    }
    return id;
  }
  async resolveContract(client: PoolClient, platformCmcId: number, contractAddress: string): Promise<string | null> {
    const key = `${platformCmcId}:${contractAddress.trim().toLowerCase()}`;
    const result = await client.query<{ asset_id: string }>(`SELECT asset_id FROM asset_identifiers WHERE provider_code='coinmarketcap' AND identifier_type='contract_address' AND normalized_value=$1`, [key]);
    return result.rows[0]?.asset_id ?? null;
  }
}
