'use client';
import type { ReactNode } from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { addDays, dayName, longDate, monthDays, parseDay, weekStart } from '@/lib/dates';
import type { DayQuality } from '@/lib/scores';
import { COLORS } from '@/lib/theme';

export const axisProps = {
  tick: { fontSize: 11, fill: COLORS.text },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = { stroke: COLORS.grid, strokeDasharray: '3 3', vertical: false } as const;

export function ChartFrame({ height = 220, children, empty, emptyText = 'No data yet. Log something to see your trend.' }: { height?: number; children: ReactNode; empty?: boolean; emptyText?: string }) {
  if (empty) {
    return <div className="grid place-items-center rounded-xl bg-muted/50 px-4 text-center text-xs text-muted-foreground" style={{ height }}>{emptyText}</div>;
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">{children as never}</ResponsiveContainer>
    </div>
  );
}

export function ChartTooltip({ formatter, labelFormatter }: { formatter?: (v: number, name: string) => ReactNode; labelFormatter?: (l: string) => string }) {
  return (
    <Tooltip
      cursor={{ fill: 'rgb(148 163 184 / 0.12)' }}
      contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12, boxShadow: '0 10px 30px -10px rgb(0 0 0 / .3)' }}
      labelStyle={{ color: 'rgb(var(--muted-foreground))', marginBottom: 2 }}
      itemStyle={{ color: 'rgb(var(--foreground))' }}
      formatter={formatter as never}
      labelFormatter={labelFormatter as never}
    />
  );
}

const QUALITY_CLASS: Record<DayQuality, string> = {
  good: 'bg-success',
  average: 'bg-amber-400',
  bad: 'bg-danger',
  none: 'bg-muted',
};

/** Month calendar showing good / average / bad days. */
export function MonthHeatmap({ month, today, quality, scoreOf, onSelect }: { month: string; today: string; quality: (d: string) => DayQuality; scoreOf?: (d: string) => number | null; onSelect?: (d: string) => void }) {
  const days = monthDays(month);
  const offset = (parseDay(days[0]).getUTCDay() + 6) % 7;
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-muted-foreground">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => <span key={`o${i}`} />)}
        {days.map((d) => {
          const q = d > today ? 'none' : quality(d);
          const sc = scoreOf?.(d);
          return (
            <button key={d} type="button" onClick={() => onSelect?.(d)} title={`${longDate(d)}${sc != null ? `: ${sc}/100` : ': no data'}`}
              className={cn('grid aspect-square place-items-center rounded-lg text-[10px] font-semibold transition hover:scale-105', QUALITY_CLASS[q], q === 'none' ? 'text-muted-foreground/60' : 'text-white', d === today && 'ring-2 ring-study ring-offset-2 ring-offset-card', d > today && 'opacity-40')}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}

export function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {([['bg-success', 'Good'], ['bg-amber-400', 'Average'], ['bg-danger', 'Bad'], ['bg-muted', 'No data']] as const).map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-[4px]', c)} />{l}</span>
      ))}
    </div>
  );
}

/** GitHub-style habit heatmap: columns = weeks, rows = Mon..Sun, shade = % of habits completed. */
export function HabitHeatmap({ today, weeks = 14, valueOf, onSelect }: { today: string; weeks?: number; valueOf: (d: string) => number | null; onSelect?: (d: string) => void }) {
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const shade = (v: number | null, d: string) => {
    if (d > today) return 'bg-transparent';
    if (v == null || v === 0) return 'bg-muted';
    if (v < 34) return 'bg-success/30';
    if (v < 67) return 'bg-success/55';
    if (v < 100) return 'bg-success/80';
    return 'bg-success';
  };
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex min-w-max gap-1">
        <div className="mr-1 grid grid-rows-7 gap-1 text-[9px] text-muted-foreground">{['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => <span key={i} className="flex h-4 items-center">{l}</span>)}</div>
        {cols.map((col, i) => (
          <div key={i} className="grid grid-rows-7 gap-1">
            {col.map((d) => {
              const v = valueOf(d);
              return <button key={d} type="button" onClick={() => onSelect?.(d)} title={`${dayName(d)} ${longDate(d)}: ${v == null ? 'no data' : `${v}% habits`}`} disabled={d > today}
                className={cn('h-4 w-4 rounded-[4px] transition hover:scale-125', shade(v, d), d === today && 'ring-1 ring-study ring-offset-1 ring-offset-card')} />;
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">Less
        {['bg-muted', 'bg-success/30', 'bg-success/55', 'bg-success/80', 'bg-success'].map((c) => <span key={c} className={cn('h-3 w-3 rounded-[3px]', c)} />)} More</div>
    </div>
  );
}
