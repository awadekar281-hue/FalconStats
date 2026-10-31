import type { CmcEnvelope, CmcKeyInfo, CmcListing, NormalizedGlobalMetrics, NormalizedListing, NumericLike } from './cmc.types';

function decimalOrNull(value: NumericLike | unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const text = typeof value === 'number' || typeof value === 'string' ? String(value) : String((value as { toString(): string }).toString());
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) return null;
  return text;
}

function integerOrNull(value: unknown): number | null {
  const text = decimalOrNull(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function firstQuote(listing: CmcListing, currency: string) {
  return listing.quote?.find((quote) => quote.symbol.toUpperCase() === currency.toUpperCase()) ?? null;
}

export function normalizeListings(envelope: CmcEnvelope<CmcListing[]>, currency = 'USD'): NormalizedListing[] {
  if (!Array.isArray(envelope.data)) throw new Error('CoinMarketCap listings data must be an array');
  return envelope.data.map((listing) => {
    if (!Number.isInteger(Number(listing.id)) || !listing.name || !listing.symbol) throw new Error('CoinMarketCap listing is missing stable identity fields');
    const quote = firstQuote(listing, currency);
    return {
      cmcId: Number(listing.id), name: listing.name, symbol: listing.symbol.toUpperCase(), slug: listing.slug ?? null,
      rank: integerOrNull(listing.cmc_rank), isActive: listing.is_active !== 0,
      platformCmcId: integerOrNull(listing.platform?.id), platformName: listing.platform?.name ?? null,
      platformSymbol: listing.platform?.symbol ?? null, contractAddress: listing.platform?.token_address ?? null,
      sourceUpdatedAt: listing.last_updated ?? null, quoteCurrency: currency.toUpperCase(),
      price: decimalOrNull(quote?.price), volume24h: decimalOrNull(quote?.volume_24h), marketCap: decimalOrNull(quote?.market_cap),
      fullyDilutedMarketCap: decimalOrNull(quote?.fully_diluted_market_cap), circulatingSupply: decimalOrNull(listing.circulating_supply),
      totalSupply: decimalOrNull(listing.total_supply), maxSupply: decimalOrNull(listing.max_supply),
      percentChange1h: decimalOrNull(quote?.percent_change_1h), percentChange24h: decimalOrNull(quote?.percent_change_24h),
      percentChange7d: decimalOrNull(quote?.percent_change_7d), quoteAsOf: quote?.last_updated ?? listing.last_updated ?? null,
    };
  });
}

export function normalizeGlobalMetrics(envelope: CmcEnvelope<Record<string, unknown>>, currency = 'USD'): NormalizedGlobalMetrics {
  const data = envelope.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('CoinMarketCap global metrics data must be an object');
  const quotes = data.quote as Record<string, Record<string, unknown>> | undefined;
  const quote = quotes?.[currency.toUpperCase()];
  return {
    quoteCurrency: currency.toUpperCase(), totalMarketCap: decimalOrNull(quote?.total_market_cap),
    totalVolume24h: decimalOrNull(quote?.total_volume_24h), btcDominance: decimalOrNull(data.btc_dominance as NumericLike),
    ethDominance: decimalOrNull(data.eth_dominance as NumericLike), activeCryptocurrencies: integerOrNull(data.active_cryptocurrencies),
    totalCryptocurrencies: integerOrNull(data.total_cryptocurrencies), activeExchanges: integerOrNull(data.active_exchanges),
    activeMarketPairs: integerOrNull(data.active_market_pairs), sourceAsOf: (quote?.last_updated as string | undefined) ?? (data.last_updated as string | undefined) ?? null,
  };
}

export function normalizeKeyInfo(envelope: CmcEnvelope<CmcKeyInfo>): CmcKeyInfo {
  if (!envelope.data || typeof envelope.data !== 'object') throw new Error('CoinMarketCap key info response is missing data');
  return { plan: envelope.data.plan ?? {}, usage: envelope.data.usage ?? {} };
}

export function assertCmcSuccess(status: CmcEnvelope<unknown>['status']): void {
  const code = Number(status?.error_code ?? 0);
  if (code !== 0) throw new Error(`CoinMarketCap error ${code}: ${status?.error_message ?? 'request failed'}`);
}
