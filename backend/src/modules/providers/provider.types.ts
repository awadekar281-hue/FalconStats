export interface MarketDataProvider {
  readonly code: string;
  globalMetrics?(): Promise<unknown>;
  listings?(limit: number, page?: number): Promise<unknown>;
  history?(coinId: string, days: number): Promise<unknown>;
}
export interface ExchangeMarketDataProvider {
  readonly code: string;
  spotTickers(symbols?: string[]): Promise<unknown>;
}
export interface DerivativesDataProvider {
  readonly code: string;
  spotTickers(symbol?: string): Promise<unknown>;
  linearTickers(symbol?: string): Promise<unknown>;
  openInterest(symbol: string): Promise<unknown>;
  fundingHistory(symbol: string): Promise<unknown>;
}
export interface DefiDataProvider {
  readonly code: string;
  protocols(): Promise<unknown>;
  chains(): Promise<unknown>;
}
export interface ProviderRequestResult<T> { data: T; sourceAsOf: string; receivedAt: string }
