'use client';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend as RLegend, Line, LineChart, XAxis, YAxis } from 'recharts';
import { BarChart3, CheckCircle2, CircleCheck, Download, FileText, Lightbulb, Medal, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, PageHeader, ProgressRing, SectionTitle, Segmented, StatCard, type Tone } from '@/components/ui';
import { ChartFrame, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { useSnapshot } from '@/lib/hooks';
import { toast } from '@/lib/store';
import { ENERGY_VALUE, MOOD_VALUE } from '@/lib/constants';
import { dayName, longDate, money, shortDate } from '@/lib/dates';
import { buildInsights } from '@/lib/insights';
import { downloadCsv, downloadPdf } from '@/lib/export';
import { foodScore, habitStatsForDay, lifeScore, noOutsideStreak, noSugarStreak, periodReport, spentOn, taskStatsForDay, workoutsOn } from '@/lib/scores';
import { COLORS, scoreColor } from '@/lib/theme';
import { cn } from '@/lib/utils';

const TONE: Record<string, Tone> = { good: 'success', warn: 'warn', bad: 'danger', tip: 'study' };
const ICON: Record<string, string> = { good: '✅', warn: '⚠️', bad: '🚨', tip: '💡' };

export default function ReportsPage() {
  const { snapshot: s, today } = useSnapshot();
  const [kind, setKind] = useState<'week' | 'month'>('week');
  const [busy, setBusy] = useState(false);

  const r = useMemo(() => (s ? periodReport(s, kind, today) : null), [s, kind, today]);
  const insights = useMemo(() => (s ? buildInsights(s, today) : []), [s, today]);
  const series = useMemo(() => {
    if (!s || !r) return null;
    const label = (d: string) => (kind === 'week' ? dayName(d) : String(Number(d.slice(8))));
    return r.days.map((d) => {
      const l = s.dailyLogs.find((x) => x.date === d);
      const t = taskStatsForDay(s, d);
      return {
        label: label(d), day: d,
        Tasks: t.pct, Done: t.done,
        Minutes: workoutsOn(s, d).reduce((a, w) => a + w.durationMin, 0),
        Food: foodScore(s, d), Spent: spentOn(s, d),
        Habits: s.habits.length ? habitStatsForDay(s, d).pct : null,
        Life: lifeScore(s, d),
        Mood: l?.mood ? Math.round((MOOD_VALUE[l.mood] / 5) * 100) : null,
        Energy: l?.energy ? Math.round((ENERGY_VALUE[l.energy] / 3) * 100) : null,
      };
    });
  }, [s, r, kind]);

  if (!s || !r || !series) return null;
  const cur = s.user.currency;
  const scores: [string, number | null, string][] = [
    ['Life score', r.lifeScore, COLORS.study], ['Productivity', r.productivity, COLORS.study], ['Fitness', r.fitness, COLORS.fit],
    ['Food discipline', r.food, COLORS.success], ['Money discipline', r.money, COLORS.success], ['Sleep quality', r.sleep, COLORS.movie], ['Habits', r.habits, COLORS.success],
  ];
  const intervalFor = kind === 'month' ? 4 : 0;

  const pdf = async () => { setBusy(true); try { await downloadPdf(s); toast.success('PDF report downloaded'); } catch { toast.error('Could not create the PDF. Try CSV instead.'); } finally { setBusy(false); } };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & Insights" icon={BarChart3} tone="study" subtitle={`${longDate(r.from)} → ${shortDate(r.to)}`}
        action={<>
          <Segmented value={kind} onChange={setKind} options={[{ value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }]} />
          <Button variant="outline" size="sm" loading={busy} onClick={pdf}><FileText size={15} /> PDF</Button>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(`report-${kind}`, series.map((x) => ({ date: x.day, tasksPct: x.Tasks ?? '', workoutMin: x.Minutes, foodScore: x.Food ?? '', spent: x.Spent, habitsPct: x.Habits ?? '', lifeScore: x.Life ?? '' })))}><Download size={15} /> CSV</Button></>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {scores.map(([l, v, c]) => (
          <Card key={l} className="flex flex-col items-center p-3 text-center">
            <ProgressRing value={v ?? 0} size={70} stroke={8} color={v == null ? COLORS.text : l === 'Life score' || l === 'Productivity' || l === 'Fitness' ? c : scoreColor(v)}><span className="text-base font-bold tabular-nums">{v ?? '--'}</span></ProgressRing>
            <p className="mt-1.5 text-[11px] font-semibold">{l}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle icon={Medal} tone="fit">Best & worst day</SectionTitle>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 rounded-xl bg-success/10 px-3.5 py-3"><TrendingUp className="text-success" size={20} /><div><p className="text-xs text-muted-foreground">Best day</p><p className="text-sm font-bold">{r.best ? `${dayName(r.best.day)}, ${shortDate(r.best.day)} · ${r.best.score}` : '--'}</p></div></div>
            <div className="flex items-center gap-3 rounded-xl bg-danger/10 px-3.5 py-3"><TrendingDown className="text-danger" size={20} /><div><p className="text-xs text-muted-foreground">Worst day</p><p className="text-sm font-bold">{r.worst ? `${dayName(r.worst.day)}, ${shortDate(r.worst.day)} · ${r.worst.score}` : '--'}</p></div></div>
            <div className="rounded-xl bg-muted/60 px-3.5 py-3"><p className="text-xs text-muted-foreground">Most completed category</p><p className="text-sm font-bold">{r.topCategory ?? '--'}</p></div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-3">
          <StatCard label="Tasks completed" value={r.tasksCompleted} icon={CheckCircle2} tone="study" />
          <StatCard label="Workouts" value={r.workouts} icon={BarChart3} tone="fit" />
          <StatCard label="Study hours" value={`${r.studyHours}h`} icon={BarChart3} tone="study" />
          <StatCard label="Expenses" value={money(r.expenses, cur)} icon={BarChart3} tone="danger" />
          <StatCard label="Savings" value={money(r.savings, cur)} icon={BarChart3} tone={r.savings >= 0 ? 'success' : 'danger'} sub="income − expenses" />
          <StatCard label="Movies completed" value={r.moviesCompleted} icon={BarChart3} tone="movie" />
          <StatCard label="Habits maintained" value={r.habitsMaintained} icon={CircleCheck} tone="success" sub="check-ins" />
          <StatCard label="No sugar streak" value={`${noSugarStreak(s, today)}d`} icon={BarChart3} tone="danger" />
          <StatCard label="No outside food" value={`${noOutsideStreak(s, today)}d`} icon={BarChart3} tone="danger" />
        </div>
      </div>

      <Card>
        <SectionTitle icon={Lightbulb} tone="fit">Personalised suggestions</SectionTitle>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {insights.map((i, k) => (
            <li key={k} className={cn('flex gap-3 rounded-xl px-3.5 py-3 text-sm', i.tone === 'good' ? 'bg-success/10' : i.tone === 'bad' ? 'bg-danger/10' : i.tone === 'warn' ? 'bg-amber-500/10' : 'bg-study/10')}>
              <span>{ICON[i.tone]}</span><span className="font-medium">{i.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={CheckCircle2} tone="study">{kind === 'week' ? 'Weekly' : 'Monthly'} productivity</SectionTitle>
          <ChartFrame height={200} empty={!series.some((x) => x.Tasks != null)}>
            <BarChart data={series} margin={{ left: -24, right: 4, top: 4 }}><CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={intervalFor} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}%`} /><Bar dataKey="Tasks" fill={COLORS.study} radius={[5, 5, 0, 0]} /></BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={BarChart3} tone="fit">Fitness (active minutes)</SectionTitle>
          <ChartFrame height={200} empty={!series.some((x) => x.Minutes > 0)}>
            <BarChart data={series} margin={{ left: -24, right: 4, top: 4 }}><CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={intervalFor} /><YAxis {...axisProps} />
              <ChartTooltip formatter={(v) => `${v} min`} /><Bar dataKey="Minutes" fill={COLORS.fit} radius={[5, 5, 0, 0]} /></BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={BarChart3} tone="success">Food discipline</SectionTitle>
          <ChartFrame height={200} empty={!series.some((x) => x.Food != null)}>
            <BarChart data={series} margin={{ left: -24, right: 4, top: 4 }}><CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={intervalFor} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}/100`} /><Bar dataKey="Food" radius={[5, 5, 0, 0]}>{series.map((e) => <Cell key={e.day} fill={scoreColor(e.Food)} />)}</Bar></BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={BarChart3} tone="danger">Money: daily spending</SectionTitle>
          <ChartFrame height={200} empty={!series.some((x) => x.Spent > 0)}>
            <AreaChart data={series} margin={{ left: -14, right: 8, top: 4 }}>
              <defs><linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.danger} stopOpacity={0.35} /><stop offset="100%" stopColor={COLORS.danger} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={intervalFor} /><YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <ChartTooltip formatter={(v) => money(Number(v), cur)} /><Area type="monotone" dataKey="Spent" stroke={COLORS.danger} strokeWidth={2.5} fill="url(#rs)" /></AreaChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={BarChart3} tone="success">Habit consistency</SectionTitle>
          <ChartFrame height={200} empty={!s.habits.length || !series.some((x) => x.Habits)}>
            <LineChart data={series} margin={{ left: -24, right: 8, top: 4 }}><CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={intervalFor} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}%`} /><Line dataKey="Habits" stroke={COLORS.success} strokeWidth={3} dot={{ r: 3 }} connectNulls /></LineChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={BarChart3} tone="movie">Mood & energy</SectionTitle>
          <ChartFrame height={200} empty={!series.some((x) => x.Mood != null || x.Energy != null)}>
            <LineChart data={series} margin={{ left: -24, right: 8, top: 4 }}><CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={intervalFor} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}%`} /><RLegend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="Mood" stroke={COLORS.movie} strokeWidth={2.5} dot={{ r: 3 }} connectNulls /><Line dataKey="Energy" stroke={COLORS.fit} strokeWidth={2.5} dot={{ r: 3 }} connectNulls /></LineChart>
          </ChartFrame>
        </Card>
      </div>
      <p className="text-center text-xs text-muted-foreground">Reports use live data. A new week or month starts automatically while all history is kept.{' '}<Badge tone="neutral">{r.days.length} days analysed</Badge></p>
    </div>
  );
}
