'use client';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, Bar, BarChart, XAxis, YAxis, ReferenceLine, Legend as RLegend } from 'recharts';
import { Activity, Dumbbell, Flame, Footprints, HeartPulse, Pencil, Plus, Ruler, Scale, Target, Trash2, Trophy, Zap, BedDouble } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, PageHeader, ProgressRing, SectionTitle, StatCard, StreakBadge, Alert } from '@/components/ui';
import { ChartFrame, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { EntityForm, WorkoutForm } from '@/components/forms';
import { WorkoutTimers } from '@/components/timers';
import { useCrud, useDailyLog, useProfileUpdate, useSnapshot } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { ACTIVITY_LEVELS, FITNESS_GOALS } from '@/lib/constants';
import { BODY_FIELDS, REST_TIPS, type FieldDef } from '@/lib/forms';
import { dayName, shortDate, weekDays } from '@/lib/dates';
import { fitnessScore, weeklyFitness, weightProgress, workoutStreak, workoutsOn } from '@/lib/scores';
import { COLORS } from '@/lib/theme';
import { downloadCsv } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { BodyEntry, Workout } from '@/types';

const PROFILE_FIELDS: FieldDef[] = [
  { name: 'age', label: 'Age', type: 'number', min: 10, max: 100 },
  { name: 'heightCm', label: 'Height (cm)', type: 'number', min: 100, max: 250, step: 0.5 },
  { name: 'weightKg', label: 'Current weight (kg)', type: 'number', min: 20, max: 400, step: 0.1 },
  { name: 'targetWeightKg', label: 'Target weight (kg)', type: 'number', min: 20, max: 400, step: 0.1 },
  { name: 'fitnessGoal', label: 'Fitness goal', type: 'select', options: FITNESS_GOALS, required: true, nullable: false },
  { name: 'activityLevel', label: 'Activity level', type: 'select', options: ACTIVITY_LEVELS, required: true, nullable: false },
];

export default function FitnessPage() {
  const { snapshot: s, today } = useSnapshot();
  const wk = useCrud('workouts');
  const body = useCrud('bodyEntries');
  const { save } = useDailyLog();
  const profile = useProfileUpdate();
  const openQuick = useUI((u) => u.openQuick);
  const [editW, setEditW] = useState<Workout | null>(null);
  const [delW, setDelW] = useState<Workout | null>(null);
  const [editB, setEditB] = useState<BodyEntry | null>(null);
  const [delB, setDelB] = useState<BodyEntry | null>(null);
  const [logTimer, setLogTimer] = useState<number | null>(null);
  const [profOpen, setProfOpen] = useState(false);
  const [stepsInput, setStepsInput] = useState('');

  const d = useMemo(() => {
    if (!s) return null;
    const f = weeklyFitness(s, today);
    const w = weightProgress(s);
    const steps = s.dailyLogs.find((l) => l.date === today)?.steps ?? 0;
    const week = weekDays(today).map((x) => ({ label: dayName(x), day: x, minutes: s.workouts.filter((y) => y.completed !== false && y.date === x).reduce((a, y) => a + y.durationMin, 0), calories: s.workouts.filter((y) => y.completed !== false && y.date === x).reduce((a, y) => a + (y.calories ?? 0), 0) }));
    const recent = [...s.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    const weights = s.bodyEntries.filter((b) => b.weightKg != null).map((b) => ({ label: shortDate(b.date), Weight: b.weightKg }));
    const measures = s.bodyEntries.map((b) => ({ label: shortDate(b.date), Chest: b.chest, Waist: b.waist, Arms: b.arms, Thighs: b.thighs }));
    const streak = workoutStreak(s, today);
    const lastThree = [0, 1, 2].map((n) => s.workouts.some((y) => y.completed !== false && y.date === shiftBack(today, n)));
    return { f, w, steps, week, recent, weights, measures, streak, score: fitnessScore(s, today), todayList: workoutsOn(s, today), needsRest: lastThree.every(Boolean) };
  }, [s, today]);

  if (!s || !d) return null;
  const u = s.user;
  const stepGoal = u.stepGoal || 8000;
  const bmi = u.heightCm && u.weightKg ? Math.round((u.weightKg / (u.heightCm / 100) ** 2) * 10) / 10 : null;
  const tip = REST_TIPS[Number(today.slice(8)) % REST_TIPS.length];

  return (
    <div className="space-y-5">
      <PageHeader title="Fitness" icon={Dumbbell} tone="fit" subtitle={`${u.fitnessGoal} · ${u.activityLevel} activity`}
        action={<>
          <Button variant="outline" size="sm" onClick={() => downloadCsv('workouts', s.workouts.map((w) => ({ date: w.date, type: w.type, name: w.name ?? '', minutes: w.durationMin, calories: w.calories ?? '', exercises: w.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}@${e.weightKg}kg`).join(' | ') })))}>CSV</Button>
          <Button variant="fit" onClick={() => openQuick('workout')}><Plus size={17} /> Log workout</Button></>} />

      {/* Rings */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ['Weekly workouts', (d.f.activeDays / d.f.goal) * 100, `${d.f.activeDays}/${d.f.goal}`, 'days', COLORS.fit],
          ['Daily steps', (d.steps / stepGoal) * 100, d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : String(d.steps), `of ${stepGoal / 1000}k`, COLORS.success],
          ['Active minutes', (d.f.minutes / d.f.minGoal) * 100, String(d.f.minutes), `of ${d.f.minGoal}`, COLORS.study],
          ['Weight goal', d.w.pct, `${d.w.pct}%`, d.w.current != null && d.w.target != null ? `${d.w.current} → ${d.w.target}kg` : 'set target', COLORS.movie],
        ] as [string, number, string, string, string][]).map(([l, v, big, small, c]) => (
          <Card key={l} className="flex flex-col items-center p-3.5 text-center">
            <ProgressRing value={v} size={88} stroke={9} color={c}><span className="text-base font-bold tabular-nums">{big}</span></ProgressRing>
            <p className="mt-2 text-xs font-semibold">{l}</p><p className="text-[11px] text-muted-foreground">{small}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Workout streak" icon={Flame} tone="fit" value={<>{d.streak} <span className="text-sm font-medium text-muted-foreground">days</span></>} sub="1 rest day allowed" />
        <StatCard label="Fitness score" icon={Trophy} tone="fit" value={d.score} sub={`consistency ${d.f.consistency}`} />
        <StatCard label="Calories (week)" icon={Zap} tone="fit" value={d.f.calories} sub="kcal burned" />
        <StatCard label="BMI" icon={HeartPulse} tone="success" value={bmi ?? '--'} sub={bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obese range') : 'add height & weight'} />
      </div>

      {d.needsRest ? (
        <Alert tone="fit" icon={BedDouble}><b>Rest-day reminder.</b> You've trained 3 days in a row. Recovery builds strength: {tip}</Alert>
      ) : d.todayList.length === 0 && d.f.activeDays < d.f.goal ? (
        <Alert tone="warn" icon={Activity}>No workout logged today yet. {d.f.goal - d.f.activeDays} to go for this week's goal. Even 20 minutes counts.</Alert>
      ) : null}

      <WorkoutTimers onLog={(m) => setLogTimer(m)} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Steps */}
        <Card>
          <SectionTitle icon={Footprints} tone="success">Steps today</SectionTitle>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold tabular-nums text-success">{d.steps.toLocaleString('en-IN')}</p><p className="mb-1 text-xs text-muted-foreground">/ {stepGoal.toLocaleString('en-IN')} goal</p>
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(stepsInput); if (!Number.isFinite(n) || n < 0 || n > 100000 || stepsInput === '') return; save(today, { steps: Math.round(n) }, 'Steps updated!'); setStepsInput(''); }}>
            <Input type="number" inputMode="numeric" min={0} max={100000} value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} placeholder="Enter total steps today" aria-label="Steps" />
            <Button variant="success" type="submit">Save</Button>
          </form>
        </Card>

        {/* Profile */}
        <Card>
          <SectionTitle icon={Target} tone="fit" action={<Button size="sm" variant="soft" onClick={() => setProfOpen(true)}><Pencil size={13} /> Edit</Button>}>Fitness profile</SectionTitle>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {([['Age', u.age ?? '--'], ['Height', u.heightCm ? `${u.heightCm} cm` : '--'], ['Weight', u.weightKg ? `${u.weightKg} kg` : '--'], ['Target', u.targetWeightKg ? `${u.targetWeightKg} kg` : '--'], ['Goal', u.fitnessGoal], ['Activity', u.activityLevel]] as [string, string | number][]).map(([l, v]) => (
              <div key={l} className="rounded-xl bg-muted/60 px-2 py-2.5"><dt className="text-[10px] text-muted-foreground">{l}</dt><dd className="truncate text-sm font-bold">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Activity} tone="fit" action={<Badge tone="fit">{d.f.consistency}% consistent</Badge>}>This week's activity</SectionTitle>
          <ChartFrame height={200} empty={!d.week.some((x) => x.minutes > 0)} emptyText="Log a workout to see weekly activity.">
            <BarChart data={d.week} margin={{ left: -20, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} />
              <ChartTooltip formatter={(v, n) => `${v} ${n === 'calories' ? 'kcal' : 'min'}`} /><RLegend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="minutes" name="Minutes" fill={COLORS.fit} radius={[6, 6, 0, 0]} /><Bar dataKey="calories" name="Calories" fill="rgb(249 115 22 / .35)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={Scale} tone="fit" action={<Button size="sm" variant="soft" onClick={() => openQuick('body')}><Plus size={13} /> Add</Button>}>Weight progress</SectionTitle>
          <ChartFrame height={200} empty={d.weights.length < 1} emptyText="Add a weight entry to start your chart.">
            <LineChart data={d.weights} margin={{ left: -20, right: 12, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v} kg`} />
              {u.targetWeightKg && <ReferenceLine y={u.targetWeightKg} stroke={COLORS.success} strokeDasharray="4 4" label={{ value: 'Target', fill: COLORS.success, fontSize: 10, position: 'insideTopRight' }} />}
              <Line type="monotone" dataKey="Weight" stroke={COLORS.fit} strokeWidth={3} dot={{ r: 4, fill: COLORS.fit }} />
            </LineChart>
          </ChartFrame>
        </Card>
      </div>

      {/* Measurements */}
      <Card>
        <SectionTitle icon={Ruler} tone="fit" action={<Button size="sm" variant="soft" onClick={() => openQuick('body')}><Plus size={13} /> Log</Button>}>Body measurements (cm)</SectionTitle>
        {s.bodyEntries.length === 0 ? <EmptyState icon={Ruler} tone="fit" title="No measurements yet" text="Track chest, waist, arms and thighs to see progress the scale can't show." action={<Button variant="fit" onClick={() => openQuick('body')}>Add measurements</Button>} /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame height={190} empty={d.measures.length < 2} emptyText="Add one more entry to see trends.">
              <LineChart data={d.measures} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis domain={['dataMin - 2', 'dataMax + 2']} {...axisProps} /><ChartTooltip /><RLegend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="Chest" stroke={COLORS.study} strokeWidth={2} connectNulls /><Line dataKey="Waist" stroke={COLORS.danger} strokeWidth={2} connectNulls />
                <Line dataKey="Arms" stroke={COLORS.fit} strokeWidth={2} connectNulls /><Line dataKey="Thighs" stroke={COLORS.movie} strokeWidth={2} connectNulls />
              </LineChart>
            </ChartFrame>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-xs"><thead className="sticky top-0 bg-muted text-muted-foreground"><tr>{['Date', 'Kg', 'Chest', 'Waist', 'Arms', 'Thigh', ''].map((h) => <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{[...s.bodyEntries].reverse().map((b) => (
                  <tr key={b.id} className="border-t border-border"><td className="px-2 py-1.5">{shortDate(b.date)}</td><td className="px-2">{b.weightKg ?? '-'}</td><td className="px-2">{b.chest ?? '-'}</td><td className="px-2">{b.waist ?? '-'}</td><td className="px-2">{b.arms ?? '-'}</td><td className="px-2">{b.thighs ?? '-'}</td>
                    <td className="whitespace-nowrap px-2 text-right"><button aria-label="Edit entry" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setEditB(b)}><Pencil size={13} /></button><button aria-label="Delete entry" className="p-1 text-muted-foreground hover:text-danger" onClick={() => setDelB(b)}><Trash2 size={13} /></button></td></tr>))}</tbody></table>
            </div>
          </div>
        )}
      </Card>

      {/* Weekly report */}
      <Card>
        <SectionTitle icon={Trophy} tone="fit">Weekly fitness report</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([['Workouts', d.f.count], ['Active min', d.f.minutes], ['Calories', d.f.calories], ['Weight change', d.f.weightChange == null ? '--' : `${d.f.weightChange > 0 ? '+' : ''}${d.f.weightChange} kg`], ['Consistency', `${d.f.consistency}%`]] as [string, string | number][]).map(([l, v]) => (
            <div key={l} className="rounded-xl bg-muted/60 px-3 py-2.5"><p className="text-[11px] text-muted-foreground">{l}</p><p className="text-lg font-bold tabular-nums">{v}</p></div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">💡 Recovery tip: {tip}</p>
      </Card>

      {/* Workout log */}
      <Card>
        <SectionTitle icon={Dumbbell} tone="fit" action={<StreakBadge days={d.streak} label="day streak" />}>Workout log</SectionTitle>
        {d.recent.length === 0 ? <EmptyState icon={Dumbbell} tone="fit" title="No workouts logged" text="Start with a beginner template. Your first workout starts the streak." action={<Button variant="fit" onClick={() => openQuick('workout')}><Plus size={16} /> Log workout</Button>} /> : (
          <ul className="space-y-2">
            {d.recent.map((w) => (
              <li key={w.id} className="rounded-xl bg-muted/60 px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" aria-label="Workout completed" checked={w.completed !== false} onChange={() => wk.update(w.id, { completed: w.completed === false })} className="h-5 w-5 shrink-0 accent-[#22c55e]" />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fit/15 text-fit"><Dumbbell size={18} /></span>
                  <div className="min-w-0 flex-1"><p className={`truncate text-sm font-semibold ${w.completed === false ? 'text-muted-foreground line-through' : ''}`}>{w.name || w.type}</p>
                    <p className="text-xs text-muted-foreground">{w.date === today ? 'Today' : shortDate(w.date)} · {w.type} · {w.durationMin} min{w.calories ? ` · ${w.calories} kcal` : ''} · {w.completed === false ? 'Not completed' : 'Completed'}</p></div>
                  <button aria-label="Edit workout" onClick={() => setEditW(w)} className="rounded-lg p-2 text-muted-foreground hover:bg-card"><Pencil size={15} /></button>
                  <button aria-label="Delete workout" onClick={() => setDelW(w)} className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                </div>
                {w.exercises.length > 0 && <p className={cn('mt-2 text-[11px] text-muted-foreground')}>{w.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}${e.weightKg ? ` @${e.weightKg}kg` : ''}`).join(' · ')}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={logTimer != null} onClose={() => setLogTimer(null)} title="Log timed workout" size="lg">
        {logTimer != null && <WorkoutForm prefill={{ durationMin: logTimer }} onCancel={() => setLogTimer(null)} onSubmit={async (x) => { if (await wk.create(x, { message: 'Workout logged. Streak updated! 🔥' })) setLogTimer(null); }} />}
      </Modal>
      <Modal open={!!editW} onClose={() => setEditW(null)} title="Edit workout" size="lg">
        {editW && <WorkoutForm editing initial={editW} onCancel={() => setEditW(null)} onSubmit={async (x) => { if (await wk.update(editW.id, x, { message: 'Workout updated' })) setEditW(null); }} />}
      </Modal>
      <Modal open={!!editB} onClose={() => setEditB(null)} title="Edit measurements" size="sm">
        {editB && <EntityForm editing tone="fit" fields={BODY_FIELDS} initial={{ ...editB }} onCancel={() => setEditB(null)} onSubmit={async (x) => { if (await body.update(editB.id, x, { message: 'Entry updated' })) setEditB(null); }} />}
      </Modal>
      <Modal open={profOpen} onClose={() => setProfOpen(false)} title="Fitness profile" size="sm">
        <EntityForm editing tone="fit" fields={PROFILE_FIELDS} initial={{ age: u.age ?? '', heightCm: u.heightCm ?? '', weightKg: u.weightKg ?? '', targetWeightKg: u.targetWeightKg ?? '', fitnessGoal: u.fitnessGoal, activityLevel: u.activityLevel }}
          onCancel={() => setProfOpen(false)} onSubmit={async (x) => { if (await profile.update(x, 'Fitness profile saved')) setProfOpen(false); }} />
      </Modal>
      <ConfirmDialog open={!!delW} onClose={() => setDelW(null)} title="Delete this workout?" message="Your streak, weekly totals and fitness score will be recalculated."
        onConfirm={async () => { if (delW) { await wk.remove(delW.id, { message: 'Workout deleted' }); setDelW(null); } }} />
      <ConfirmDialog open={!!delB} onClose={() => setDelB(null)} title="Delete this entry?" message="This measurement entry will be removed from your charts."
        onConfirm={async () => { if (delB) { await body.remove(delB.id, { message: 'Entry deleted' }); setDelB(null); } }} />
    </div>
  );
}

function shiftBack(day: string, n: number) {
  const [y, m, dd] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd - n));
  return t.toISOString().slice(0, 10);
}

