'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, Bot, Landmark, Moon, Newspaper, RefreshCw, ShieldAlert, Star, Sun, Tags } from 'lucide-react';
import { AssetTable, DataState, PageHeading, SearchToolbar, UnsupportedPanel, WorkspaceAssetSelect, formatMoney } from './data-ui';
import { useBrowserList, useBrowserObject } from './use-local-data';
import { useApi } from './use-api';
import { apiPaths, type AssetsResponse, type ListingsResponse } from '@/lib/api';
import type { Asset, GlobalMetrics } from '@/lib/types';

const TITLES: Record<string, { title: string; description: string; eyebrow?: string }> = {
  markets: { title: 'Markets', description: 'Search and compare assets using the latest snapshots stored by FalconStats.', eyebrow: 'MARKET DATA' },
  categories: { title: 'Categories', description: 'Market sectors and asset category data.', eyebrow: 'MARKET STRUCTURE' },
  exchanges: { title: 'Exchanges', description: 'Exchange coverage reported in the latest global metrics.', eyebrow: 'MARKET STRUCTURE' },
  derivatives: { title: 'Derivatives', description: 'Futures, options, funding, and open-interest market data.', eyebrow: 'DERIVATIVES' },
  research: { title: 'Research & news', description: 'Research notes and market news with source attribution.', eyebrow: 'RESEARCH' },
  'ai-insights': { title: 'AI insights', description: 'Evidence-linked analysis generated from stored market data.', eyebrow: 'INTELLIGENCE' },
  screener: { title: 'Screener', description: 'Filter the current stored listings by name, symbol, and reported market values.', eyebrow: 'DISCOVERY' },
  signals: { title: 'Signals', description: 'Transparent market signals with an auditable data source.', eyebrow: 'INTELLIGENCE' },
  watchlist: { title: 'Watchlist', description: 'Assets saved in this browser, joined to current FalconStats data.', eyebrow: 'YOUR SPACE' },
  portfolio: { title: 'Portfolio', description: 'Track quantities you enter against the latest available FalconStats asset prices.', eyebrow: 'YOUR SPACE' },
  alerts: { title: 'Price alerts', description: 'Browser-local price thresholds evaluated against stored market snapshots.', eyebrow: 'YOUR SPACE' },
  settings: { title: 'Settings', description: 'Manage display preferences stored in this browser.', eyebrow: 'PREFERENCES' },
};

type Holding = { assetId: string; quantity: string };
type AlertRule = { id: string; assetId: string; direction: 'above' | 'below'; price: string };
const WATCH_KEY = 'falconstats-watchlist-v1';
const PORTFOLIO_KEY = 'falconstats-portfolio-v1';
const ALERTS_KEY = 'falconstats-alerts-v1';
const PREFS_KEY = 'falconstats-preferences-v1';
const DEFAULT_PREFS = { dark: false };


export function SectionRoute({ section }: { section: string }) {
  const isWorkspace = ['watchlist', 'portfolio', 'alerts'].includes(section);
  const assetsPath = isWorkspace ? apiPaths.assets(250, 0) : null;
  const globalPath = ['exchanges'].includes(section) ? apiPaths.global() : null;
  const assetResource = useApi<AssetsResponse>(assetsPath);
  const globalResource = useApi<GlobalMetrics | null>(globalPath);
  if (!TITLES[section]) return <UnsupportedPanel feature="This route" why="The requested page is not part of the FalconStats route map."/>;
  if (section === 'markets' || section === 'screener') return <MarketListSection section={section}/>;
  if (section === 'watchlist') return <WatchlistSection resource={assetResource}/>;
  if (section === 'portfolio') return <PortfolioSection resource={assetResource}/>;
  if (section === 'alerts') return <AlertsSection resource={assetResource}/>;
  if (section === 'settings') return <SettingsSection/>;
  if (section === 'exchanges') return <ExchangeSection resource={globalResource}/>;
  const page = TITLES[section];
  const icons: Record<string, typeof Tags> = { categories: Tags, derivatives: Activity, research: Newspaper, 'ai-insights': Bot, signals: ShieldAlert };
  const Icon = icons[section] ?? Tags;
  const reasons: Record<string, string> = {
    categories: 'The internal API has no asset category or sector endpoints, and its schema has no category mapping. No market segments are inferred from symbols or names.',
    derivatives: 'The internal API stores spot listings and global metrics only. There are no futures or options endpoints or derivatives snapshots.',
    research: 'There is no internal research feed, article store, or news API. CMC market snapshots are not presented as news.',
    'ai-insights': 'The backend has no model, analysis, or evidence citation endpoint. No generated insights are shown without a supporting service.',
    signals: 'The backend has no signal-generation endpoint or signal history. No buy/sell labels are fabricated from a single market snapshot.',
  };
  return <><PageHeading eyebrow={page.eyebrow ?? 'FALCONSTATS'} title={page.title} description={page.description}/><UnsupportedPanel feature={page.title} icon={Icon} why={reasons[section] ?? 'This feature is not served by an available FalconStats API endpoint.'}/></>;
}

function MarketListSection({ section }: { section: string }) {
  const page = TITLES[section]; const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [offset, setOffset] = useState(0); const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  useEffect(() => { const timeout = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timeout); }, [search]);
  useEffect(() => { const initial = new URLSearchParams(window.location.search).get('search') ?? ''; if (initial) window.setTimeout(() => { setSearch(initial); setQuery(initial); }, 0); }, []);
  const resource = useApi<ListingsResponse>(apiPaths.listings(50, offset, query));
  const filtered = useMemo(() => {
    const items = resource.data?.items.filter((asset) => filter === 'all' || (filter === 'gainers' ? Number(asset.percent_change_24h) > 0 : Number(asset.percent_change_24h) < 0)) ?? [];
    return resource.data ? { ...resource.data, items } : null;
  }, [resource.data, filter]);
  return <><PageHeading eyebrow={page.eyebrow ?? 'MARKET DATA'} title={page.title} description={page.description} actions={<button type="button" className="button" onClick={resource.refresh}><RefreshCw size={14}/>Refresh</button>}/><div className="section"><div className="section-head"><div><h2>{section === 'screener' ? 'Live market screener' : 'All tracked assets'}</h2><p>Filter and sort the values returned by the internal market listings API.</p></div><div className="table-tools"><SearchToolbar value={search} onChange={(value) => { setSearch(value); setOffset(0); }}/><div className="filter-pills" role="group" aria-label="24 hour performance filter">{(['all', 'gainers', 'losers'] as const).map((value) => <button type="button" key={value} className={`filter-pill${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'gainers' ? 'Gainers' : 'Losers'}</button>)}</div></div></div><AssetTable result={filtered} loading={resource.status === 'loading'} error={resource.error} meta={resource.meta} refresh={resource.refresh} offset={offset} onPage={setOffset} pageSize={50} emptyMessage="The API returned no assets for these filters."/></div></>;
}

function WatchlistSection({ resource }: { resource: ReturnType<typeof useApi<AssetsResponse>> }) {
  const [ids, setIds] = useBrowserList<string>(WATCH_KEY);
  const saved = (resource.data?.items ?? []).filter((asset) => ids.includes(asset.id));
  const result = resource.data ? { ...resource.data, items: saved, pagination: { ...resource.data.pagination, total: saved.length } } : null;
  return <><PageHeading eyebrow="YOUR SPACE" title="Watchlist" description="Your saved asset IDs are local to this browser. Market values come from the API."/>{ids.length > 0 && result && saved.length < ids.length ? <div className="api-state stale"><Star size={15}/><span>{ids.length - saved.length} saved asset(s) were not found in the API&apos;s current 250-asset result. They are not replaced with sample data.</span><button className="inline-link" onClick={() => setIds(ids.filter((id) => saved.some((asset) => asset.id === id)))}>Remove unavailable</button></div> : null}<div className="section"><div className="section-head"><div><h2>Saved assets</h2><p>{ids.length} saved locally · {saved.length} with a current API record</p></div></div><AssetTable result={result} loading={resource.status === 'loading'} error={resource.error} meta={resource.meta} refresh={resource.refresh} offset={0} onPage={() => undefined} pageSize={Math.max(saved.length, 1)} emptyMessage="No assets saved yet. Add assets using the star button in Markets."/></div></>;
}

function PortfolioSection({ resource }: { resource: ReturnType<typeof useApi<AssetsResponse>> }) {
  const [holdings, setHoldings] = useBrowserList<Holding>(PORTFOLIO_KEY); const [selected, setSelected] = useState(''); const [quantityInput, setQuantityInput] = useState('');
  const assets = resource.data?.items ?? [];
  const positions = holdings.map((holding) => ({ holding, asset: assets.find((asset) => asset.id === holding.assetId) })).filter((item): item is { holding: Holding; asset: Asset } => Boolean(item.asset));
  const allPricesAvailable = positions.length === holdings.length && positions.every(({ holding, asset }) => asset.price !== null && Number.isFinite(Number(asset.price)) && Number.isFinite(Number(holding.quantity)) && Number(holding.quantity) >= 0);
  const total = holdings.length > 0 && allPricesAvailable ? positions.reduce((sum, { holding, asset }) => sum + Number(asset.price) * Number(holding.quantity), 0) : null;
  const update = (next: Holding[]) => setHoldings(next);
  const add = () => { if (selected && Number.isFinite(Number(quantityInput)) && Number(quantityInput) > 0 && !holdings.some((item) => item.assetId === selected)) update([...holdings, { assetId: selected, quantity: quantityInput }]); setSelected(''); setQuantityInput(''); };
  return <><PageHeading eyebrow="YOUR SPACE" title="Portfolio" description="Quantities are saved in this browser. Valuation uses returned API prices only."/><DataState meta={resource.meta} error={resource.error} loading={resource.status === 'loading'} onRefresh={resource.refresh}/>{holdings.length > positions.length ? <div className="api-state stale"><ShieldAlert size={15}/><span>{holdings.length - positions.length} saved position(s) are missing from the current API asset page, so the total is incomplete.</span></div> : null}<section className="card portfolio-summary"><div><span>Current value from available snapshots</span><strong>{total === null ? '—' : formatMoney(total, assets[0]?.quote_currency ?? 'USD')}</strong><small>{total === null ? 'Value is unavailable while any saved price or asset record is missing.' : 'Calculated from your entered quantities × stored asset prices. No P&amp;L or historical costs are inferred.'}</small></div><div className="table-tools"><WorkspaceAssetSelect assets={assets} loading={resource.status === 'loading'} onSelect={setSelected}/><input type="number" min="0" step="any" className="field quantity-input" aria-label="New position quantity" placeholder="Quantity" value={quantityInput} onChange={(event) => setQuantityInput(event.target.value)}/><button className="button primary" onClick={add} disabled={!selected || !Number.isFinite(Number(quantityInput)) || Number(quantityInput) <= 0}>Add asset</button></div></section><div className="section"><section className="card table-card"><div className="table-scroll"><table><thead><tr><th className="asset-heading">Asset</th><th>Quantity</th><th>Current price</th><th>Position value</th><th/></tr></thead><tbody>{positions.length ? positions.map(({ holding, asset }) => <tr key={asset.id}><td className="asset-heading"><Link className="asset-cell" href={`/asset/${asset.id}`}><span className="asset-icon">{asset.symbol.slice(0, 3)}</span><span className="asset-name"><strong>{asset.name}</strong><span>{asset.symbol}</span></span></Link></td><td><input aria-label={`${asset.symbol} quantity`} className="field quantity-input" type="number" min="0" step="any" value={holding.quantity} onChange={(event) => update(holdings.map((row) => row.assetId === asset.id ? { ...row, quantity: event.target.value } : row))} inputMode="decimal"/></td><td>{formatMoney(asset.price, asset.quote_currency ?? 'USD', 6)}</td><td>{asset.price === null ? '—' : formatMoney(Number(asset.price) * Number(holding.quantity), asset.quote_currency ?? 'USD')}</td><td><button className="button" onClick={() => update(holdings.filter((row) => row.assetId !== asset.id))}>Remove</button></td></tr>) : <tr><td colSpan={5} className="empty-cell">{resource.error ? 'Asset values are unavailable.' : 'No positions yet. Add an asset after the API returns stored listings.'}</td></tr>}</tbody></table></div></section></div></>;
}

function AlertsSection({ resource }: { resource: ReturnType<typeof useApi<AssetsResponse>> }) {
  const [alerts, setAlerts] = useBrowserList<AlertRule>(ALERTS_KEY); const [assetId, setAssetId] = useState(''); const [direction, setDirection] = useState<'above' | 'below'>('above'); const [price, setPrice] = useState('');
  const assets = resource.data?.items ?? [];
  const update = (next: AlertRule[]) => setAlerts(next);
  const add = (event: FormEvent) => { event.preventDefault(); if (!assetId || !Number.isFinite(Number(price)) || Number(price) <= 0) return; update([...alerts, { id: crypto.randomUUID(), assetId, direction, price }]); setPrice(''); };
  const rules = alerts.map((alert) => ({ alert, asset: assets.find((item) => item.id === alert.assetId) })).filter((item): item is { alert: AlertRule; asset: Asset } => Boolean(item.asset));
  return <><PageHeading eyebrow="YOUR SPACE" title="Price alerts" description="Alert rules are stored locally and checked against the latest returned market snapshot."/><DataState meta={resource.meta} error={resource.error} loading={resource.status === 'loading'} onRefresh={resource.refresh}/><section className="card alert-form-card"><form className="alert-form" onSubmit={add}><WorkspaceAssetSelect assets={assets} loading={resource.status === 'loading'} onSelect={setAssetId}/><select className="select" aria-label="Alert direction" value={direction} onChange={(event) => setDirection(event.target.value as 'above' | 'below')}><option value="above">Price rises above</option><option value="below">Price falls below</option></select><input className="field alert-price" aria-label="Alert price threshold" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="Threshold price"/><button type="submit" className="button primary" disabled={!assetId || !price}>Create alert</button></form><p>Rules only show whether the latest snapshot meets the threshold. There is no email, push, or background alert service.</p></section><div className="section"><section className="card table-card"><div className="table-scroll"><table><thead><tr><th className="asset-heading">Asset</th><th>Condition</th><th>Threshold</th><th>Latest snapshot</th><th>Current state</th><th/></tr></thead><tbody>{rules.length ? rules.map(({ alert, asset }) => { const current = asset.price === null ? null : Number(asset.price); const target = Number(alert.price); const triggered = current !== null && (alert.direction === 'above' ? current >= target : current <= target); return <tr key={alert.id}><td className="asset-heading"><Link href={`/asset/${asset.id}`} className="inline-link">{asset.name} ({asset.symbol})</Link></td><td>{alert.direction === 'above' ? 'Above' : 'Below'}</td><td>{formatMoney(alert.price, asset.quote_currency ?? 'USD', 6)}</td><td>{formatMoney(asset.price, asset.quote_currency ?? 'USD', 6)}</td><td><span className={`tag ${triggered ? 'warning' : current === null ? 'neutral' : ''}`}>{triggered ? 'Threshold met' : current === null ? 'No current price' : 'Not met'}</span></td><td><button className="button" onClick={() => update(alerts.filter((item) => item.id !== alert.id))}>Remove</button></td></tr>; }) : <tr><td colSpan={6} className="empty-cell">No browser-local alert rules have been created.</td></tr>}</tbody></table></div></section></div></>;
}

function SettingsSection() {
  const [prefs, setPrefs] = useBrowserObject<{ dark: boolean }>(PREFS_KEY, DEFAULT_PREFS);
  const dark = prefs.dark;
  const setTheme = (value: boolean) => { setPrefs({ ...prefs, dark: value }); document.documentElement.classList.toggle('dark-mode', value); window.dispatchEvent(new CustomEvent('falconstats-theme', { detail: value })); };
  return <><PageHeading eyebrow="PREFERENCES" title="Settings" description="Display preferences are stored on this device."/><section className="card settings-card"><div className="settings-row"><div><h2>Appearance</h2><p>Switch between the default light workspace and a dark display.</p></div><button className="button" type="button" onClick={() => setTheme(!dark)}>{dark ? <Sun size={15}/> : <Moon size={15}/>}Use {dark ? 'light' : 'dark'} theme</button></div><div className="settings-row"><div><h2>Quote currency</h2><p>Currency follows the server&apos;s configured CMC_CONVERT and available snapshots.</p></div><span className="tag neutral">Configured by API</span></div><div className="settings-row"><div><h2>Data refresh</h2><p>Use the refresh buttons on market pages to request the latest stored snapshot.</p></div><span className="tag neutral">Manual</span></div><div className="settings-row"><div><h2>Workspace storage</h2><p>Watchlist, quantities, alert rules, and display preferences are saved in this browser only.</p></div><button className="button" type="button" onClick={() => { [WATCH_KEY, PORTFOLIO_KEY, ALERTS_KEY, PREFS_KEY].forEach((key) => localStorage.removeItem(key)); window.dispatchEvent(new Event('falconstats-local-storage')); setTheme(false); }}>Clear local data</button></div></section></>;
}

function ExchangeSection({ resource }: { resource: ReturnType<typeof useApi<GlobalMetrics | null>> }) {
  const metrics = resource.data;
  return <><PageHeading eyebrow="MARKET STRUCTURE" title="Exchanges" description="Exchange coverage is shown only where reported by the current global metrics endpoint."/><DataState meta={resource.meta} error={resource.error} loading={resource.status === 'loading'} onRefresh={resource.refresh}/><section className="grid metrics-grid section"><article className="card metric-card"><div className="metric-label">Active exchanges</div><div className="metric-value">{metrics?.active_exchanges == null ? '—' : Number(metrics.active_exchanges).toLocaleString()}</div><div className="metric-foot">Global count from stored CMC metrics</div></article><article className="card metric-card"><div className="metric-label">Active market pairs</div><div className="metric-value">{metrics?.active_market_pairs == null ? '—' : Number(metrics.active_market_pairs).toLocaleString()}</div><div className="metric-foot">Global count from stored CMC metrics</div></article></section><div className="section"><UnsupportedPanel feature="Exchange directory" icon={Landmark} why="The current internal API exposes an aggregate exchange count only; it has no exchange list, exchange-level volume, or market-pair detail endpoint."/></div></>;
}
