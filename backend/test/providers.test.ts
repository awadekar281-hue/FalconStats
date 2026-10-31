import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse as parseLossless } from 'lossless-json';
import { normalizeCoinGeckoGlobal, normalizeCoinGeckoMarkets, ratioToPercent } from '../src/modules/providers/provider-normalizers';

const read=(name:string):unknown=>parseLossless(readFileSync(join(process.cwd(),'test','fixtures',name),'utf8'));

test('normalizes saved CoinGecko global fixture without losing timestamp or null semantics',()=>{
 const result=normalizeCoinGeckoGlobal(read('coingecko-global.fixture.json'));
 assert.equal(result.quoteCurrency,'USD');assert.equal(result.totalMarketCap,'1234567890123.4567');assert.equal(result.totalVolume24h,'98765432109.87654');assert.equal(result.btcDominance,'52.25');assert.equal(result.ethDominance,'17.5');assert.equal(result.sourceAsOf,'2025-01-02T03:04:05.000Z');
});

test('normalizes CoinGecko rankings by provider ID and preserves absent fields as null',()=>{
 const result=normalizeCoinGeckoMarkets(read('coingecko-markets.fixture.json'));
 assert.equal(result.length,2);assert.equal(result[0].id,'bitcoin');assert.equal(result[0].symbol,'BTC');assert.equal(result[0].price,'42000.125');assert.equal(result[0].change24h,'-1.5');assert.equal(result[1].price,null);assert.equal(result[1].sourceAsOf,null);
});

test('converts Bybit fractional 24h change to percentage without binary float rounding',()=>{
 assert.equal(ratioToPercent('0.0068'),'0.68');assert.equal(ratioToPercent('-0.142425'),'-14.2425');assert.equal(ratioToPercent('0'),'0');assert.equal(ratioToPercent(''),null);
});
