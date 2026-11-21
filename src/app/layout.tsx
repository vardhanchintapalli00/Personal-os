import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: { default: 'LifeOS', template: '%s · LifeOS' },
  description: 'Your personal life operating system: tasks, fitness, food, money, habits and more.',
  applicationName: 'LifeOS',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f6f7fb' }, { media: '(prefers-color-scheme: dark)', color: '#080a12' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
