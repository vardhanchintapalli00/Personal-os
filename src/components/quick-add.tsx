'use client';
import { useState } from 'react';
import { Droplets, Minus, Plus } from 'lucide-react';
import { Button, Checkbox, Chip, Field, Input, Modal, ProgressRing } from './ui';
import { EntityForm, TaskForm, WorkoutForm } from './forms';
import { useUI, toast } from '@/lib/store';
import { useCrud, useDailyLog, useHabitToggle, useSnapshot } from '@/lib/hooks';
import { BODY_FIELDS, HABIT_FIELDS, MEAL_FIELDS, MOVIE_FIELDS, SAVINGS_FIELDS, expenseFields } from '@/lib/forms';
import { ENERGIES, MOODS, MOOD_EMOJI } from '@/lib/constants';
import { monthMoney, habitDone, habitStreak } from '@/lib/scores';
import { nowTime, sleepHoursBetween, todayStr } from '@/lib/dates';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Meal, Snapshot } from '@/types';

const TITLES: Record<string, string> = {
  task: 'Add task', movie: 'Add movie / series', workout: 'Log workout', meal: 'Log meal', expense: 'Add expense', income: 'Add income',
  habit: 'Habits', sleep: 'Log sleep', water: 'Water intake', mood: 'Mood & energy', body: 'Log body measurements', goal: 'New savings goal',
};

const mealTypeNow = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 19 ? 'Snacks' : 'Dinner';
};

/** Fires the red warnings required when outside food, sugar or junk is logged. */
export function mealWarning(m: Pick<Meal, 'category' | 'hasSugar'>) {
  if (m.category === 'Outside food') return 'Outside food logged. Food discipline score reduced and your no-outside-food streak is reset.';
  if (m.category === 'Junk food') return 'Junk food logged. Food discipline score reduced and your junk-free streak is reset.';
  if (m.category === 'Sugary food' || m.hasSugar) return 'Sugar logged. Food discipline score reduced and your no-sugar streak is reset.';
  if (m.category === 'Cheat meal') return 'Cheat meal logged. Enjoy it, then get back on track!';
  return null;
}

/** Warns when an expense pushes the monthly budget across 70 / 90 / 100%. */
export function budgetCrossingWarning(s: Snapshot, today: string, amount: number, date: string) {
  if (date.slice(0, 7) !== today.slice(0, 7)) return null;
  const m = monthMoney(s, today);
  if (!m.budget) return null;
  const before = (m.spent / m.budget) * 100;
  const after = ((m.spent + amount) / m.budget) * 100;
  for (const band of [100, 90, 70]) {
    if (before < band && after >= band) return `Budget alert: you've now used ${Math.round(after)}% of this month's budget.`;
  }
  return null;
}

export function QuickAdd() {
  const { quick, closeQuick } = useUI();
  const { snapshot: s, today } = useSnapshot();
  const tasks = useCrud('tasks');
  const movies = useCrud('movies');
  const workouts = useCrud('workouts');
  const meals = useCrud('meals');
  const tx = useCrud('transactions');
  const habits = useCrud('habits');
  const body = useCrud('bodyEntries');
  const goals = useCrud('savingsGoals');
  const kind = quick?.kind;
  const initial = quick?.initial ?? {};

  const done = async (p: Promise<unknown>) => { const r = await p; if (r) closeQuick(); };

  let content: React.ReactNode = null;
  if (kind === 'task') content = <TaskForm onCancel={closeQuick} onSubmit={(d) => done(tasks.create({ ...initial, ...d }))} />;
  if (kind === 'movie') content = <EntityForm tone="movie" fields={MOVIE_FIELDS} initial={{ type: 'Movie', status: 'Want to watch', favorite: false, ...initial }} onCancel={closeQuick} onSubmit={(d) => done(movies.create(d))} />;
  if (kind === 'workout') content = <WorkoutForm onCancel={closeQuick} onSubmit={(d) => done(workouts.create(d, { message: 'Workout logged. Weekly streak and fitness score updated!' }))} />;
  if (kind === 'meal') {
    content = (
      <EntityForm tone="success" fields={MEAL_FIELDS} initial={{ date: todayStr(), time: nowTime(), mealType: mealTypeNow(), category: 'Home food', calories: '', protein: '', carbs: '', fats: '', hasSugar: false, ...initial }}
        onCancel={closeQuick}
        onSubmit={(d) => done(meals.create(d, { silent: true }).then((r) => {
          if (!r) return null;
          const w = mealWarning(d as unknown as Meal);
          if (w && d.category !== 'Cheat meal') toast.error(w);
          else toast.success(w ?? 'Meal logged. Food discipline score updated!');
          return r;
        }))} />
    );
  }
  if (kind === 'expense' || kind === 'income') {
    const type = kind;
    content = (
      <EntityForm tone={type === 'income' ? 'success' : 'danger'} fields={expenseFields(type)} submitLabel={type === 'income' ? 'Add income' : 'Add expense'}
        initial={{ date: todayStr(), paymentMethod: 'UPI', category: type === 'income' ? 'Pocket money' : 'Food', recurrence: 'none', ...initial }} onCancel={closeQuick}
        onSubmit={(d) => {
          const warn = type === 'expense' && s ? budgetCrossingWarning(s, today, Number(d.amount), String(d.date)) : null;
          return done(tx.create({ ...d, type }, { silent: Boolean(warn), message: type === 'income' ? 'Income added. Balance updated!' : 'Expense added. Budget updated!' }).then((r) => { if (r && warn) toast.warning(warn); return r; }));
        }} />
    );
  }
  if (kind === 'body') content = <EntityForm tone="fit" fields={BODY_FIELDS} initial={{ date: todayStr(), ...initial }} onCancel={closeQuick} onSubmit={(d) => done(body.create(d, { message: 'Measurements saved. Charts updated!' }))} />;
  if (kind === 'goal') content = <EntityForm tone="success" fields={SAVINGS_FIELDS} initial={{ savedAmount: 0, ...initial }} onCancel={closeQuick} onSubmit={(d) => done(goals.create(d))} />;
  if (kind === 'habit') content = <HabitQuick onClose={closeQuick} create={(d) => habits.create(d, { message: 'Habit created' })} />;
  if (kind === 'sleep') content = <SleepQuick onClose={closeQuick} />;
  if (kind === 'water') content = <WaterQuick />;
  if (kind === 'mood') content = <MoodQuick onClose={closeQuick} />;

  return (
    <Modal open={Boolean(kind)} onClose={closeQuick} title={kind ? TITLES[kind] : ''} size={kind === 'task' || kind === 'workout' ? 'lg' : 'md'}>
      {kind && s ? content : null}
    </Modal>
  );
}

// ---------------------------------------------------------------- Habits
function HabitQuick({ onClose, create }: { onClose: () => void; create: (d: Record<string, unknown>) => Promise<unknown> }) {
  const { snapshot: s, today } = useSnapshot();
  const toggle = useHabitToggle();
  const [adding, setAdding] = useState(false);
  if (!s) return null;
  if (adding) {
    return <EntityForm fields={HABIT_FIELDS} initial={{ icon: '✅', type: 'build', targetPerWeek: 7 }} onCancel={() => setAdding(false)} onSubmit={async (d) => { if (await create(d)) setAdding(false); }} />;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Tap to mark today's habits. Streaks update instantly.</p>
      {s.habits.map((h) => {
        const d = habitDone(s, h.id, today);
        return (
          <button key={h.id} onClick={() => toggle(h.id, today, !d)} className={cn('flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition', d ? 'bg-success/10' : 'bg-muted/60 hover:bg-muted')}>
            <Checkbox checked={d} onChange={(v) => toggle(h.id, today, v)} label={h.name} />
            <span className="text-lg">{h.icon}</span>
            <span className={cn('flex-1 text-sm font-medium', d && 'text-success')}>{h.name}</span>
            <span className="text-xs font-semibold text-fit">🔥 {habitStreak(s, h.id, today)}</span>
          </button>
        );
      })}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setAdding(true)}><Plus size={16} /> New habit</Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sleep
export function SleepQuick({ onClose, date }: { onClose: () => void; date?: string }) {
  const { snapshot: s, today } = useSnapshot();
  const { save, pending } = useDailyLog();
  const day = date ?? today;
  const existing = s?.dailyLogs.find((l) => l.date === day);
  const [bed, setBed] = useState(existing?.bedtime ?? '23:30');
  const [wake, setWake] = useState(existing?.wakeTime ?? '06:30');
  const [quality, setQuality] = useState<number | null>(existing?.sleepQuality ?? null);
  const [override, setOverride] = useState<string>('');
  const hours = override !== '' ? Number(override) : sleepHoursBetween(bed, wake);
  const invalid = !Number.isFinite(hours) || hours <= 0 || hours > 24;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bedtime"><Input type="time" value={bed} onChange={(e) => { setBed(e.target.value); setOverride(''); }} /></Field>
        <Field label="Wake-up time"><Input type="time" value={wake} onChange={(e) => { setWake(e.target.value); setOverride(''); }} /></Field>
      </div>
      <div className="rounded-2xl bg-study/10 p-4 text-center">
        <p className="text-xs text-muted-foreground">Total sleep</p>
        <p className="text-3xl font-bold text-study tabular-nums">{invalid ? '--' : hours}<span className="text-base font-medium"> hours</span></p>
        <input aria-label="Override hours" type="number" step="0.1" min="0" max="24" placeholder="Edit hours manually" value={override} onChange={(e) => setOverride(e.target.value)} className="field mx-auto mt-2 max-w-[11rem] text-center" />
      </div>
      <Field label="Sleep quality">
        <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <Chip key={n} active={quality === n} onClick={() => setQuality(n)}>{'★'.repeat(n)}</Chip>)}</div>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={invalid} loading={pending} onClick={async () => { if (await save(day, { bedtime: bed, wakeTime: wake, sleepHours: hours, sleepQuality: quality }, 'Sleep logged. Life score updated!')) onClose(); }}>Save sleep</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Water
export function WaterQuick() {
  const { snapshot: s, today } = useSnapshot();
  const { save } = useDailyLog();
  if (!s) return null;
  const goal = s.user.waterGoal || 8;
  const glasses = s.dailyLogs.find((l) => l.date === today)?.water ?? 0;
  const set = (n: number) => {
    const v = Math.max(0, Math.min(40, n));
    save(today, { water: v }, false);
    if (v >= goal && glasses < goal) toast.success('Water goal reached. Great hydration! 💧');
  };
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <ProgressRing value={(glasses / goal) * 100} size={140} stroke={12} color={COLORS.study}>
        <div><Droplets className="mx-auto text-study" size={22} /><p className="text-2xl font-bold tabular-nums">{glasses}<span className="text-sm font-medium text-muted-foreground">/{goal}</span></p><p className="text-[11px] text-muted-foreground">glasses</p></div>
      </ProgressRing>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => set(glasses - 1)} aria-label="Remove a glass"><Minus size={18} /></Button>
        <Button size="lg" onClick={() => set(glasses + 1)}><Plus size={18} /> Add a glass</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Mood
export function MoodQuick({ onClose, date }: { onClose: () => void; date?: string }) {
  const { snapshot: s, today } = useSnapshot();
  const { save, pending } = useDailyLog();
  const day = date ?? today;
  const ex = s?.dailyLogs.find((l) => l.date === day);
  const [mood, setMood] = useState<string | null>(ex?.mood ?? null);
  const [energy, setEnergy] = useState<string | null>(ex?.energy ?? null);
  return (
    <div className="space-y-5">
      <Field label="How are you feeling?">
        <div className="grid grid-cols-3 gap-2">
          {MOODS.map((m) => (
            <button key={m} onClick={() => setMood(m)} className={cn('rounded-2xl border py-3 text-center transition', mood === m ? 'border-study bg-study/10' : 'border-border hover:bg-muted')}>
              <span className="block text-2xl">{MOOD_EMOJI[m]}</span><span className="text-xs font-medium">{m}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Energy level"><div className="flex gap-2">{ENERGIES.map((e) => <Chip key={e} tone="fit" active={energy === e} onClick={() => setEnergy(e)}>{e}</Chip>)}</div></Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!mood && !energy} loading={pending} onClick={async () => { if (await save(day, { ...(mood ? { mood } : {}), ...(energy ? { energy } : {}) } as never, 'Mood saved. Life score updated!')) onClose(); }}>Save</Button>
      </div>
    </div>
  );
}
