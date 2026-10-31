import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FalconStats — Market Intelligence', template: '%s | FalconStats' },
  description: 'Digital asset market information with source, timestamp, and data freshness clearly shown.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
