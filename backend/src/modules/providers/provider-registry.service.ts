import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderClients } from './provider-clients.service';
import type { DefiDataProvider, DerivativesDataProvider, ExchangeMarketDataProvider, MarketDataProvider } from './provider.types';

@Injectable()
export class ProviderRegistryService {
  readonly coingecko: MarketDataProvider;
  readonly binance: ExchangeMarketDataProvider;
  readonly bybit: DerivativesDataProvider;
  readonly defillama: DefiDataProvider;
  constructor(private readonly http: ProviderClients, config: ConfigService) {
    const cgKey = config.get<string>('COINGECKO_DEMO_API_KEY')?.trim();
    const cgHeaders: Record<string,string> = cgKey ? { 'x-cg-demo-api-key': cgKey } : {};
    this.coingecko = { code: 'coingecko', globalMetrics: () => http.request('coingecko','https://api.coingecko.com/api/v3','global',{},cgHeaders), listings: (limit,page=1) => http.request('coingecko','https://api.coingecko.com/api/v3','coins/markets',{vs_currency:'usd',order:'market_cap_desc',per_page:limit,page,sparkline:'false',price_change_percentage:'1h,24h,7d,30d'},cgHeaders), history:(coinId,days)=>http.request('coingecko','https://api.coingecko.com/api/v3',`coins/${encodeURIComponent(coinId)}/market_chart`,{vs_currency:'usd',days},cgHeaders) };
    this.binance = { code: 'binance', spotTickers: (symbols) => http.request('binance','https://data-api.binance.vision','api/v3/ticker/24hr',symbols?.length ? {symbols:JSON.stringify(symbols)} : {}) };
    this.bybit = {
      code: 'bybit',
      spotTickers: (symbol) => http.request('bybit','https://api.bybit.com','v5/market/tickers',{category:'spot',...(symbol?{symbol}:{})}),
      linearTickers: (symbol) => http.request('bybit','https://api.bybit.com','v5/market/tickers',{category:'linear',...(symbol?{symbol}:{})}),
      openInterest: (symbol) => http.request('bybit','https://api.bybit.com','v5/market/open-interest',{category:'linear',symbol,intervalTime:'5min',limit:1}),
      fundingHistory: (symbol) => http.request('bybit','https://api.bybit.com','v5/market/funding/history',{category:'linear',symbol,limit:20}),
    };
    this.defillama = { code: 'defillama', protocols: () => http.request('defillama','https://api.llama.fi','protocols'), chains: () => http.request('defillama','https://api.llama.fi','v2/chains') };
  }
  all(): Array<{code:string; enabled:boolean}> { return [{code:'coingecko',enabled:true},{code:'binance',enabled:true},{code:'bybit',enabled:true},{code:'defillama',enabled:true}]; }
}
