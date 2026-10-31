export type DecimalValue = string | null;
export interface NormalizedCoinGeckoGlobal {quoteCurrency:string;totalMarketCap:DecimalValue;totalVolume24h:DecimalValue;btcDominance:DecimalValue;ethDominance:DecimalValue;activeCryptocurrencies:number|null;activeExchanges:number|null;sourceAsOf:string|null}
export interface NormalizedCoinGeckoMarket {id:string;name:string;symbol:string;image:string|null;rank:number|null;price:DecimalValue;volume24h:DecimalValue;marketCap:DecimalValue;fdv:DecimalValue;circulatingSupply:DecimalValue;totalSupply:DecimalValue;maxSupply:DecimalValue;change1h:DecimalValue;change24h:DecimalValue;change7d:DecimalValue;sourceAsOf:string|null}
export interface NormalizedCoinGeckoHistory {sourceAsOf:string;price:DecimalValue;marketCap:DecimalValue;totalVolume:DecimalValue}
const obj=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'?value as Record<string,unknown>:{};
const arr=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const dec=(value:unknown):string|null=>value===null||value===undefined||value===''?null:String(value);
const n=(value:unknown):number|null=>Number.isFinite(Number(value))?Number(value):null;
export function ratioToPercent(value:unknown):string|null{const raw=dec(value);if(raw===null)return null;const negative=raw.startsWith('-');const unsigned=raw.replace(/^[+-]/,'');const [whole,fraction='']=unsigned.split('.');const digits=`${whole}${fraction}`.replace(/^0+(?=\d)/,'');const places=fraction.length-2;let output:string;if(places<=0)output=digits+'0'.repeat(-places);else{const split=digits.length-places;output=split<=0?`0.${'0'.repeat(-split)}${digits}`:`${digits.slice(0,split)}.${digits.slice(split)}`;}if(output.includes('.')){const [integer,decimalPart]=output.split('.');const cleaned=decimalPart.replace(/0+$/,'');output=`${integer.replace(/^0+(?=\d)/,'')||'0'}${cleaned?`.${cleaned}`:''}`;}else output=output.replace(/^0+(?=\d)/,'')||'0';return `${negative?'-':''}${output}`;}
const date=(value:unknown):string|null=>{if(value===null||value===undefined)return null;const text=String(value);const v=Number(text);const d=typeof value==='number'||/^\d{10,13}$/.test(text)?new Date(v<10_000_000_000?v*1000:v):new Date(text);return Number.isNaN(d.getTime())?null:d.toISOString()};

export function normalizeCoinGeckoGlobal(raw:unknown,currency='usd'):NormalizedCoinGeckoGlobal{
 const data=obj(obj(raw).data);const dominance=obj(data.market_cap_percentage);
 return {quoteCurrency:currency.toUpperCase(),totalMarketCap:dec(obj(data.total_market_cap)[currency.toLowerCase()]),totalVolume24h:dec(obj(data.total_volume)[currency.toLowerCase()]),btcDominance:dec(dominance.btc),ethDominance:dec(dominance.eth),activeCryptocurrencies:n(data.active_cryptocurrencies),activeExchanges:n(data.markets),sourceAsOf:date(data.updated_at)};
}
export function normalizeCoinGeckoMarkets(raw:unknown):NormalizedCoinGeckoMarket[]{
 return arr(raw).flatMap((value)=>{const x=obj(value);if(typeof x.id!=='string'||typeof x.name!=='string'||typeof x.symbol!=='string')return[];return[{id:x.id,name:x.name,symbol:x.symbol.toUpperCase(),image:typeof x.image==='string'?x.image:null,rank:n(x.market_cap_rank),price:dec(x.current_price),volume24h:dec(x.total_volume),marketCap:dec(x.market_cap),fdv:dec(x.fully_diluted_valuation),circulatingSupply:dec(x.circulating_supply),totalSupply:dec(x.total_supply),maxSupply:dec(x.max_supply),change1h:dec(x.price_change_percentage_1h_in_currency),change24h:dec(x.price_change_percentage_24h),change7d:dec(x.price_change_percentage_7d),sourceAsOf:date(x.last_updated)}];});
}
export function normalizeCoinGeckoHistory(raw:unknown):NormalizedCoinGeckoHistory[]{
 const data=obj(raw);const rows=new Map<string,NormalizedCoinGeckoHistory>();
 for(const [field,key] of [['prices','price'],['market_caps','marketCap'],['total_volumes','totalVolume']] as const){for(const point of arr(data[field])){if(!Array.isArray(point)||point.length<2)continue;const time=Number(String(point[0]));const sourceAsOf=date(time);if(!sourceAsOf)continue;const entry=rows.get(sourceAsOf)??{sourceAsOf,price:null,marketCap:null,totalVolume:null};entry[key]=dec(point[1]);rows.set(sourceAsOf,entry);}}
 return [...rows.values()].sort((a,b)=>a.sourceAsOf.localeCompare(b.sourceAsOf));
}
