import { AssetDetailsPage } from '@/components/asset-details-page';

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssetDetailsPage id={id}/>;
}
