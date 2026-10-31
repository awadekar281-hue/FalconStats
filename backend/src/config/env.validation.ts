export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'REDIS_URL', 'ADMIN_API_KEY'];
  for (const key of required) {
    if (!raw[key] || typeof raw[key] !== 'string') throw new Error(`${key} is required`);
  }
  if (String(raw.ADMIN_API_KEY).trim().length < 32 || String(raw.ADMIN_API_KEY).includes('replace-with-')) {
    throw new Error('ADMIN_API_KEY must be a random secret of at least 32 characters');
  }
  const port = Number(raw.PORT ?? 3001);
  const interval = Number(raw.MARKET_INGEST_INTERVAL_SECONDS ?? 900);
  const globalInterval = Number(raw.GLOBAL_METRICS_REFRESH_SECONDS ?? 1800);
  const limit = Number(raw.COINGECKO_MARKET_PAGE_SIZE ?? 250);
  const timeout = Number(raw.PROVIDER_HTTP_TIMEOUT_MS ?? 15000);
  const monthlyBudget = Number(raw.COINGECKO_MONTHLY_CALL_BUDGET ?? 9000);
  const cacheTtl = Number(raw.API_CACHE_TTL_SECONDS ?? 30);
  const staleAfter = Number(raw.DATA_STALE_AFTER_SECONDS ?? 900);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  if (!Number.isInteger(interval) || interval < 900) throw new Error('MARKET_INGEST_INTERVAL_SECONDS must be at least 900 (15 minutes) to protect free provider quotas');
  if (!Number.isInteger(globalInterval) || globalInterval < 1800) throw new Error('GLOBAL_METRICS_REFRESH_SECONDS must be at least 1800 (30 minutes)');
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) throw new Error('COINGECKO_MARKET_PAGE_SIZE must be from 1 to 250');
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120000) throw new Error('PROVIDER_HTTP_TIMEOUT_MS must be from 1000 to 120000');
  if (!Number.isInteger(monthlyBudget) || monthlyBudget < 1 || monthlyBudget > 9000) throw new Error('COINGECKO_MONTHLY_CALL_BUDGET must be from 1 to 9000');
  if (!Number.isInteger(cacheTtl) || cacheTtl < 1 || cacheTtl > 3600) throw new Error('API_CACHE_TTL_SECONDS must be from 1 to 3600');
  if (!Number.isInteger(staleAfter) || staleAfter < 60) throw new Error('DATA_STALE_AFTER_SECONDS must be at least 60');
  return {
    ...raw,
    PORT: port,
    MARKET_INGEST_INTERVAL_SECONDS: interval,
    GLOBAL_METRICS_REFRESH_SECONDS: globalInterval,
    COINGECKO_MARKET_PAGE_SIZE: limit,
    COINGECKO_MONTHLY_CALL_BUDGET: monthlyBudget,
    COINGECKO_DEMO_API_KEY: typeof raw.COINGECKO_DEMO_API_KEY === 'string' ? raw.COINGECKO_DEMO_API_KEY.trim() : '',
    PROVIDER_HTTP_TIMEOUT_MS: timeout,
    MARKET_QUOTE_CURRENCY: 'usd',
    API_CACHE_TTL_SECONDS: cacheTtl,
    DATA_STALE_AFTER_SECONDS: staleAfter,
    QUEUE_PREFIX: String(raw.QUEUE_PREFIX ?? 'falconstats'),
  };
}
