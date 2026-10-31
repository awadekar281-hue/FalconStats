import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_REDIS } from './cache.constants';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(CACHE_REDIS) private readonly redis: Redis) {}
  async onModuleInit(): Promise<void> { try { await this.redis.connect(); } catch { /* Health endpoint reports unavailable; DB-backed reads continue. */ } }
  async onModuleDestroy(): Promise<void> { if (this.redis.status !== 'end') await this.redis.quit(); }
  async get<T>(key: string): Promise<T | null> {
    try { const value = await this.redis.get(key); return value ? JSON.parse(value) as T : null; } catch { return null; }
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try { await this.redis.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSeconds)); } catch { /* Cache failure must not hide database data. */ }
  }
  async getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }
  async ping(): Promise<void> { await this.redis.ping(); }
  async deleteByPrefix(prefix: string): Promise<void> {
    try { const stream = this.redis.scanStream({ match: `${prefix}*`, count: 100 }); for await (const keys of stream) { if (keys.length) await this.redis.del(...keys); } } catch { /* Best effort cache invalidation. */ }
  }
}
