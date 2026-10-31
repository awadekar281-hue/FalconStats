export interface ApiMeta {
  requestId: string;
  generatedAt: string;
  source?: string;
  asOf?: string | null;
  freshness?: 'fresh' | 'stale' | 'unavailable';
}

export interface ApiEnvelope<T> { data: T; meta: ApiMeta }
export interface PageData<T> { items: T[]; pagination: { limit: number; offset: number; total: number } }
export interface Asset {
  id: string; coingecko_id: string; image_url?: string | null; name: string; symbol: string; slug: string | null; rank: number | null;
  platform_name?: string | null; contract_address?: string | null; quote_currency: string | null;
  price: string | null; volume_24h: string | null; market_cap: string | null; percent_change_1h: string | null;
  percent_change_24h: string | null; percent_change_7d: string | null; source: string | null; source_as_of: string | null;
}
export interface GlobalMetrics {
  quote_currency: string; total_market_cap: string | null; total_volume_24h: string | null;
  btc_dominance: string | null; eth_dominance: string | null; active_cryptocurrencies: number | null;
  total_cryptocurrencies: number | null; active_exchanges: number | null; active_market_pairs: number | null;
  source: string; source_as_of: string | null; received_at: string;
}
export interface ProviderStatus {
  providers: Array<{provider:string;enabled:boolean;status:string;requests_24h?:number;failures_24h?:number;last_attempt_at?:string|null;last_success_at?:string|null;last_http_status?:number|null;last_error?:string|null}>;
  data: {globalMarketAsOf:string|null;assetsWithCoinGeckoIdentity:number};
}
