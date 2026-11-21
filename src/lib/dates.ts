import { addDays, parseDay } from './recurrence';
export { addDays, parseDay };

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's calendar day in the user's local time zone ("YYYY-MM-DD"). */
export function todayStr(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const nowTime = (now = new Date()) => `${pad(now.getHours())}:${pad(now.getMinutes())}`;

/** Monday of the week containing `day`. Weeks run Monday -> Sunday. */
export function weekStart(day: string): string {
  const dow = (parseDay(day).getUTCDay() + 6) % 7; // Mon=0
  return addDays(day, -dow);
}
export const weekDays = (day: string): string[] => {
  const s = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};
export const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
export const daysInMonth = (day: string) => {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const monthDays = (day: string): string[] => {
  const s = monthStart(day);
  return Array.from({ length: daysInMonth(day) }, (_, i) => addDays(s, i));
};
export const lastNDays = (end: string, n: number): string[] => Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
export const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
export const diffDays = (a: string, b: string) => Math.round((parseDay(a).getTime() - parseDay(b).getTime()) / 86400000);

export function shiftMonth(day: string, n: number): string {
  const [y, m] = day.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayName = (d: string) => DAYS[parseDay(d).getUTCDay()];
export const shortDate = (d: string) => `${parseDay(d).getUTCDate()} ${MONTHS[parseDay(d).getUTCMonth()]}`;
export const monthLabel = (d: string) => `${MONTHS[parseDay(d).getUTCMonth()]} ${parseDay(d).getUTCFullYear()}`;
export const longDate = (d: string) => `${dayName(d)}, ${shortDate(d)} ${parseDay(d).getUTCFullYear()}`;

export function relativeDay(d: string, today: string): string {
  const n = diffDays(d, today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return shortDate(d);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

export function fmtTime12(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Hours slept between bedtime and wake time ("HH:mm"), handling crossing midnight. */
export function sleepHoursBetween(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

const CURRENCY_LOCALE: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' };
export function money(n: number, currency = 'INR', compact = false): string {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard',
    }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

export const dayOfYear = (d: string) => diffDays(d, `${d.slice(0, 4)}-01-01`);
