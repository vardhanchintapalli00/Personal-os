import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export const clampPct = (n: number) => Math.max(0, Math.min(100, n));
export const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
