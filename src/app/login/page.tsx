import Link from 'next/link';
import { PageHeading, UnsupportedPanel } from '@/components/data-ui';

export default function LoginPage() {
  return <><PageHeading eyebrow="ACCOUNT" title="Sign in" description="Access to synced FalconStats accounts and authentication."/><UnsupportedPanel feature="Account sign-in" why="The current FalconStats backend has no identity provider or login, registration, or session endpoints. Watchlists and workspace preferences can be stored in this browser only."/><div className="section"><Link className="button" href="/">Return to overview</Link></div></>;
}
