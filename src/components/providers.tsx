'use client';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from './ui';
import { toast } from '@/lib/store';
import { flushQueue } from '@/lib/api';

export const CACHE_KEY = 'lifeos-cache-v1';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function OfflineBar() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[80] bg-amber-500 px-3 py-1 text-center text-xs font-semibold text-black">
      You are offline. Showing saved data; changes save when you are back online.
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 30_000, gcTime: 7 * 24 * 60 * 60 * 1000, networkMode: 'offlineFirst' },
          mutations: { networkMode: 'always' },
        },
      }),
  );

  // Restore the last saved data (so the app opens instantly, even offline) and keep saving it.
  useIsoLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) hydrate(client, JSON.parse(raw));
    } catch { /* ignore */ }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = client.getQueryCache().subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const state = dehydrate(client, { shouldDehydrateQuery: (q) => q.state.status === 'success' && q.queryKey[0] === 'snapshot' });
          localStorage.setItem(CACHE_KEY, JSON.stringify(state));
        } catch { /* storage full or unavailable */ }
      }, 1000);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [client]);

  // Hide the start-up splash (it stays at least ~1 second so it never just blinks).
  useEffect(() => {
    const el = document.getElementById('splash');
    if (!el) return;
    const id = setTimeout(() => el.classList.add('hide'), Math.max(0, 1000 - performance.now()));
    return () => clearTimeout(id);
  }, []);

  // Send changes saved while offline as soon as the internet is back, then refresh the data.
  useEffect(() => {
    const sync = () => { void flushQueue(); };
    const done = (e: Event) => {
      client.invalidateQueries({ queryKey: ['snapshot'] });
      toast.success(`Back online: ${(e as CustomEvent<number>).detail} saved change${(e as CustomEvent<number>).detail === 1 ? '' : 's'} synced`);
    };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('lifeos:synced', done);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('lifeos:synced', done); };
  }, [client]);

  // Offline support: register the service worker (production only).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={client}>
          {children}
          <Toaster />
          <OfflineBar />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
