'use client';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend as RLegend, Line, LineChart, XAxis, YAxis } from 'recharts';
import { BookOpen, Brain, ChevronLeft, ChevronRight, Droplets, Flame, Minus, Moon, Monitor, Pencil, Plus, Smile, Sparkles, Trash2, Zap } from 'lucide-react';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, ProgressBar, ProgressRing, SectionTitle, Segmented, StatCard, StreakBadge, Textarea } from '@/components/ui';
import { ChartFrame, ChartTooltip, HabitHeatmap, MonthHeatmap, axisProps, gridProps } from '@/components/charts';
import { EntityForm, RatingPicker } from '@/components/forms';
import { MoodQuick, SleepQuick } from '@/components/quick-add';
import { useCrud, useDailyLog, useHabitToggle, useSnapshot } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { ENERGY_VALUE, MOOD_EMOJI, MOOD_VALUE } from '@/lib/constants';
import { HABIT_FIELDS } from '@/lib/forms';
import { addDays, dayName, fmtTime12, lastNDays, longDate, monthLabel, monthStart, shiftMonth, shortDate, weekDays } from '@/lib/dates';
import { dayQuality, habitConsistency, habitDone, habitStatsForDay, habitStreak, lifeScore, sleepScore, weeklyLifeScore } from '@/lib/scores';
import { COLORS, scoreColor } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { DailyLog, Habit } from '@/types';

export default function LifePage() {
  const { snapshot: s, today } = useSnapshot();
  const [date, setDate] = useState(today);
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [calMonth, setCalMonth] = useState(monthStart(today));
  const [sleepOpen, setSleepOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [delHabit, setDelHabit] = useState<Habit | null>(null);
  const habitsCrud = useCrud('habits');
  const toggle = useHabitToggle();
  const { save } = useDailyLog();
  const openQuick = useUI((u) => u.openQuick);

  const log = s?.dailyLogs.find((l) => l.date === date);
  const chartDays = useMemo(() => (range === 'week' ? weekDays(date) : lastNDays(date, 30)), [range, date]);

  const stats = useMemo(() => {
    if (!s) return null;
    const days = range === 'week' ? weekDays(today).filter((d) => d <= today) : lastNDays(today, 30);
    const logs = s.dailyLogs.filter((l) => days.includes(l.date));
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    return {
      today: lifeScore(s, today),
      week: weeklyLifeScore(s, today),
      sleepAvg: avg(logs.filter((l) => l.sleepHours != null).map((l) => l.sleepHours!)),
      waterAvg: avg(logs.filter((l) => l.water != null).map((l) => l.water!)),
      studyTotal: avg([logs.reduce((a, l) => a + (l.studyHours ?? 0), 0)]),
      habits: habitConsistency(s, days),
    };
  }, [s, today, range]);

  const moodData = useMemo(() => !s ? [] : chartDays.map((d) => {
    const l = s.dailyLogs.find((x) => x.date === d);
    return { label: range === 'week' ? dayName(d) : String(Number(d.slice(8))), day: d, Mood: l?.mood ? Math.round((MOOD_VALUE[l.mood] / 5) * 100) : null, Energy: l?.energy ? Math.round((ENERGY_VALUE[l.energy] / 3) * 100) : null };
  }), [s, chartDays, range]);

  const screenData = useMemo(() => !s ? [] : chartDays.map((d) => {
    const l = s.dailyLogs.find((x) => x.date === d);
    const h = (m?: number | null) => Math.round(((m ?? 0) / 60) * 10) / 10;
    return { label: range === 'week' ? dayName(d) : String(Number(d.slice(8))), Phone: h(l?.screenPhoneMin), Laptop: h(l?.screenLaptopMin), Social: h(l?.screenSocialMin), Gaming: h(l?.screenGamingMin), Entertainment: h(l?.screenEntertainMin) };
  }), [s, chartDays, range]);

  if (!s || !stats) return null;
  const goal = s.user.waterGoal || 8;
  const water = log?.water ?? 0;
  const dayScore = lifeScore(s, date);
  const hs = habitStatsForDay(s, date);
  const isToday = date === today;

  return (
    <div className="space-y-5">
      <PageHeader title="Daily Life" icon={Sparkles} tone="success" subtitle="Sleep, focus, mood, habits and your life score"
        action={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></Button>
            <button onClick={() => setDate(today)} className="px-2 text-xs font-semibold">{isToday ? 'Today' : shortDate(date)}</button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></Button>
          </div>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3.5"><div className="flex items-center gap-3">
          <ProgressRing value={dayScore ?? 0} size={64} stroke={7} color={scoreColor(dayScore)}><span className="text-sm font-bold">{dayScore ?? '--'}</span></ProgressRing>
          <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{isToday ? "Today's" : 'Day'} score</p><p className="text-sm font-semibold">{dayScore == null ? 'Log something' : dayScore >= 70 ? 'Great day' : dayScore >= 45 ? 'Average' : 'Needs work'}</p></div></div></Card>
        <StatCard label="Weekly life score" value={stats.week ?? '--'} tone="success" icon={Sparkles} sub="avg of logged days" />
        <StatCard label={`Sleep avg (${range === 'week' ? '7d' : '30d'})`} value={stats.sleepAvg != null ? `${stats.sleepAvg}h` : '--'} tone="study" icon={Moon} sub={`target ${s.user.sleepTarget}h`} />
        <StatCard label={`Water avg`} value={stats.waterAvg != null ? `${stats.waterAvg}` : '--'} tone="study" icon={Droplets} sub={`glasses · goal ${goal}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sleep + mood */}
        <Card>
          <SectionTitle icon={Moon} tone="study" action={<Button size="sm" variant="soft" onClick={() => setSleepOpen(true)}>{log?.sleepHours != null ? 'Edit' : 'Log sleep'}</Button>}>Sleep</SectionTitle>
          {log?.sleepHours != null ? (
            <div className="flex items-center gap-4"><p className="text-4xl font-bold tabular-nums text-study">{log.sleepHours}<span className="text-base font-medium text-muted-foreground">h</span></p>
              <div className="space-y-0.5 text-xs text-muted-foreground"><p>{fmtTime12(log.bedtime)} → {fmtTime12(log.wakeTime)}</p><p>Quality {log.sleepQuality ? '★'.repeat(log.sleepQuality) : '--'} · score {sleepScore(s, date) ?? '--'}</p></div></div>
          ) : <p className="text-sm text-muted-foreground">No sleep logged for this day.</p>}
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><Smile size={16} className="text-fit" /> Mood & energy</p><Button size="sm" variant="soft" onClick={() => setMoodOpen(true)}>{log?.mood || log?.energy ? 'Edit' : 'Log'}</Button></div>
            <div className="mt-2 flex gap-2">{log?.mood ? <Badge tone="fit">{MOOD_EMOJI[log.mood]} {log.mood}</Badge> : <span className="text-xs text-muted-foreground">No mood yet</span>}{log?.energy && <Badge tone="fit"><Zap size={11} /> {log.energy} energy</Badge>}</div>
          </div>
        </Card>

        {/* Water */}
        <Card>
          <SectionTitle icon={Droplets} tone="study">Water intake</SectionTitle>
          <div className="flex items-center gap-5">
            <ProgressRing value={(water / goal) * 100} size={96} stroke={10} color={COLORS.study}><div className="text-center"><p className="text-xl font-bold tabular-nums">{water}</p><p className="text-[10px] text-muted-foreground">of {goal}</p></div></ProgressRing>
            <div className="flex-1 space-y-3">
              <ProgressBar value={(water / goal) * 100} tone="study" label="Water" />
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="Remove glass" disabled={water <= 0} onClick={() => save(date, { water: water - 1 }, false)}><Minus size={16} /></Button>
                <Button className="flex-1" onClick={() => save(date, { water: water + 1 }, water + 1 === goal ? 'Water goal reached! 💧' : false)}><Plus size={16} /> Add glass</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <DayLogForm key={`${date}-${log?.id ?? 'new'}`} date={date} log={log} onSave={(d) => save(date, d, 'Daily log saved. Life score updated!')} />

      {/* Habits */}
      <Card>
        <SectionTitle icon={Flame} tone="success" action={<div className="flex items-center gap-2"><Badge tone="success">{hs.done}/{hs.total} done</Badge><Button size="sm" variant="soft" onClick={() => openQuick('habit')}><Plus size={14} /> New</Button></div>}>Habits · {isToday ? 'today' : longDate(date)}</SectionTitle>
        {s.habits.length === 0 ? <EmptyState icon={Flame} tone="success" title="No habits yet" text="Create habits like Reading, Coding or No sugar." action={<Button variant="success" onClick={() => openQuick('habit')}><Plus size={16} /> Add habit</Button>} /> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.habits.map((h) => {
              const d = habitDone(s, h.id, date);
              const st = habitStreak(s, h.id, today);
              return (
                <li key={h.id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition', d ? 'bg-success/10' : 'bg-muted/60')}>
                  <Checkbox checked={d} onChange={(v) => toggle(h.id, date, v)} label={h.name} />
                  <span className="text-lg">{h.icon}</span>
                  <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', d && 'text-success')}>{h.name}</span>
                  <StreakBadge days={st} />
                  <button aria-label="Edit habit" onClick={() => setEditHabit(h)} className="text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  <button aria-label="Delete habit" onClick={() => setDelHabit(h)} className="text-muted-foreground hover:text-danger"><Trash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Charts */}
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Trends</h2><Segmented value={range} onChange={setRange} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: '30 days' }]} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Smile} tone="fit">Mood & energy trend</SectionTitle>
          <ChartFrame height={200} empty={!moodData.some((x) => x.Mood != null || x.Energy != null)} emptyText="Log your mood to see the trend.">
            <LineChart data={moodData} margin={{ left: -24, right: 8, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={range === 'month' ? 4 : 0} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}%`} /><RLegend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Mood" stroke={COLORS.movie} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Energy" stroke={COLORS.fit} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={Monitor} tone="study">Screen time (hours)</SectionTitle>
          <ChartFrame height={200} empty={!screenData.some((x) => x.Phone + x.Laptop + x.Social + x.Gaming + x.Entertainment > 0)} emptyText="Log screen time below to see it here.">
            <BarChart data={screenData} margin={{ left: -24, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={range === 'month' ? 4 : 0} /><YAxis {...axisProps} />
              <ChartTooltip formatter={(v) => `${v} h`} /><RLegend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Phone" stackId="a" fill={COLORS.study} /><Bar dataKey="Laptop" stackId="a" fill="#06b6d4" /><Bar dataKey="Social" stackId="a" fill={COLORS.danger} />
              <Bar dataKey="Gaming" stackId="a" fill={COLORS.fit} /><Bar dataKey="Entertainment" stackId="a" fill={COLORS.movie} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setCalMonth(shiftMonth(calMonth, -1))}><ChevronLeft size={18} /></Button>
            <p className="text-sm font-semibold">{monthLabel(calMonth)} · life score calendar</p>
            <Button variant="ghost" size="icon" aria-label="Next month" disabled={calMonth >= monthStart(today)} onClick={() => setCalMonth(shiftMonth(calMonth, 1))}><ChevronRight size={18} /></Button>
          </div>
          <MonthHeatmap month={calMonth} today={today} quality={(d) => dayQuality(lifeScore(s, d))} scoreOf={(d) => lifeScore(s, d)} onSelect={(d) => d <= today && setDate(d)} />
        </Card>
        <Card>
          <SectionTitle icon={Brain} tone="success">Habit consistency</SectionTitle>
          <div className="mb-3 flex items-end gap-2"><p className="text-3xl font-bold text-success tabular-nums">{stats.habits ?? '--'}<span className="text-base">%</span></p><p className="mb-1 text-xs text-muted-foreground">of habits completed</p></div>
          <HabitHeatmap today={today} weeks={12} valueOf={(d) => (s.habits.length ? habitStatsForDay(s, d).pct : null)} onSelect={setDate} />
        </Card>
      </div>

      <SleepModal open={sleepOpen} onClose={() => setSleepOpen(false)} date={date} />
      <Modal open={moodOpen} onClose={() => setMoodOpen(false)} title="Mood & energy" size="sm">{moodOpen && <MoodQuick date={date} onClose={() => setMoodOpen(false)} />}</Modal>
      <Modal open={!!editHabit} onClose={() => setEditHabit(null)} title="Edit habit" size="sm">
        {editHabit && <EntityForm editing fields={HABIT_FIELDS} initial={{ ...editHabit }} onCancel={() => setEditHabit(null)} onSubmit={async (d) => { if (await habitsCrud.update(editHabit.id, d, { message: 'Habit updated' })) setEditHabit(null); }} />}
      </Modal>
      <ConfirmDialog open={!!delHabit} onClose={() => setDelHabit(null)} title="Delete this habit?" message={`"${delHabit?.name}" and its whole streak history will be removed.`}
        onConfirm={async () => { if (delHabit) { await habitsCrud.remove(delHabit.id, { message: 'Habit deleted' }); setDelHabit(null); } }} />
    </div>
  );
}

function SleepModal({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  return <Modal open={open} onClose={onClose} title="Log sleep" size="sm">{open && <SleepQuick date={date} onClose={onClose} />}</Modal>;
}

/** Study/focus, screen time and journal for one day. */
function DayLogForm({ date, log, onSave }: { date: string; log?: DailyLog; onSave: (d: Partial<DailyLog>) => Promise<unknown> }) {
  const [v, setV] = useState({
    studyHours: log?.studyHours?.toString() ?? '', studySubject: log?.studySubject ?? '', focusRating: log?.focusRating ?? null as number | null,
    screenPhoneMin: log?.screenPhoneMin?.toString() ?? '', screenLaptopMin: log?.screenLaptopMin?.toString() ?? '', screenSocialMin: log?.screenSocialMin?.toString() ?? '',
    screenGamingMin: log?.screenGamingMin?.toString() ?? '', screenEntertainMin: log?.screenEntertainMin?.toString() ?? '', steps: log?.steps?.toString() ?? '',
    wentWell: log?.wentWell ?? '', improve: log?.improve ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof v, val: string | number | null) => setV((p) => ({ ...p, [k]: val }));
  const numOrNull = (x: string) => (x === '' ? null : Number(x));

  const submit = async () => {
    const study = numOrNull(v.studyHours);
    if (study != null && (study < 0 || study > 24)) return setErr('Study hours must be between 0 and 24.');
    for (const k of ['screenPhoneMin', 'screenLaptopMin', 'screenSocialMin', 'screenGamingMin', 'screenEntertainMin'] as const) {
      const n = numOrNull(v[k]);
      if (n != null && (n < 0 || n > 1440)) return setErr('Screen time must be between 0 and 1440 minutes.');
    }
    setErr('');
    setBusy(true);
    try {
      await onSave({
        studyHours: study, studySubject: v.studySubject.trim() || null, focusRating: v.focusRating,
        screenPhoneMin: numOrNull(v.screenPhoneMin), screenLaptopMin: numOrNull(v.screenLaptopMin), screenSocialMin: numOrNull(v.screenSocialMin),
        screenGamingMin: numOrNull(v.screenGamingMin), screenEntertainMin: numOrNull(v.screenEntertainMin), steps: numOrNull(v.steps),
        wentWell: v.wentWell.trim() || null, improve: v.improve.trim() || null,
      });
    } finally { setBusy(false); }
  };

  const screen: [keyof typeof v, string][] = [['screenPhoneMin', 'Phone'], ['screenLaptopMin', 'Laptop'], ['screenSocialMin', 'Social media'], ['screenGamingMin', 'Gaming'], ['screenEntertainMin', 'Entertainment']];
  return (
    <Card>
      <SectionTitle icon={BookOpen} tone="study">Focus, screen time & journal · {longDate(date)}</SectionTitle>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Study / focus hours"><Input type="number" inputMode="decimal" step="0.25" min={0} max={24} value={v.studyHours} onChange={(e) => set('studyHours', e.target.value)} placeholder="2.5" /></Field>
            <Field label="Subject / skill"><Input value={v.studySubject} onChange={(e) => set('studySubject', e.target.value)} placeholder="DSA, React..." maxLength={80} /></Field>
          </div>
          <Field label="Focus rating"><RatingPicker max={5} value={v.focusRating} onChange={(n) => set('focusRating', n)} /></Field>
          <Field label="Steps today"><Input type="number" inputMode="numeric" min={0} value={v.steps} onChange={(e) => set('steps', e.target.value)} placeholder="8000" /></Field>
          <div><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Screen time (minutes)</span>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{screen.map(([k, l]) => <label key={k} className="text-[11px] font-medium text-muted-foreground">{l}<Input type="number" inputMode="numeric" min={0} max={1440} value={v[k] as string} onChange={(e) => set(k, e.target.value)} className="mt-0.5" placeholder="0" /></label>)}</div></div>
        </div>
        <div className="space-y-3.5">
          <Field label="What went well today?"><Textarea rows={4} value={v.wentWell} onChange={(e) => set('wentWell', e.target.value)} placeholder="Wins, big or small..." maxLength={2000} /></Field>
          <Field label="What can I improve tomorrow?"><Textarea rows={4} value={v.improve} onChange={(e) => set('improve', e.target.value)} placeholder="One thing to do better..." maxLength={2000} /></Field>
        </div>
      </div>
      {err && <p className="mt-3 text-sm font-medium text-danger" role="alert">{err}</p>}
      <div className="mt-4 flex justify-end"><Button variant="success" loading={busy} onClick={submit}>Save daily log</Button></div>
    </Card>
  );
}

