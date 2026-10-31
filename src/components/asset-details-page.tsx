'use client';

import Link from 'next/link';
import { ArrowLeft, Clock3, Star } from 'lucide-react';
import { apiPaths } from '@/lib/api';
import { useApi } from './use-api';
import { DataState, PageHeading, UnsupportedPanel, formatDate, formatMoney, formatPercent } from './data-ui';
import { useBrowserList } from './use-local-data';
import type { Asset } from '@/lib/types';

export function AssetDetailsPage({ id }: { id: string }) {
  const resource = useApi<Asset>(apiPaths.asset(id));
  const asset = resource.data;
  const [ids, setIds] = useBrowserList<string>('falconstats-watchlist-v1');
  const saved = ids.includes(id);
  const toggle = () => setIds(saved ? ids.filter((item) => item !== id) : [...ids, id]);
  return <>
    <PageHeading eyebrow="ASSET DETAILS" title={asset ? `${asset.name} (${asset.symbol})` : 'Asset details'} description={asset ? `Rank ${asset.rank ?? 'not reported'} · CMC asset ID ${asset.cmc_id}` : 'The asset is looked up by its FalconStats UUID from the stored assets API.'} actions={<><Link className="button" href="/markets"><ArrowLeft size={14}/>Back to markets</Link><button className="button" onClick={toggle} disabled={!asset}><Star size={14} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Saved' : 'Add to watchlist'}</button></>}/>
    <DataState meta={resource.meta} error={resource.error} loading={resource.status === 'loading'} onRefresh={resource.refresh}/>
    {asset ? <>
      <div className="grid metrics-grid detail-metrics"><Metric label="Current price" value={formatMoney(asset.price, asset.quote_currency ?? 'USD', 8)}/><Metric label="Market cap" value={formatMoney(asset.market_cap, asset.quote_currency ?? 'USD')}/><Metric label="Volume · 24h" value={formatMoney(asset.volume_24h, asset.quote_currency ?? 'USD')}/><Metric label="Change · 24h" value={formatPercent(asset.percent_change_24h)} tone={Number(asset.percent_change_24h) >= 0 ? 'positive' : 'negative'}/></div>
      <div className="grid two-col"><section className="card"><div className="card-head"><div><h2 className="card-title">Market snapshot</h2><p className="card-subtitle">Fields returned for this asset by FalconStats</p></div></div><div className="snapshot-list">{[['Change · 1h', formatPercent(asset.percent_change_1h)], ['Change · 7d', formatPercent(asset.percent_change_7d)], ['Quote currency', asset.quote_currency ?? '—'], ['Provider', asset.source ?? '—'], ['Source timestamp', formatDate(asset.source_as_of)], ['Platform', asset.platform_name ?? '—'], ['Contract address', asset.contract_address ?? '—']].map(([label, value]) => <div key={label} className="snapshot-row"><span>{label}</span><b className={label.startsWith('Change') ? (value.startsWith('+') ? 'positive' : value.startsWith('-') ? 'negative' : '') : ''}>{value}</b></div>)}</div></section><UnsupportedPanel feature="Historical price chart" icon={Clock3} why="The current API returns the latest stored asset snapshot and short-term change percentages. It does not expose historical candles or a time-series endpoint, so no line is drawn from fabricated points."/></div>
    </> : resource.status === 'success' ? <UnsupportedPanel feature="Asset record" why="No asset with this UUID was returned by the internal FalconStats API."/> : null}
  </>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <article className="card metric-card"><div className="metric-label">{label}</div><div className={`metric-value ${tone ?? ''}`}>{value}</div><div className="metric-foot">Latest returned snapshot</div></article>; }
