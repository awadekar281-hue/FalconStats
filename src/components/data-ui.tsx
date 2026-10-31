'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Clock3, Database, Info, LoaderCircle, RefreshCw, Search, Star, TriangleAlert } from 'lucide-react';
import { Cell, Pie, PieChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ApiMeta, Asset, GlobalMetrics, PageData } from '@/lib/types';
import { apiFetch, apiPaths } from '@/lib/api';
import type { Resource } from './use-api';
import { useBrowserList } from './use-local-data';

const number = (value: string | number | null | undefined) => value === null || value === undefined || value === '' ? null : Number(value);
export function formatMoney(value: string | number | null | undefined, currency = 'USD', digits = 2) {
  const amount = number(value); if (amount === null || !Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: Math.abs(amount) >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: digits, minimumFractionDigits: amount < 1 ? Math.min(digits, 4) : 0 }).format(amount);
}
export function formatCompact(value: string | number | null | undefined) {
  const amount = number(value); return amount === null || !Number.isFinite(amount) ? '—' : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(amount);
}
export function formatPercent(value: string | number | null | undefined) {
  const amount = number(value); return amount === null || !Number.isFinite(amount) ? '—' : `${amount > 0 ? '+' : ''}${amount.toFixed(2)}%`;
}
export function formatDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function DataState({ meta, error, loading, onRefresh }: { meta?: ApiMeta | null; error?: string | null; loading?: boolean; onRefresh?: () => void }) {
  if (loading && !meta) return <div className="api-state"><LoaderCircle size={15} className="animate-spin"/><span><strong>Loading stored FalconStats data…</strong></span></div>;
  if (error) return <div className="api-state error"><TriangleAlert/><span><strong>Market data unavailable.</strong> {error} {onRefresh ? <button className="inline-link" onClick={onRefresh} type="button">Retry</button> : null}</span></div>;
  if (meta?.freshness === 'unavailable' || !meta?.asOf) return <div className="api-state"><Info/><span><strong>No stored market snapshot yet.</strong> This page only displays data returned by FalconStats; no sample market values are shown.</span>{onRefresh ? <button type="button" className="inline-link" onClick={onRefresh}>Refresh</button> : null}</div>;
  if (meta.freshness === 'stale') return <div className="api-state stale"><Clock3/><span><strong>Stored data may be stale.</strong> Snapshot from {formatDate(meta.asOf)}. {meta.source ?? 'Source unavailable'}.</span>{onRefresh ? <button type="button" className="inline-link" onClick={onRefresh}>Refresh</button> : null}</div>;
  return <div className="data-source"><span className="freshness-dot"/><span>{meta?.source ?? 'FalconStats API'}</span><span>·</span><span>Updated {formatDate(meta?.asOf)}</span>{onRefresh ? <button type="button" className="refresh-link" onClick={onRefresh} aria-label="Refresh data"><RefreshCw size={13}/></button> : null}</div>;
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow"><span className="status-dot"/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions ? <div className="head-actions">{actions}</div> : null}</div>;
}

export function MetricsCards({ data: metrics, meta, error, status, refresh }: Resource<GlobalMetrics | null>) {
  const entries = [
    { label: 'Total market cap', value: metrics ? formatMoney(metrics.total_market_cap, metrics.quote_currency) : '—', note: 'Global snapshot', icon: Database },
    { label: '24h trading volume', value: metrics ? formatMoney(metrics.total_volume_24h, metrics.quote_currency) : '—', note: 'Rolling 24 hours', icon: ArrowDownUp },
    { label: 'Bitcoin dominance', value: metrics?.btc_dominance == null ? '—' : `${Number(metrics.btc_dominance).toFixed(2)}%`, note: 'Share of total market cap', icon: Database },
    { label: 'Ethereum dominance', value: metrics?.eth_dominance == null ? '—' : `${Number(metrics.eth_dominance).toFixed(2)}%`, note: 'Share of total market cap', icon: Database },
  ];
  return <>
    <DataState meta={meta} error={error} loading={status === 'loading'} onRefresh={refresh}/>
    <div className="grid metrics-grid">{entries.map(({ label, value, note, icon: Icon }) => <article className="card metric-card" key={label}><div className="metric-label"><span>{label}</span><Icon aria-hidden="true"/></div><div className="metric-value">{metrics ? value : <span className={status === 'loading' ? 'skeleton' : ''}>{value}</span>}</div><div className="metric-foot">{note}</div></article>)}</div>
  </>;
}

export function MarketCharts({ metrics, assets }: { metrics: GlobalMetrics | null; assets: Asset[] }) {
  const [selected, setSelected] = useState<'dominance' | 'market-cap'>('dominance');
  const dominance = useMemo(() => {
    if (!metrics || metrics.btc_dominance === null || metrics.eth_dominance === null) return [];
    const btc = number(metrics.btc_dominance) ?? 0; const eth = number(metrics.eth_dominance) ?? 0;
    const remainder = 100 - btc - eth;
    if (btc < 0 || eth < 0 || remainder < 0) return [];
    return [{ name: 'Bitcoin', value: btc, color: '#102b55' }, { name: 'Ethereum', value: eth, color: '#00afc8' }, { name: 'Other assets', value: remainder, color: '#e6a33b' }].filter((part) => part.value > 0);
  }, [metrics]);
  const capRows = useMemo(() => assets.filter((asset) => asset.market_cap !== null).slice(0, 8).map((asset) => ({ symbol: asset.symbol, name: asset.name, marketCap: Number(asset.market_cap) })), [assets]);
  return <div className="grid two-col">
    <section className="card chart-card"><div className="card-head"><div><h2 className="card-title">Market composition</h2><p className="card-subtitle">Current shares from the latest global metrics snapshot</p></div><div className="filter-pills"><button className={`filter-pill${selected === 'dominance' ? ' active' : ''}`} onClick={() => setSelected('dominance')}>Dominance</button><button className={`filter-pill${selected === 'market-cap' ? ' active' : ''}`} onClick={() => setSelected('market-cap')}>Asset cap</button></div></div>
      <div className="chart-wrap">{selected === 'dominance' && dominance.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dominance} dataKey="value" nameKey="name" innerRadius="57%" outerRadius="80%" paddingAngle={2} stroke="none">{dominance.map((part) => <Cell key={part.name} fill={part.color}/>)}</Pie><Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Dominance']}/></PieChart></ResponsiveContainer> : selected === 'market-cap' && capRows.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={capRows} margin={{ top: 8, right: 15, left: 6, bottom: 3 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f4"/><XAxis dataKey="symbol" tick={{ fontSize: 10, fill: '#8390a0' }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(value) => formatCompact(value)} tick={{ fontSize: 9, fill: '#8390a0' }} axisLine={false} tickLine={false} width={54}/><Tooltip formatter={(value) => [formatMoney(String(value), metrics?.quote_currency ?? 'USD'), 'Market cap']} labelFormatter={(label) => capRows.find((r) => r.symbol === label)?.name ?? label}/><Bar dataKey="marketCap" fill="#00afc8" radius={[4, 4, 0, 0]} maxBarSize={38}/></BarChart></ResponsiveContainer> : <div className="chart-empty"><Info size={18}/><span>Chart is unavailable because the API has no stored series for this view.</span></div>}</div>
      {selected === 'dominance' && dominance.length ? <div className="chart-legend">{dominance.map((part) => <span key={part.name}><i className="legend-swatch" style={{ background: part.color }}/>{part.name} {part.value.toFixed(1)}%</span>)}</div> : null}
    </section>
    <section className="card snapshot-card"><div className="card-head"><div><h2 className="card-title">Snapshot details</h2><p className="card-subtitle">Coverage from the latest stored global response</p></div><Database size={16} color="#9aabba"/></div><div className="snapshot-list">{[
      ['Active cryptocurrencies', metrics?.active_cryptocurrencies], ['Total cryptocurrencies', metrics?.total_cryptocurrencies], ['Active exchanges', metrics?.active_exchanges], ['Active market pairs', metrics?.active_market_pairs],
    ].map(([label, value]) => <div className="snapshot-row" key={String(label)}><span>{label}</span><b>{value == null ? '—' : new Intl.NumberFormat().format(Number(value))}</b></div>)}<p className="chart-note">A historical series is not available from the current API. Charts use only values present in the current API response.</p></div></section>
  </div>;
}

const WATCHLIST_KEY = 'falconstats-watchlist-v1';
export function loadWatchlist(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
}
export function saveWatchlist(ids: string[]) { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids)); }

export function AssetTable({ result, loading, error, meta, refresh, offset, onPage, pageSize = 25, emptyMessage = 'No assets match this query.' }: {
  result: PageData<Asset> | null; loading: boolean; error: string | null; meta: ApiMeta | null; refresh: () => void; offset: number;
  onPage: (offset: number) => void; pageSize?: number; emptyMessage?: string;
}) {
  const [sort, setSort] = useState<{ key: 'rank' | 'price' | 'market_cap' | 'percent_change_24h'; direction: 'asc' | 'desc' }>({ key: 'rank', direction: 'asc' });
  const [saved, setSaved] = useBrowserList<string>('falconstats-watchlist-v1');
  const rows = useMemo(() => [...(result?.items ?? [])].sort((a, b) => {
    const av = number(a[sort.key]); const bv = number(b[sort.key]);
    const compare = av === null ? (bv === null ? 0 : 1) : bv === null ? -1 : av - bv;
    return sort.direction === 'asc' ? compare : -compare;
  }), [result?.items, sort]);
  const toggle = (id: string) => { const next = saved.includes(id) ? saved.filter((value) => value !== id) : [...saved, id]; setSaved(next); window.dispatchEvent(new Event('falconstats-watchlist-change')); };
  const sortBy = (key: typeof sort.key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const sortIcon = (key: typeof sort.key) => sort.key !== key ? <ArrowDownUp size={11}/> : sort.direction === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>;
  const total = result?.pagination.total ?? 0; const currentPage = Math.floor(offset / pageSize) + 1; const pages = Math.max(1, Math.ceil(total / pageSize));
  return <section className="card table-card">
    <DataState meta={meta} error={error} loading={loading} onRefresh={refresh}/>
    <div className="table-scroll"><table><thead><tr><th aria-label="Watchlist"/><th><button className="th-button" onClick={() => sortBy('rank')}>Rank {sortIcon('rank')}</button></th><th className="asset-heading">Asset</th><th><button className="th-button" onClick={() => sortBy('price')}>Price {sortIcon('price')}</button></th><th><button className="th-button" onClick={() => sortBy('percent_change_24h')}>24h {sortIcon('percent_change_24h')}</button></th><th className="hide-small"><button className="th-button" onClick={() => sortBy('market_cap')}>Market cap {sortIcon('market_cap')}</button></th><th className="hide-medium">Volume 24h</th><th className="hide-medium">Updated</th></tr></thead><tbody>
      {loading && !result ? Array.from({ length: 6 }, (_, i) => <tr key={i}><td/><td colSpan={7}><div className="skeleton"/></td></tr>) : rows.length ? rows.map((asset) => <tr key={asset.id}>
        <td><button type="button" aria-label={saved.includes(asset.id) ? `Remove ${asset.symbol} from watchlist` : `Add ${asset.symbol} to watchlist`} className={`star-button${saved.includes(asset.id) ? ' saved' : ''}`} onClick={() => toggle(asset.id)}><Star size={15} fill={saved.includes(asset.id) ? 'currentColor' : 'none'}/></button></td>
        <td>{asset.rank ?? '—'}</td><td className="asset-heading"><Link href={`/asset/${asset.id}`} className="asset-cell"><span className="asset-icon">{asset.symbol.slice(0, 3)}</span><span className="asset-name"><strong>{asset.name}</strong><span>{asset.symbol}</span></span></Link></td>
        <td>{formatMoney(asset.price, asset.quote_currency ?? 'USD', 6)}</td><td className={Number(asset.percent_change_24h) >= 0 ? 'positive' : 'negative'}>{formatPercent(asset.percent_change_24h)}</td><td className="hide-small">{formatMoney(asset.market_cap, asset.quote_currency ?? 'USD', 0)}</td><td className="hide-medium">{formatMoney(asset.volume_24h, asset.quote_currency ?? 'USD', 0)}</td><td className="hide-medium">{asset.source_as_of ? formatDate(asset.source_as_of) : '—'}</td>
      </tr>) : <tr><td colSpan={8} className="empty-cell">{error ? 'Stored assets could not be loaded.' : emptyMessage}</td></tr>}
    </tbody></table></div>
    <div className="table-footer"><span>{result ? `Showing ${total ? offset + 1 : 0}–${Math.min(offset + pageSize, total)} of ${total.toLocaleString()} stored assets` : error ? 'API data unavailable' : 'Waiting for API data'}</span><div className="pagination"><button type="button" className="page-button" disabled={currentPage <= 1} onClick={() => onPage(Math.max(0, offset - pageSize))}>Previous</button><span>{currentPage} / {pages}</span><button type="button" className="page-button" disabled={currentPage >= pages} onClick={() => onPage(offset + pageSize)}>Next</button></div></div>
  </section>;
}

export function UnsupportedPanel({ feature, why, icon: Icon = Info, extra }: { feature: string; why: string; icon?: typeof Info; extra?: React.ReactNode }) {
  return <section className="card unsupported"><div className="unsupported-hero"><span className="unsupported-icon"><Icon aria-hidden="true"/></span><div><h2>{feature} is not available from the current backend</h2><p>{why}</p></div></div><div className="api-state"><Info/><span><strong>No placeholder content is being shown.</strong> FalconStats needs a supported API and stored data for this section. The current API documents assets, market listings, global metrics, health, and CoinMarketCap provider status only.</span></div>{extra}</section>;
}

export function SearchToolbar({ value, onChange, placeholder = 'Search name or symbol' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-control"><Search size={14} aria-hidden="true"/><input className="field search-field" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder}/></label>;
}

export function WorkspaceAssetSelect({ onSelect, assets, loading }: { onSelect: (id: string) => void; assets: Asset[]; loading: boolean }) {
  return <select className="select" defaultValue="" onChange={(event) => { if (event.target.value) onSelect(event.target.value); event.currentTarget.value = ''; }} disabled={loading}><option value="">{loading ? 'Loading stored assets…' : 'Add an asset'}</option>{assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.name} ({asset.symbol})</option>)}</select>;
}

export async function loadAsset(id: string) { return apiFetch<Asset>(apiPaths.asset(id)); }
