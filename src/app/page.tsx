'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Clock3, Layers3 } from 'lucide-react';
import { MarketCharts, MetricsCards, AssetTable, PageHeading } from '@/components/data-ui';
import { useApi } from '@/components/use-api';
import { apiPaths, type ListingsResponse } from '@/lib/api';
import type { GlobalMetrics } from '@/lib/types';

export default function OverviewPage() {
  const global = useApi<GlobalMetrics | null>(apiPaths.global());
  const [offset, setOffset] = useState(0);
  const listings = useApi<ListingsResponse>(apiPaths.listings(8, offset));
  return <>
    <PageHeading eyebrow="GLOBAL MARKETS" title="Market overview" description="A clear view of the digital asset market, from FalconStats stored snapshots." actions={<Link className="button" href="/markets">Explore markets <ArrowRight size={14}/></Link>}/>
    <MetricsCards {...global}/>
    <section className="section"><MarketCharts metrics={global.data ?? null} assets={listings.data?.items ?? []}/></section>
    <section className="section"><div className="section-head"><div><h2>Market leaders</h2><p>Ranked assets from the latest stored listings snapshot</p></div><Link className="inline-link" href="/markets">All markets <ArrowRight size={13}/></Link></div><AssetTable result={listings.data} loading={listings.status === 'loading'} error={listings.error} meta={listings.meta} refresh={listings.refresh} offset={offset} onPage={setOffset} pageSize={8}/></section>
    <div className="overview-footnotes"><span><Layers3 size={13}/>Historical chart ranges require a time-series endpoint not currently available.</span><span><Clock3 size={13}/>Stale and unavailable data is shown explicitly.</span></div>
  </>;
}
