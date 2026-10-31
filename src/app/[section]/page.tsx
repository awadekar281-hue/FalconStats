import { SectionRoute } from '@/components/section-route';

export function generateStaticParams() {
  return ['markets', 'categories', 'exchanges', 'derivatives', 'defi', 'research', 'ai-insights', 'screener', 'signals', 'watchlist', 'portfolio', 'alerts', 'settings'].map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <SectionRoute section={section}/>;
}
