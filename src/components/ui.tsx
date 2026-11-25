'use client';
import Link from 'next/link';
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle, Flame, type LucideIcon } from 'lucide-react';
import { cn, clampPct } from '@/lib/utils';
import { useUI } from '@/lib/store';

export type Tone = 'success' | 'danger' | 'study' | 'movie' | 'fit' | 'neutral' | 'warn';

export const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success', danger: 'text-danger', study: 'text-study', movie: 'text-movie', fit: 'text-fit',
  neutral: 'text-muted-foreground', warn: 'text-amber-500',
};
export const TONE_BG: Record<Tone, string> = {
  success: 'bg-success', danger: 'bg-danger', study: 'bg-study', movie: 'bg-movie', fit: 'bg-fit',
  neutral: 'bg-muted-foreground', warn: 'bg-amber-500',
};
export const TONE_SOFT: Record<Tone, string> = {
  success: 'bg-success/12 text-success', danger: 'bg-danger/12 text-danger', study: 'bg-study/12 text-study',
  movie: 'bg-movie/12 text-movie', fit: 'bg-fit/12 text-fit', neutral: 'bg-muted text-muted-foreground', warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};
export const TONE_HEX: Record<Tone, string> = {
  success: '#10b981', danger: '#ef4444', study: '#3b82f6', movie: '#8b5cf6', fit: '#f97316', neutral: '#94a3b8', warn: '#f59e0b',
};

// ------------------------------------------------------------------ Card
export function Card({ className, href, onClick, children, hover }: { className?: string; href?: string; onClick?: () => void; children: ReactNode; hover?: boolean }) {
  const cls = cn('card p-4 animate-fade-in', (href || onClick || hover) && 'transition hover:-translate-y-0.5 hover:shadow-pop cursor-pointer text-left block w-full', className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  if (onClick) return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()} className={cls}>{children}</div>;
  return <div className={cls}>{children}</div>;
}

export function SectionTitle({ children, action, icon: Icon, tone = 'neutral' }: { children: ReactNode; action?: ReactNode; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <span className={cn('grid h-7 w-7 place-items-center rounded-lg', TONE_SOFT[tone])}><Icon size={15} /></span>}
        {children}
      </h3>
      {action}
    </div>
  );
}

// ------------------------------------------------------------------ Button
type BtnVariant = 'primary' | 'success' | 'danger' | 'fit' | 'movie' | 'outline' | 'ghost' | 'soft';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-study text-white hover:brightness-110 shadow-sm',
  success: 'bg-success text-white hover:brightness-110 shadow-sm',
  danger: 'bg-danger text-white hover:brightness-110 shadow-sm',
  fit: 'bg-fit text-white hover:brightness-110 shadow-sm',
  movie: 'bg-movie text-white hover:brightness-110 shadow-sm',
  outline: 'border border-border bg-card hover:bg-muted',
  ghost: 'hover:bg-muted',
  soft: 'bg-muted hover:bg-border/70',
};
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' | 'icon'; loading?: boolean }
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...p }, ref) {
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-base gap-2', icon: 'h-9 w-9' };
  return (
    <button ref={ref} disabled={disabled || loading} className={cn('inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50', BTN[variant], sizes[size], className)} {...p}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});

// ------------------------------------------------------------------ Badge
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5', TONE_SOFT[tone], className)}>{children}</span>;
}

export function StreakBadge({ days, label, tone = 'fit' }: { days: number; label?: string; tone?: Tone }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', TONE_SOFT[tone])}>
      <Flame size={13} /> {days}{label ? ` ${label}` : 'd'}
    </span>
  );
}

// ------------------------------------------------------------------ Form fields
export function Field({ label, error, hint, children, className }: { label?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] font-medium text-danger" role="alert">{error}</span>}
    </label>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn('field', className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} rows={3} className={cn('field resize-y', className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return <select ref={ref} className={cn('field appearance-none bg-[length:1rem] pr-9', className)} {...p}>{children}</select>;
});

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-success' : 'bg-border')}>
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

export function Checkbox({ checked, onChange, tone = 'success', label }: { checked: boolean; onChange: (v: boolean) => void; tone?: Tone; label?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition active:scale-90', checked ? `${TONE_BG[tone]} border-transparent text-white` : 'border-border bg-card hover:border-muted-foreground')}>
      {checked && <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></motion.svg>}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-muted p-1', className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', value === o.value ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, tone = 'study' }: { active?: boolean; onClick?: () => void; children: ReactNode; tone?: Tone }) {
  return (
    <button onClick={onClick} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition', active ? `${TONE_BG[tone]} border-transparent text-white` : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Progress
export function ProgressBar({ value, tone = 'study', height = 8, className, label }: { value: number; tone?: Tone; height?: number; className?: string; label?: string }) {
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-muted', className)} style={{ height }} role="progressbar" aria-valuenow={Math.round(clampPct(value))} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div className={cn('h-full rounded-full', TONE_BG[tone])} initial={false} animate={{ width: `${clampPct(value)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  );
}

export function ProgressRing({ value, size = 72, stroke = 8, color = '#3b82f6', children, className }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={false} animate={{ strokeDashoffset: c * (1 - clampPct(value) / 100) }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------ Stat card
export function StatCard({ label, value, sub, icon: Icon, tone = 'study', href, onClick, children, className }: { label: string; value: ReactNode; sub?: ReactNode; icon?: LucideIcon; tone?: Tone; href?: string; onClick?: () => void; children?: ReactNode; className?: string }) {
  return (
    <Card href={href} onClick={onClick} className={cn('p-3.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-bold leading-tight tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TONE_SOFT[tone])}><Icon size={18} /></span>}
      </div>
      {children}
    </Card>
  );
}

// ------------------------------------------------------------------ Page header
export function PageHeader({ title, subtitle, action, icon: Icon, tone = 'study' }: { title: string; subtitle?: ReactNode; action?: ReactNode; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', TONE_SOFT[tone])}><Icon size={22} /></span>}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ States
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('animate-spin text-muted-foreground', className)} />;
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} />;

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-1/2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action, tone = 'study' }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center animate-fade-in">
      <span className={cn('mb-3 grid h-14 w-14 place-items-center rounded-2xl', TONE_SOFT[tone])}><Icon size={26} /></span>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="mx-auto mt-10 flex max-w-sm flex-col items-center text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-danger/12 text-danger"><XCircle size={26} /></span>
      <p className="font-semibold">We couldn't load your data</p>
      <p className="mt-1 text-sm text-muted-foreground">{message ?? 'Please check your connection and try again.'}</p>
      {retry && <Button className="mt-4" onClick={retry}>Try again</Button>}
    </div>
  );
}

// ------------------------------------------------------------------ Modal & Confirm
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];
  // Rendered straight into <body> so no page animation or layer can ever hide it behind the top bar or bottom menu.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-card shadow-pop sm:rounded-3xl', width)}
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3 pb-safe">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/12 text-danger"><AlertTriangle size={20} /></span>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Toaster
const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const TOAST_COLOR = { success: 'text-success', error: 'text-danger', info: 'text-study', warning: 'text-amber-500' };
export function Toaster() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:top-auto lg:items-end lg:pr-6" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.kind];
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-pop">
              <Icon size={20} className={TOAST_COLOR[t.kind]} />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-muted-foreground"><X size={16} /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function Alert({ tone, children, icon: Icon = AlertTriangle, className }: { tone: Tone; children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium', TONE_SOFT[tone], className)} role="status">
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
