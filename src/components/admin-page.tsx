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
  const loadStatus = async () => { try { const result = await apiFetch<ProviderStatus>('providers/cmc/status'); setStatus(result.data); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } };
  const loadQuota = async (input?: string) => {
    setBusy(true); setError(null);
    try { if (input !== undefined) sessionStorage.setItem('falconstats-admin-token-v1', input); const result = await adminApiFetch<Record<string, unknown>>('providers/cmc/quota'); setQuota(result.data); setHasToken(true); setMessage('Admin access verified for this browser session.'); }
    catch (e) { setHasToken(false); setQuota(null); setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void loadQuota(token); };
  const trigger = async (path: string, label: string) => { setBusy(true); setError(null); setMessage(null); try { const result = await adminApiFetch<Record<string, unknown>>(path, { method: 'POST' }); setMessage(`${label} accepted by FalconStats: ${JSON.stringify(result.data)}`); if (path.endsWith('key-info')) void loadQuota(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const logout = () => { sessionStorage.removeItem('falconstats-admin-token-v1'); setToken(''); setHasToken(false); setQuota(null); setMessage(null); };
  useEffect(() => {
    let active = true;
    apiFetch<ProviderStatus>('providers/cmc/status').then((result) => { if (active) setStatus(result.data); }).catch((e: unknown) => { if (active) setError((e as Error).message); }).finally(() => { if (active) setLoading(false); });
    const current = sessionStorage.getItem('falconstats-admin-token-v1') ?? '';
    if (current) adminApiFetch<Record<string, unknown>>('providers/cmc/quota').then((result) => { if (active) { setToken(current); setQuota(result.data); setHasToken(true); } }).catch(() => { if (active) sessionStorage.removeItem('falconstats-admin-token-v1'); });
    return () => { active = false; };
  }, []);
  return <><PageHeading eyebrow="OPERATIONS" title="Admin" description="Provider status, quota telemetry, and protected ingestion actions." actions={<button className="button" onClick={() => { void loadStatus(); if (hasToken) void loadQuota(); }}><RefreshCw size={14}/>Refresh status</button>}/>
    <div className="grid two-col admin-grid"><section className="card admin-card"><div className="card-head"><div><h2 className="card-title">CoinMarketCap provider</h2><p className="card-subtitle">Status is read from the actual provider telemetry endpoint.</p></div><Shield size={16} color="#9aabba"/></div>{loading ? <div className="admin-body"><div className="skeleton"/></div> : status ? <div className="snapshot-list">{[['Access mode', status.accessMode ?? '—'], ['Requests · 24h', status.requests_24h ?? 0], ['Credits · 24h', status.credits_24h ?? 0], ['Failures · 24h', status.failures_24h ?? 0], ['Last attempt', formatDate(status.last_attempt_at ?? null)], ['Last successful response', formatDate(status.last_success_at ?? null)], ['Last HTTP status', status.last_http_status ?? '—'], ['Last CMC error', status.last_error_code ?? '—']].map(([label, value]) => <div key={String(label)} className="snapshot-row"><span>{label}</span><b>{String(value)}</b></div>)}</div> : <div className="admin-body">Provider telemetry is unavailable.</div>}</section>
      <section className="card admin-card"><div className="card-head"><div><h2 className="card-title">Protected operations</h2><p className="card-subtitle">Admin credentials remain server-side. Access expires with this browser session.</p></div><KeyRound size={16} color="#9aabba"/></div><div className="admin-body">{hasToken ? <><div className="api-state"><Shield size={15}/><span>Admin access verified. The API key used by the backend is not sent to this page.</span></div><div className="admin-buttons"><button className="button primary" disabled={busy} onClick={() => void trigger('providers/cmc/ingestion/market', 'Ingestion job')}>Queue market ingestion</button><button className="button" disabled={busy} onClick={() => void trigger('providers/cmc/key-info', 'CMC key info request')}>Verify CMC key info</button><button className="button" onClick={logout}>End admin session</button></div></> : <form onSubmit={submit} className="admin-form"><label htmlFor="admin-token">Admin access token</label><input id="admin-token" className="field" type="password" autoComplete="current-password" minLength={32} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter the configured admin access token"/><small>Requires FALCONSTATS_ADMIN_UI_TOKEN in the Next.js server environment and the backend Admin API key. Token is stored in session storage only.</small><button className="button primary" type="submit" disabled={busy || token.length < 32}>Verify access</button></form>}</div></section></div>
    {error ? <div className="api-state error admin-message"><TriangleAlert/><span>{error}</span></div> : null}{message ? <div className="api-state admin-message"><Shield size={15}/><span>{message}</span></div> : null}
    {hasToken ? <section className="section card"><div className="card-head"><div><h2 className="card-title">Provider quota response</h2><p className="card-subtitle">Returned by the protected internal quota endpoint.</p></div></div><pre className="json-response">{quota ? JSON.stringify(quota, null, 2) : 'Quota telemetry is not available.'}</pre></section> : null}
    <div className="section"><UnsupportedPanel feature="Admin user management" icon={TriangleAlert} why="FalconStats does not have user accounts or roles yet. The server-side admin token protects operational actions, but it is not a multi-user identity and access system."/></div>
  </>;
}
