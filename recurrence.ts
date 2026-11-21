// Pure date helpers for "YYYY-MM-DD" strings (no time zone surprises).

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDay(d);
}

export function addMonths(s: string, n: number): string {
  const d = parseDay(s);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return fmtDay(d);
}

export function nextOccurrence(
  due: string,
  recurrence: string,
  interval?: number | null,
): string | null {
  switch (recurrence) {
    case 'daily':
      return addDays(due, 1);
    case 'weekly':
      return addDays(due, 7);
    case 'monthly':
      return addMonths(due, 1);
    case 'custom':
      return addDays(due, Math.max(1, interval ?? 1));
    default:
      return null;
  }
}
