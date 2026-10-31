'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, Bell, Bot, ChartCandlestick, ChevronRight, Compass, FlaskConical, LayoutDashboard, Menu, Newspaper, Search, Settings2, Shield, Sparkles,
  Star, Tags, WalletCards, X, Landmark,
} from 'lucide-react';

const marketNav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/markets', label: 'Markets', icon: ChartCandlestick },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/exchanges', label: 'Exchanges', icon: Landmark },
  { href: '/defi', label: 'DeFi ecosystem', icon: Landmark },
  { href: '/derivatives', label: 'Derivatives', icon: Activity },
];
const researchNav = [
  { href: '/research', label: 'Research & news', icon: Newspaper },
  { href: '/ai-insights', label: 'AI insights', icon: Bot },
  { href: '/screener', label: 'Screener', icon: FlaskConical },
  { href: '/signals', label: 'Signals', icon: Sparkles },
];
const workspaceNav = [
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/portfolio', label: 'Portfolio', icon: WalletCards },
  { href: '/alerts', label: 'Alerts', icon: Bell },
];

function NavGroup({ title, links, pathname, onNavigate }: { title?: string; links: typeof marketNav; pathname: string; onNavigate: () => void }) {
  return <div className="nav-group">{title ? <p className="nav-caption">{title}</p> : null}{links.map(({ href, label, icon: Icon }) => {
    const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`} onClick={onNavigate} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true" />{label}</Link>;
  })}</div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    let isDark = false;
    try { isDark = JSON.parse(localStorage.getItem('falconstats-preferences-v1') ?? '{}').dark === true; } catch { isDark = false; }
    document.documentElement.classList.toggle('dark-mode', isDark);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('global-search')?.focus(); }
    };
    const onTheme = (event: Event) => { const value = (event as CustomEvent<boolean>).detail; document.documentElement.classList.toggle('dark-mode', value); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('falconstats-theme', onTheme);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('falconstats-theme', onTheme); };
  }, []);
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (search.trim()) { router.push(`/markets?search=${encodeURIComponent(search.trim())}`); setMobileOpen(false); } };
  const closeMenu = () => setMobileOpen(false);
  return <div className="shell">
    <div className={`mobile-backdrop${mobileOpen ? ' visible' : ''}`} onClick={closeMenu} aria-hidden="true" />
    <aside className={`sidebar${mobileOpen ? ' open' : ''}`} aria-label="Main navigation">
      <Link className="brand" href="/" aria-label="FalconStats home"><span className="brand-mark"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M4 25.5 12 17l5 4 9-11 6 4-10 13-6-4-8 7z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round"/><path d="M25 10h7v7" fill="none" stroke="currentColor" strokeWidth="2.6"/></svg></span><span>falcon<span className="brand-accent">stats</span></span></Link>
      <div className="workspace-label">MARKET INTELLIGENCE</div>
      <NavGroup links={marketNav} pathname={pathname} onNavigate={closeMenu} />
      <NavGroup title="RESEARCH" links={researchNav} pathname={pathname} onNavigate={closeMenu} />
      <NavGroup title="YOUR SPACE" links={workspaceNav} pathname={pathname} onNavigate={closeMenu} />
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><b>Data with context</b><p>Every market value shows its source and timestamp. Unsupported data stays clearly labeled.</p></div>
      <div className="nav-group">
        <Link className={`nav-item${pathname === '/settings' ? ' active' : ''}`} href="/settings" onClick={closeMenu}><Settings2 aria-hidden="true"/>Settings</Link>
        <Link className={`nav-item${pathname === '/admin' ? ' active' : ''}`} href="/admin" onClick={closeMenu}><Shield aria-hidden="true"/>Admin</Link>
      </div>
      <div className="profile"><span className="avatar">F</span><span className="profile-text"><b>Guest workspace</b><span>Local preferences only</span></span></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <button type="button" className="menu-toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X/> : <Menu/>}</button>
        <div className="breadcrumb"><span>FalconStats</span><span>/</span><b>{routeName(pathname)}</b></div>
        <div className="top-actions">
          <form className="global-search" role="search" onSubmit={submitSearch}><Search size={15} aria-hidden="true"/><input id="global-search" type="search" aria-label="Search markets" placeholder="Search assets..." value={search} onChange={(event) => setSearch(event.target.value)}/><kbd>⌘ K</kbd></form>
          <Link className="icon-action" href="/alerts" aria-label="Open alerts"><Bell/></Link>
          <Link className="icon-action" href="/login" aria-label="Sign in"><Compass/></Link>
        </div>
      </header>
      <div className="content">{children}<footer className="content-footer"><span>FalconStats · global market data by <a href="https://www.coingecko.com" target="_blank" rel="noreferrer">CoinGecko</a> · exchange data by Binance/Bybit · DeFi data by DeFiLlama · information only</span><Link href="/admin">API status <ChevronRight size={12} aria-hidden="true"/></Link></footer></div>
    </main>
  </div>;
}

function routeName(path: string) {
  if (path.startsWith('/asset/')) return 'Asset details';
  const route = [...marketNav, ...researchNav, ...workspaceNav, { href: '/login', label: 'Sign in', icon: Compass }, { href: '/admin', label: 'Admin', icon: Shield }, { href: '/settings', label: 'Settings', icon: Settings2 }].find((item) => item.href === path);
  return route?.label ?? 'Market intelligence';
}
