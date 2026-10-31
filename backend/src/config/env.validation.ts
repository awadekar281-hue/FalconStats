export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'REDIS_URL', 'ADMIN_API_KEY'];
  for (const key of required) {
    if (!raw[key] || typeof raw[key] !== 'string') throw new Error(`${key} is required`);
  }
  if (String(raw.ADMIN_API_KEY).trim().length < 32 || String(raw.ADMIN_API_KEY).includes('replace-with-')) {
    throw new Error('ADMIN_API_KEY must be a random secret of at least 32 characters');
  }
  const port = Number(raw.PORT ?? 3001);
  const interval = Number(raw.CMC_INGEST_INTERVAL_SECONDS ?? 300);
  const limit = Number(raw.CMC_LISTINGS_LIMIT ?? 100);
  const timeout = Number(raw.CMC_HTTP_TIMEOUT_MS ?? 10000);
  const cacheTtl = Number(raw.API_CACHE_TTL_SECONDS ?? 30);
  const staleAfter = Number(raw.DATA_STALE_AFTER_SECONDS ?? 900);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  if (!Number.isInteger(interval) || interval < 60) throw new Error('CMC_INGEST_INTERVAL_SECONDS must be at least 60');
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) throw new Error('CMC_LISTINGS_LIMIT must be from 1 to 250');
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120000) throw new Error('CMC_HTTP_TIMEOUT_MS must be from 1000 to 120000');
  if (!Number.isInteger(cacheTtl) || cacheTtl < 1 || cacheTtl > 3600) throw new Error('API_CACHE_TTL_SECONDS must be from 1 to 3600');
  if (!Number.isInteger(staleAfter) || staleAfter < 60) throw new Error('DATA_STALE_AFTER_SECONDS must be at least 60');
  const key = typeof raw.CMC_PRO_API_KEY === 'string' ? raw.CMC_PRO_API_KEY.trim() : '';
  const publicRequested = String(raw.CMC_PUBLIC_API ?? 'true').toLowerCase() === 'true';
  return {
    ...raw,
    PORT: port,
    CMC_INGEST_INTERVAL_SECONDS: interval,
    CMC_LISTINGS_LIMIT: limit,
    CMC_PUBLIC_API: publicRequested && key.length === 0,
    CMC_BASE_URL: String(raw.CMC_BASE_URL ?? 'https://pro-api.coinmarketcap.com').replace(/\/$/, ''),
    CMC_CONVERT: String(raw.CMC_CONVERT ?? 'USD').toUpperCase(),
    CMC_HTTP_TIMEOUT_MS: timeout,
    CMC_KEY_INFO_ENABLED: String(raw.CMC_KEY_INFO_ENABLED ?? 'false').toLowerCase() === 'true',
    API_CACHE_TTL_SECONDS: cacheTtl,
    DATA_STALE_AFTER_SECONDS: staleAfter,
    QUEUE_PREFIX: String(raw.QUEUE_PREFIX ?? 'falconstats'),
  };
}
