export interface CmcStatus {
  timestamp?: string;
  error_code?: number | string;
  error_message?: string | null;
  elapsed?: number;
  credit_count?: number;
  notice?: string | null;
  total_count?: number;
}

export interface CmcEnvelope<T> { data: T; status?: CmcStatus }

export interface CmcQuote {
  price?: NumericLike;
  volume_24h?: NumericLike;
  market_cap?: NumericLike;
  fully_diluted_market_cap?: NumericLike;
  percent_change_1h?: NumericLike;
  percent_change_24h?: NumericLike;
  percent_change_7d?: NumericLike;
  last_updated?: string | null;
}

export type NumericLike = string | number | { toString(): string } | null;

export interface CmcListing {
  id: number;
  name: string;
  symbol: string;
  slug?: string;
  cmc_rank?: number | null;
  is_active?: number;
  date_added?: string;
  last_updated?: string;
  circulating_supply?: NumericLike;
  total_supply?: NumericLike;
  max_supply?: NumericLike;
  platform?: { id?: number; name?: string; symbol?: string; token_address?: string } | null;
  quote?: Array<{ symbol: string; price?: NumericLike; volume_24h?: NumericLike; market_cap?: NumericLike; fully_diluted_market_cap?: NumericLike; percent_change_1h?: NumericLike; percent_change_24h?: NumericLike; percent_change_7d?: NumericLike; last_updated?: string }>;
}

export interface NormalizedListing {
  cmcId: number;
  name: string;
  symbol: string;
  slug: string | null;
  rank: number | null;
  isActive: boolean;
  platformCmcId: number | null;
  platformName: string | null;
  platformSymbol: string | null;
  contractAddress: string | null;
  sourceUpdatedAt: string | null;
  quoteCurrency: string;
  price: string | null;
  volume24h: string | null;
  marketCap: string | null;
  fullyDilutedMarketCap: string | null;
  circulatingSupply: string | null;
  totalSupply: string | null;
  maxSupply: string | null;
  percentChange1h: string | null;
  percentChange24h: string | null;
  percentChange7d: string | null;
  quoteAsOf: string | null;
}

export interface NormalizedGlobalMetrics {
  quoteCurrency: string;
  totalMarketCap: string | null;
  totalVolume24h: string | null;
  btcDominance: string | null;
  ethDominance: string | null;
  activeCryptocurrencies: number | null;
  totalCryptocurrencies: number | null;
  activeExchanges: number | null;
  activeMarketPairs: number | null;
  sourceAsOf: string | null;
}

export interface CmcKeyInfo {
  plan?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}
