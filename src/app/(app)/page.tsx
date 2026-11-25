'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Brain, CheckCircle2, CheckSquare, Clapperboard, Droplets, Dumbbell, Flame, Moon, PiggyBank, Plus, ShoppingBag, Smile, Utensils, Wallet, Zap, Sparkles, Ban, Home as HomeIcon } from 'lucide-react';
import { Card, ProgressBar, ProgressRing, SectionTitle, StatCard, StreakBadge, Badge } from '@/components/ui';
import { ChartFrame, ChartTooltip, HabitHeatmap, axisProps, gridProps } from '@/components/charts';
import { useNow, useSnapshot } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { QUOTES, MOOD_EMOJI } from '@/lib/constants';
import { COLORS } from '@/lib/theme';
import { dayName, dayOfYear, greeting, longDate, lastNDays, money, monthDays, weekDays, shortDate } from '@/lib/dates';
import {
  dayNutrition, foodScore, habitStatsForDay, habitStreak, monthMoney, noOutsideStreak, noSugarStreak, overallLifeScore,
  spentOn, taskStatsForDay, weeklyFitness, workoutsOn, workoutStreak,
} from '@/lib/scores';
import type { QuickKind } from '@/lib/store';
import { cn } from '@/lib/utils';

const QUICK: { kind: QuickKind; label: string; icon: typeof Plus; cls: string }[] = [
  { kind: 'task', label: 'Task', icon: CheckSquare, cls: 'bg-study/12 text-study' },
  { kind: 'movie', label: 'Movie', icon: Clapperboard, cls: 'bg-movie/12 text-movie' },
  { kind: 'workout', label: 'Workout', icon: Dumbbell, cls: 'bg-fit/12 text-fit' },
  { kind: 'meal', label: 'Meal', icon: Utensils, cls: 'bg-success/12 text-success' },
  { kind: 'expense', label: 'Expense', icon: Wallet, cls: 'bg-danger/12 text-danger' },
  { kind: 'habit', label: 'Habit', icon: Flame, cls: 'bg-success/12 text-success' },
  { kind: 'sleep', label: 'Sleep', icon: Moon, cls: 'bg-study/12 text-study' },
  { kind: 'water', label: 'Water', icon: Droplets, cls: 'bg-study/12 text-study' },
  { kind: 'mood', label: 'Mood', icon: Smile, cls: 'bg-fit/12 text-fit' },
];

export default function HomePage() {
  const { snapshot: s, today } = useSnapshot();
  const now = useNow();
  const openQuick = useUI((u) => u.openQuick);

  const d = useMemo(() => {
    if (!s) return null;
    const week = weekDays(today);
    const log = s.dailyLogs.find((l) => l.date === today);
    const sleepLog = log?.sleepHours != null ? log : s.dailyLogs.find((l) => l.date === lastNDays(today, 2)[0]);
    const nut = dayNutrition(s, today);
    const m = monthMoney(s, today);
    const wk = weeklyFitness(s, today);
    return {
      life: overallLifeScore(s, today),
      tasks: taskStatsForDay(s, today),
      workouts: workoutsOn(s, today),
      water: log?.water ?? 0,
      food: foodScore(s, today),
      sugar: noSugarStreak(s, today),
      outside: noOutsideStreak(s, today),
      spentToday: spentOn(s, today),
      m, nut, wk, log, sleepLog,
      habits: habitStatsForDay(s, today),
      watching: s.movies.filter((x) => x.status === 'Watching'),
      bestHabit: s.habits.map((h) => ({ h, n: habitStreak(s, h.id, today) })).sort((a, b) => b.n - a.n)[0],
      wStreak: workoutStreak(s, today),
      weekTasks: week.map((x) => ({ label: dayName(x).slice(0, 1), day: x, value: taskStatsForDay(s, x).pct ?? 0, has: taskStatsForDay(s, x).total > 0 })),
      weekWork: week.map((x) => ({ label: dayName(x).slice(0, 1), day: x, value: s.workouts.filter((w) => w.completed !== false && w.date === x).reduce((a, w) => a + w.durationMin, 0) })),
      weekFood: week.map((x) => ({ label: dayName(x).slice(0, 1), day: x, value: foodScore(s, x) })),
      monthSpend: monthDays(today).filter((x) => x <= today).map((x) => ({ label: String(Number(x.slice(8))), day: x, value: spentOn(s, x) })),
    };
  }, [s, today]);

  if (!s || !d) return null;
  const first = s.user.name.split(' ')[0];
  const quote = QUOTES[(dayOfYear(today) + Number(today.slice(0, 4))) % QUOTES.length];
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const cur = s.user.currency;
  const waterGoal = s.user.waterGoal || 8;
  const workedOut = d.workouts.length > 0;

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-study via-movie to-fit p-5 text-white shadow-pop sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">{longDate(today)}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{greeting(now)}, {first} 👋</h1>
            <p className="mt-0.5 font-mono text-lg tabular-nums text-white/90">{timeStr}</p>
            <p className="mt-3 max-w-md text-sm italic text-white/85">“{quote}”</p>
          </div>
          <Link href="/reports" className="flex items-center gap-4 self-start rounded-2xl bg-white/15 p-3 pr-5 backdrop-blur transition hover:bg-white/25 sm:self-auto" aria-label={`Life score ${d.life} out of 100`}>
            <ProgressRing value={d.life} size={92} stroke={9} color="#fff"><span className="text-2xl font-bold tabular-nums">{d.life}</span></ProgressRing>
            <div><p className="text-xs font-medium uppercase tracking-wide text-white/75">Life Score</p>
              <p className="text-sm font-semibold">{d.life >= 70 ? 'Crushing it' : d.life >= 45 ? 'Keep going' : 'Time to reset'}</p></div>
          </Link>
        </div>
        <Sparkles className="absolute -right-6 -top-6 h-40 w-40 text-white/10" />
      </section>

      {/* Quick add */}
      <section aria-label="Quick add" className="-mx-4 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
        <div className="flex gap-2.5 lg:grid lg:grid-cols-9">
          {QUICK.map((q) => (
            <button key={q.kind} onClick={() => openQuick(q.kind)} className="flex min-w-[4.6rem] flex-1 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-[11px] font-semibold shadow-card transition hover:-translate-y-0.5 active:scale-95">
              <span className={cn('grid h-9 w-9 place-items-center rounded-xl', q.cls)}><q.icon size={18} /></span>{q.label}
            </button>
          ))}
        </div>
      </section>

      {/* Primary stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card href="/tasks" className="p-3.5">
          <div className="flex items-center gap-3">
            <ProgressRing value={d.tasks.pct ?? 0} size={58} stroke={6} color={COLORS.study}><span className="text-xs font-bold">{d.tasks.pct ?? 0}%</span></ProgressRing>
            <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tasks today</p><p className="text-lg font-bold tabular-nums">{d.tasks.done}/{d.tasks.total}</p></div>
          </div>
        </Card>
        <StatCard label="Workout" icon={Dumbbell} tone="fit" href="/fitness" value={workedOut ? 'Done' : 'Pending'}
          sub={workedOut ? `${d.workouts.reduce((a, w) => a + w.durationMin, 0)} min · ${d.workouts.reduce((a, w) => a + (w.calories ?? 0), 0)} kcal` : `${d.wk.activeDays}/${d.wk.goal} this week`}>
          <div className="mt-2"><StreakBadge days={d.wStreak} label="day streak" /></div>
        </StatCard>
        <StatCard label="Water" icon={Droplets} tone="study" href="/life" value={`${d.water}/${waterGoal}`} sub="glasses today">
          <ProgressBar className="mt-2.5" value={(d.water / waterGoal) * 100} tone="study" label="Water intake" />
        </StatCard>
        <StatCard label="Food discipline" icon={Utensils} tone={d.food == null ? 'neutral' : d.food >= 70 ? 'success' : d.food >= 45 ? 'warn' : 'danger'} href="/food" value={d.food ?? '--'} sub={d.food == null ? 'No meals logged yet' : `${d.nut.calories} / ${s.user.calorieGoal} kcal`}>
          <ProgressBar className="mt-2.5" value={d.food ?? 0} tone={d.food != null && d.food < 45 ? 'danger' : 'success'} label="Food discipline" />
        </StatCard>
        <StatCard label="No sugar streak" icon={Ban} tone="danger" href="/food" value={<>{d.sugar} <span className="text-sm font-medium text-muted-foreground">days</span></>} sub={d.sugar >= 3 ? 'Keep it going 🔥' : 'Every day counts'} />
        <StatCard label="No outside food" icon={HomeIcon} tone="danger" href="/food" value={<>{d.outside} <span className="text-sm font-medium text-muted-foreground">days</span></>} sub={d.outside >= 3 ? 'Home food hero 🏠' : 'Cook at home today'} />
        <StatCard label="Spent today" icon={ShoppingBag} tone={d.spentToday > d.m.dailyLimit && d.m.dailyLimit > 0 ? 'danger' : 'study'} href="/money" value={money(d.spentToday, cur)} sub={d.m.dailyLimit ? `Daily limit ${money(d.m.dailyLimit, cur)}` : 'No budget set'} />
        <StatCard label="Left this month" icon={PiggyBank} tone={d.m.remainingBudget < 0 ? 'danger' : 'success'} href="/money" value={money(d.m.remainingBudget, cur)} sub={`${d.m.usedPct}% of ${money(d.m.budget, cur, true)} used`}>
          <ProgressBar className="mt-2.5" value={d.m.usedPct} tone={d.m.usedPct >= 90 ? 'danger' : d.m.usedPct >= 70 ? 'warn' : 'success'} label="Budget used" />
        </StatCard>
        <StatCard label="Habits today" icon={CheckCircle2} tone="success" href="/life" value={`${d.habits.done}/${d.habits.total}`} sub={d.bestHabit?.n ? `Best streak: ${d.bestHabit.h.name} ${d.bestHabit.n}d` : 'Tick your first habit'}>
          <ProgressBar className="mt-2.5" value={d.habits.pct ?? 0} tone="success" label="Habits completed" />
        </StatCard>
        <StatCard label="Sleep last night" icon={Moon} tone="study" href="/life" value={d.sleepLog?.sleepHours != null ? `${d.sleepLog.sleepHours}h` : '--'} sub={d.sleepLog?.sleepHours != null ? `Target ${s.user.sleepTarget}h${d.sleepLog.sleepQuality ? ` · quality ${d.sleepLog.sleepQuality}/5` : ''}` : 'Tap to log sleep'} />
        <StatCard label="Mood & energy" icon={Zap} tone="fit" href="/life" value={d.log?.mood ? `${MOOD_EMOJI[d.log.mood]} ${d.log.mood}` : '--'} sub={d.log?.energy ? `${d.log.energy} energy` : 'How are you feeling?'} />
        <Card href="/movies" className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Watching now</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{d.watching.length}</p></div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-movie/12 text-movie"><Clapperboard size={18} /></span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.watching.length ? d.watching.map((m) => m.title).join(', ') : 'Nothing in progress'}</p>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card href="/tasks">
          <SectionTitle icon={CheckSquare} tone="study" action={<Badge tone="study">This week</Badge>}>Weekly task completion</SectionTitle>
          <ChartFrame height={170} empty={!d.weekTasks.some((x) => x.has)} emptyText="Add tasks with due dates to see your weekly completion.">
            <BarChart data={d.weekTasks} margin={{ left: -24, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}%`} labelFormatter={(_l) => 'Completion'} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={COLORS.study}>{d.weekTasks.map((e) => <Cell key={e.day} fill={e.day === today ? COLORS.study : 'rgb(59 130 246 / .55)'} />)}</Bar>
            </BarChart>
          </ChartFrame>
        </Card>
        <Card href="/fitness">
          <SectionTitle icon={Dumbbell} tone="fit" action={<Badge tone="fit">{d.wk.activeDays}/{d.wk.goal} days</Badge>}>Workout consistency (min)</SectionTitle>
          <ChartFrame height={170} empty={!d.weekWork.some((x) => x.value > 0)} emptyText="Log a workout to start your weekly streak.">
            <BarChart data={d.weekWork} margin={{ left: -24, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} />
              <ChartTooltip formatter={(v) => `${v} min`} labelFormatter={(_l) => 'Active time'} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={COLORS.fit} />
            </BarChart>
          </ChartFrame>
        </Card>
        <Card href="/food">
          <SectionTitle icon={Utensils} tone="success" action={<Badge tone="success">Score</Badge>}>Weekly food discipline</SectionTitle>
          <ChartFrame height={170} empty={!d.weekFood.some((x) => x.value != null)} emptyText="Log meals to see your discipline trend.">
            <LineChart data={d.weekFood} margin={{ left: -24, right: 8, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis domain={[0, 100]} {...axisProps} />
              <ChartTooltip formatter={(v) => `${v}/100`} labelFormatter={(_l) => 'Discipline'} />
              <Line type="monotone" dataKey="value" stroke={COLORS.success} strokeWidth={3} dot={{ r: 4, fill: COLORS.success }} connectNulls />
            </LineChart>
          </ChartFrame>
        </Card>
        <Card href="/money">
          <SectionTitle icon={Wallet} tone="danger" action={<Badge tone="danger">{money(d.m.spent, cur)}</Badge>}>Spending this month</SectionTitle>
          <ChartFrame height={170} empty={d.m.spent === 0} emptyText="Add an expense to see your daily spending.">
            <BarChart data={d.monthSpend} margin={{ left: -14, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={3} /><YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <ChartTooltip formatter={(v) => money(Number(v), cur)} labelFormatter={(l) => `Day ${l}`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={COLORS.danger} />
            </BarChart>
          </ChartFrame>
        </Card>
      </section>

      <Card href="/life">
        <SectionTitle icon={Brain} tone="success" action={<span className="text-xs text-muted-foreground">Last 14 weeks</span>}>Habit streak calendar</SectionTitle>
        <HabitHeatmap today={today} valueOf={(x) => (s.habits.length ? habitStatsForDay(s, x).pct : null)} />
      </Card>
      <p className="text-center text-xs text-muted-foreground">Today is {shortDate(today)} · all numbers update instantly as you log.</p>
    </div>
  );
}
