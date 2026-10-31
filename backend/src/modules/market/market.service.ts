import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { AssetRepository } from '../assets/asset.repository';
import { MarketRepository } from './market.repository';

@Injectable()
export class MarketService {
  constructor(private readonly cache: CacheService, private readonly assets: AssetRepository, private readonly market: MarketRepository, private readonly config: ConfigService) {}
  async listings(limit: number, offset: number, search?: string) {
    const key = `api:market:listings:${limit}:${offset}:${search?.trim().toLowerCase() ?? ''}`;
    return this.cache.getOrLoad(key, this.config.get<number>('API_CACHE_TTL_SECONDS') ?? 30, () => this.assets.list({ limit, offset, search }));
  }
  async global(currency: string) {
    const normalized = currency.toUpperCase();
    return this.cache.getOrLoad(`api:market:global:${normalized}`, this.config.get<number>('API_CACHE_TTL_SECONDS') ?? 30, () => this.market.latestGlobalMetrics(normalized));
  }
}
