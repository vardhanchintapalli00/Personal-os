// Brand colours as hex for Recharts (Tailwind classes use the CSS variables in globals.css).
export const COLORS = {
  success: '#10b981', // green: healthy, savings, completed
  danger: '#ef4444',  // red: overdue, junk, overspending
  study: '#3b82f6',   // blue: productivity & study
  movie: '#8b5cf6',   // purple: entertainment
  fit: '#f97316',     // orange: fitness & energy
  amber: '#f59e0b',
  grid: 'rgb(148 163 184 / 0.25)',
  text: '#94a3b8',
} as const;

export const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#a855f7'];

export const scoreColor = (n: number | null | undefined) => (n == null ? COLORS.text : n >= 70 ? COLORS.success : n >= 45 ? COLORS.amber : COLORS.danger);
