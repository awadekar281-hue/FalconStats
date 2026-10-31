'use client';

import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { apiPaths } from '@/lib/api';
import { useApi } from './use-api';
import { DataState, PageHeading, UnsupportedPanel, formatDate, formatMoney, formatPercent } from './data-ui';
import { useBrowserList } from './use-local-data';
import type { Asset } from '@/lib/types';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function AssetDetailsPage({ id }: { id: string }) {
  const resource = useApi<Asset>(apiPaths.asset(id));
  const exchangeQuotes=useApi<{items:Array<Record<string,unknown>>}>(`assets/${encodeURIComponent(id)}/markets`);
  const history=useApi<{status:string;reason?:string;items:Array<{source_as_of:string;price:string|null}>}>(`assets/${encodeURIComponent(id)}/history?days=7`);
  const asset = resource.data;
  const [ids, setIds] = useBrowserList<string>('falconstats-watchlist-v1');
  const saved = ids.includes(id);
  const toggle = () => setIds(saved ? ids.filter((item) => item !== id) : [...ids, id]);
  return <>
    <PageHeading eyebrow="ASSET DETAILS" title={asset ? `${asset.name} (${asset.symbol})` : 'Asset details'} description={asset ? `Rank ${asset.rank ?? 'not reported'} · CoinGecko ID ${asset.coingecko_id}` : 'The asset is looked up by its FalconStats UUID from the stored assets API.'} actions={<><Link className="button" href="/markets"><ArrowLeft size={14}/>Back to markets</Link><button className="button" onClick={toggle} disabled={!asset}><Star size={14} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Saved' : 'Add to watchlist'}</button></>}/>
    <DataState meta={resource.meta} error={resource.error} loading={resource.status === 'loading'} onRefresh={resource.refresh}/>
    {asset ? <>
      <div className="grid metrics-grid detail-metrics"><Metric label="Current price" value={formatMoney(asset.price, asset.quote_currency ?? 'USD', 8)}/><Metric label="Market cap" value={formatMoney(asset.market_cap, asset.quote_currency ?? 'USD')}/><Metric label="Volume · 24h" value={formatMoney(asset.volume_24h, asset.quote_currency ?? 'USD')}/><Metric label="Change · 24h" value={formatPercent(asset.percent_change_24h)} tone={Number(asset.percent_change_24h) >= 0 ? 'positive' : 'negative'}/></div>
      <div className="grid two-col"><section className="card"><div className="card-head"><div><h2 className="card-title">Market snapshot</h2><p className="card-subtitle">Fields returned for this asset by FalconStats</p></div></div><div className="snapshot-list">{[['Change · 1h', formatPercent(asset.percent_change_1h)], ['Change · 7d', formatPercent(asset.percent_change_7d)], ['Quote currency', asset.quote_currency ?? '—'], ['Provider', asset.source ?? '—'], ['Source timestamp', formatDate(asset.source_as_of)], ['Platform', asset.platform_name ?? '—'], ['Contract address', asset.contract_address ?? '—']].map(([label, value]) => <div key={label} className="snapshot-row"><span>{label}</span><b className={label.startsWith('Change') ? (value.startsWith('+') ? 'positive' : value.startsWith('-') ? 'negative' : '') : ''}>{value}</b></div>)}</div></section><section className="card"><div className="card-head"><div><h2 className="card-title">Exchange prices</h2><p className="card-subtitle">Quotes retain provider and quote-currency labels</p></div></div>{exchangeQuotes.status==='loading'?<div className="admin-body">Loading exchange quotes…</div>:exchangeQuotes.error?<div className="admin-body">{exchangeQuotes.error}</div>:exchangeQuotes.data?.items.length?<div className="snapshot-list">{exchangeQuotes.data.items.map((quote,index)=><div className="snapshot-row" key={`${String(quote.exchange_code)}-${String(quote.symbol)}-${index}`}><span>{String(quote.exchange_code)} {String(quote.symbol)} · {String(quote.market_type)}</span><b>{String(quote.price??'—')} {String(quote.quote_asset)} · {formatDate(String(quote.source_as_of??''))}</b></div>)}</div>:<div className="admin-body">No exchange quote is stored for this mapped asset yet.</div>}</section></div>
      <section className="card section"><div className="card-head"><div><h2 className="card-title">Historical global reference · 7 days</h2><p className="card-subtitle">CoinGecko price, market cap and volume series, cached and stored by FalconStats. {history.meta?.freshness==='stale'?'Last stored series · STALE':''}</p></div></div>{history.status==='loading'?<div className="admin-body">Loading stored history…</div>:history.error?<div className="admin-body">{history.error}</div>:history.data?.items.some((point)=>point.price!==null)?<div className="chart-wrap"><ResponsiveContainer width="100%" height={300}><LineChart data={history.data.items.filter((point)=>point.price!==null).map((point)=>({time:point.source_as_of,price:Number(point.price)}))} margin={{top:10,right:16,bottom:0,left:10}}><CartesianGrid strokeDasharray="3 3" stroke="#e6edf4"/><XAxis dataKey="time" tickFormatter={(value:string)=>new Date(value).toLocaleDateString()} minTickGap={28}/><YAxis domain={['auto','auto']} tickFormatter={(value:number)=>Number(value).toLocaleString(undefined,{maximumFractionDigits:2})}/><Tooltip labelFormatter={(value)=>new Date(String(value)).toLocaleString()} formatter={(value)=>[formatMoney(String(value),asset.quote_currency??'USD',8),'Global reference']}/><Line type="monotone" dataKey="price" stroke="#00AFC8" strokeWidth={2} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>:<div className="admin-body">{history.data?.reason??'No history is stored yet. Refresh after the backend can reach the free CoinGecko API.'}</div>}</section>
    </> : resource.status === 'success' ? <UnsupportedPanel feature="Asset record" why="No asset with this UUID was returned by the internal FalconStats API."/> : null}
  </>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <article className="card metric-card"><div className="metric-label">{label}</div><div className={`metric-value ${tone ?? ''}`}>{value}</div><div className="metric-foot">Latest returned snapshot</div></article>; }
