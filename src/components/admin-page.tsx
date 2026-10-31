'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, RefreshCw, Shield, TriangleAlert } from 'lucide-react';
import { adminApiFetch, apiFetch } from '@/lib/api';
import { PageHeading, UnsupportedPanel, formatDate } from './data-ui';
import type { ProviderStatus } from '@/lib/types';

export function AdminPage() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [quota, setQuota] = useState<Record<string, unknown> | null>(null);
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadStatus = async () => { try { const result = await apiFetch<ProviderStatus>('providers/status'); setStatus(result.data); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } };
  const loadQuota = async (input?: string) => {
    setBusy(true); setError(null);
    try { if (input !== undefined) sessionStorage.setItem('falconstats-admin-token-v1', input); const result = await adminApiFetch<Record<string, unknown>>('providers/usage'); setQuota(result.data); setHasToken(true); setMessage('Admin access verified for this browser session.'); }
    catch (e) { setHasToken(false); setQuota(null); setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void loadQuota(token); };
  const trigger = async () => { setBusy(true); setError(null); setMessage(null); try { const result = await adminApiFetch<Record<string, unknown>>('providers/ingestion/market', { method: 'POST' }); setMessage(`Market ingestion accepted: ${JSON.stringify(result.data)}`); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const logout = () => { sessionStorage.removeItem('falconstats-admin-token-v1'); setToken(''); setHasToken(false); setQuota(null); setMessage(null); };
  useEffect(() => {
    let active = true;
    apiFetch<ProviderStatus>('providers/status').then((result) => { if (active) setStatus(result.data); }).catch((e: unknown) => { if (active) setError((e as Error).message); }).finally(() => { if (active) setLoading(false); });
    const current = sessionStorage.getItem('falconstats-admin-token-v1') ?? '';
    if (current) adminApiFetch<Record<string, unknown>>('providers/usage').then((result) => { if (active) { setToken(current); setQuota(result.data); setHasToken(true); } }).catch(() => { if (active) sessionStorage.removeItem('falconstats-admin-token-v1'); });
    return () => { active = false; };
  }, []);
  return <><PageHeading eyebrow="OPERATIONS" title="Admin" description="Provider status, quota telemetry, and protected ingestion actions." actions={<button className="button" onClick={() => { void loadStatus(); if (hasToken) void loadQuota(); }}><RefreshCw size={14}/>Refresh status</button>}/>
    <div className="grid two-col admin-grid"><section className="card admin-card"><div className="card-head"><div><h2 className="card-title">Market data providers</h2><p className="card-subtitle">Status is read from server-side provider telemetry.</p></div><Shield size={16} color="#9aabba"/></div>{loading ? <div className="admin-body"><div className="skeleton"/></div> : status ? <><div className="snapshot-list">{status.providers.map((provider) => <div key={provider.provider} className="snapshot-row"><span>{provider.provider} · {provider.status}</span><b>{provider.last_success_at ? formatDate(provider.last_success_at) : provider.enabled ? 'Awaiting sync' : 'Disabled'}</b></div>)}</div><div className="admin-body">CoinGecko mapped assets: {status.data.assetsWithCoinGeckoIdentity} · global metrics updated: {formatDate(status.data.globalMarketAsOf)}</div></> : <div className="admin-body">Provider telemetry is unavailable.</div>}</section>
      <section className="card admin-card"><div className="card-head"><div><h2 className="card-title">Protected operations</h2><p className="card-subtitle">Admin credentials remain server-side. Access expires with this browser session.</p></div><KeyRound size={16} color="#9aabba"/></div><div className="admin-body">{hasToken ? <><div className="api-state"><Shield size={15}/><span>Admin access verified. The API key used by the backend is not sent to this page.</span></div><div className="admin-buttons"><button className="button primary" disabled={busy} onClick={() => void trigger()}>Queue market ingestion</button><button className="button" onClick={logout}>End admin session</button></div></> : <form onSubmit={submit} className="admin-form"><label htmlFor="admin-token">Admin access token</label><input id="admin-token" className="field" type="password" autoComplete="current-password" minLength={32} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter the configured admin access token"/><small>Requires FALCONSTATS_ADMIN_UI_TOKEN in the Next.js server environment and the backend Admin API key. Token is stored in session storage only.</small><button className="button primary" type="submit" disabled={busy || token.length < 32}>Verify access</button></form>}</div></section></div>
    {error ? <div className="api-state error admin-message"><TriangleAlert/><span>{error}</span></div> : null}{message ? <div className="api-state admin-message"><Shield size={15}/><span>{message}</span></div> : null}
    {hasToken ? <section className="section card"><div className="card-head"><div><h2 className="card-title">Provider usage response</h2><p className="card-subtitle">Monthly usage and CoinGecko safety budget from the protected internal API.</p></div></div><pre className="json-response">{quota ? JSON.stringify(quota, null, 2) : 'Usage telemetry is not available.'}</pre></section> : null}
    <div className="section"><UnsupportedPanel feature="Admin user management" icon={TriangleAlert} why="FalconStats does not have user accounts or roles yet. The server-side admin token protects operational actions, but it is not a multi-user identity and access system."/></div>
  </>;
}
