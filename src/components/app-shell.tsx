'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Bell, CheckSquare, Clapperboard, Dumbbell, Home, LogOut, Menu, Moon, Plus, Sparkles, Sun, User, Utensils, Wallet, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTick, useSnapshot } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { buildNotifications, dueReminders } from '@/lib/notifications';
import { nowTime } from '@/lib/dates';
import { api } from '@/lib/api';
import { precacheApp } from '@/lib/offline';
import { ErrorState, PageSkeleton, Spinner, TONE_SOFT, type Tone } from './ui';
import { QuickAdd } from './quick-add';

interface NavItem { href: string; label: string; icon: LucideIcon; tone: Tone }
export const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, tone: 'study' },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, tone: 'study' },
  { href: '/movies', label: 'Movies', icon: Clapperboard, tone: 'movie' },
  { href: '/life', label: 'Life', icon: Sparkles, tone: 'success' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, tone: 'fit' },
  { href: '/food', label: 'Food', icon: Utensils, tone: 'success' },
  { href: '/money', label: 'Money', icon: Wallet, tone: 'success' },
  { href: '/reports', label: 'Reports', icon: BarChart3, tone: 'study' },
  { href: '/profile', label: 'Profile', icon: User, tone: 'neutral' },
];
const MOBILE_MAIN = ['/', '/tasks', '/fitness', '/food', '/money'];

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { snapshot: s, isLoading, error, refetch, today } = useSnapshot();
  useEffect(() => {
    if (!isLoading) { (window as unknown as { __lifeosReady?: boolean }).__lifeosReady = true; window.dispatchEvent(new Event('lifeos:ready')); }
  }, [isLoading]);
  const { setTheme, resolvedTheme } = useTheme();
  const { moreOpen, setMoreOpen, openQuick } = useUI();
  const now = useTick(15_000);
  const synced = useRef(false);

  // Apply the saved theme preference once data arrives.
  useEffect(() => {
    if (s && !synced.current) { synced.current = true; if (s.user.theme && s.user.theme !== 'system') setTheme(s.user.theme); }
  }, [s, setTheme]);

  // Once per session, save every page on the device so the whole app also opens offline.
  const loaded = Boolean(s);
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      try { if (sessionStorage.getItem('lifeos-precached')) return; sessionStorage.setItem('lifeos-precached', '1'); } catch { /* ignore */ }
      precacheApp(NAV.map((n) => n.href).concat('/onboarding'));
    }, 2500);
    return () => clearTimeout(id);
  }, [loaded]);

  // First-time users go through onboarding.
  useEffect(() => {
    if (s && !s.user.onboarded && path !== '/onboarding') router.replace('/onboarding');
  }, [s, path, router]);

  // Browser reminders for tasks (fires once per task/day when permission is granted).
  const fired = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!s || typeof Notification === 'undefined' || Notification.permission !== 'granted' || s.user.notifications?.tasks === false) return;
    for (const r of dueReminders(s, now, today)) {
      if (fired.current.has(r.key)) continue;
      fired.current.add(r.key);
      try { new Notification(r.title, { body: r.body, icon: '/icon.svg' }); } catch { /* ignore */ }
    }
  }, [s, Math.floor(now.getTime() / 30000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    api('/api/profile', { method: 'PATCH', json: { theme: next } }).catch(() => null);
  };

  if (path === '/onboarding') {
    return <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">{isLoading ? <Spinner className="mx-auto mt-20" /> : children}</main>;
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/80 p-4 backdrop-blur lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-study to-movie text-white"><Sparkles size={18} /></span>
          <span className="text-lg font-bold tracking-tight">LifeOS</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive(path, n.href) ? `${TONE_SOFT[n.tone]} font-semibold` : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <n.icon size={19} /> {n.label}
            </Link>
          ))}
        </nav>
        {s && (
          <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3">
            <Avatar name={s.user.name} image={s.user.image} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.user.name}</p><p className="truncate text-[11px] text-muted-foreground">{s.user.location ?? s.user.email}</p></div>
            <button aria-label="Sign out" onClick={() => signOut({ callbackUrl: '/login' })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card"><LogOut size={16} /></button>
          </div>
        )}
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-background px-4 lg:bg-background/80 lg:px-8 lg:backdrop-blur">
        <div className="flex items-center gap-1 lg:hidden">
          <button onClick={() => setMoreOpen(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-xl text-foreground transition hover:bg-muted"><Menu size={21} /></button>
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-study to-movie text-white"><Sparkles size={16} /></span>
            <span className="font-bold">LifeOS</span>
          </Link>
        </div>
        <p className="hidden text-sm text-muted-foreground lg:block">{NAV.find((n) => isActive(path, n.href))?.label}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => openQuick('task')} className="mr-1 hidden items-center gap-1.5 rounded-xl bg-study px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 lg:flex"><Plus size={15} /> Quick add</button>
          <button onClick={toggleTheme} aria-label="Toggle dark mode" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted">
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {s && <NotificationBell nowHm={nowTime(now)} />}
          {s && <Link href="/profile" aria-label="Profile" className="ml-1 rounded-full ring-2 ring-transparent transition hover:ring-study/40"><Avatar name={s.user.name} image={s.user.image} size={32} /></Link>}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
        {isLoading ? <PageSkeleton /> : !s ? <ErrorState message={(error as Error)?.message} retry={() => refetch()} /> : <div key={path} className="page-enter">{children}</div>}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-2 pb-safe pt-1.5 lg:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.filter((n) => MOBILE_MAIN.includes(n.href)).map((n) => {
            const active = isActive(path, n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} className={cn('flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition', active ? 'text-study' : 'text-muted-foreground')}>
                  <span className={cn('grid h-7 w-12 place-items-center rounded-full transition', active && 'bg-study/12')}><n.icon size={20} /></span>{n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} path={path} name={s?.user.name} email={s?.user.email} />
      <QuickAdd />
    </div>
  );
}

function MoreSheet({ open, onClose, path, name, email }: { open: boolean; onClose: () => void; path: string; name?: string; email?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-card p-4 pb-safe shadow-pop" initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', stiffness: 340, damping: 34 }}>
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-study to-movie text-white"><Sparkles size={18} /></span>LifeOS</span>
              <button onClick={onClose} aria-label="Close menu" className="p-1 text-muted-foreground"><X size={20} /></button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={onClose} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive(path, n.href) ? `${TONE_SOFT[n.tone]} font-semibold` : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  <n.icon size={19} /> {n.label}
                </Link>
              ))}
            </nav>
            {name && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-muted/70 p-3">
                <Avatar name={name} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-[11px] text-muted-foreground">{email}</p></div>
                <button aria-label="Sign out" onClick={() => signOut({ callbackUrl: '/login' })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card"><LogOut size={16} /></button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Avatar({ name, image, size = 36 }: { name: string; image?: string | null; size?: number }) {
  if (image) return <img src={image} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-study to-movie font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
    </span>
  );
}

function NotificationBell({ nowHm }: { nowHm: string }) {
  const { snapshot: s, today } = useSnapshot();
  const { readNotifications, markRead } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => (s ? buildNotifications(s, today, nowHm) : []), [s, today, nowHm]);
  const unread = items.filter((i) => !readNotifications.includes(i.id));

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return;
    await Notification.requestPermission();
    setOpen(false);
  };
  const dotTone = { danger: 'bg-danger', warn: 'bg-amber-500', info: 'bg-study', success: 'bg-success' } as const;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted">
        <Bell size={18} />
        {unread.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">{unread.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-3 top-16 z-50 max-h-[70dvh] overflow-hidden rounded-2xl border border-border bg-card shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unread.length > 0 && <button className="text-xs font-semibold text-study" onClick={() => markRead(items.map((i) => i.id))}>Mark all read</button>}
            </div>
            <div className="max-h-[50dvh] overflow-y-auto">
              {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up. 🎉</p> : items.map((n) => (
                <Link key={n.id} href={n.href} onClick={() => { markRead([n.id]); setOpen(false); }} className={cn('flex gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-muted/60', readNotifications.includes(n.id) && 'opacity-55')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotTone[n.tone])} />
                  <span><span className="block text-sm font-semibold">{n.title}</span><span className="text-xs text-muted-foreground">{n.text}</span></span>
                </Link>
              ))}
            </div>
            {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
              <button onClick={askPermission} className="w-full border-t border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold text-study">Enable browser reminders for tasks</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
