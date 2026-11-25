import type { Snapshot, Meal, Task } from '@/types';
import { MOOD_VALUE, ENERGY_VALUE } from './constants';
import { addDays, diffDays, inRange, lastNDays, monthStart, weekDays } from './dates';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round = (n: number) => Math.round(n);

const PRIORITY_WEIGHT: Record<string, number> = { Low: 1, Medium: 2, High: 3, Urgent: 4 };

// ---------------------------------------------------------------- tasks

export const isDone = (t: Task) => t.status === 'Completed';
export const isOverdue = (t: Task, today: string, nowHm?: string) => {
  if (isDone(t) || !t.dueDate) return false;
  if (t.dueDate < today) return true;
  return Boolean(nowHm && t.dueDate === today && t.dueTime && t.dueTime < nowHm);
};
/** Effective status shown in the UI: open tasks past their due date count as Missed. */
export const effectiveStatus = (t: Task, today: string) => (!isDone(t) && t.dueDate && t.dueDate < today ? 'Missed' : t.status);

/** Tasks that "belong" to a day: due that day, or completed that day. */
export function tasksForDay(s: Snapshot, day: string): Task[] {
  return s.tasks.filter((t) => t.dueDate === day || t.completedOn === day);
}

export function taskStatsForDay(s: Snapshot, day: string) {
  const list = tasksForDay(s, day);
  const done = list.filter((t) => isDone(t) && (t.completedOn === day || t.dueDate === day)).length;
  const total = list.length;
  return { total, done, pct: total ? round((done / total) * 100) : null as number | null };
}

/** Priority-weighted completion for a set of days. */
export function productivityScore(s: Snapshot, days: string[]): number | null {
  const set = new Set(days);
  const list = s.tasks.filter((t) => (t.dueDate && set.has(t.dueDate)) || (t.completedOn && set.has(t.completedOn)));
  if (!list.length) return null;
  const w = (t: Task) => PRIORITY_WEIGHT[t.priority] ?? 2;
  const total = sum(list.map(w));
  const done = sum(list.filter(isDone).map(w));
  return round((done / total) * 100);
}

export function focusScore(s: Snapshot, day: string): number | null {
  const log = s.dailyLogs.find((l) => l.date === day);
  const target = s.user.studyTarget || 3;
  const parts: number[] = [];
  if (log?.studyHours != null) parts.push(clamp((log.studyHours / target) * 100));
  if (log?.focusRating) parts.push((log.focusRating / 5) * 100);
  const t = taskStatsForDay(s, day);
  if (t.pct != null) parts.push(t.pct);
  return parts.length ? round(avg(parts)) : null;
}

export function weeklyTaskReport(s: Snapshot, day: string) {
  const days = weekDays(day);
  const [from, to] = [days[0], days[6]];
  const week = s.tasks.filter((t) => (t.dueDate && inRange(t.dueDate, from, to)) || (t.completedOn && inRange(t.completedOn, from, to)));
  const completed = week.filter(isDone);
  const missed = week.filter((t) => !isDone(t) && t.dueDate && t.dueDate < day);
  const byDay = days.map((d) => ({ day: d, done: s.tasks.filter((t) => t.completedOn === d).length }));
  const best = [...byDay].sort((a, b) => b.done - a.done)[0];
  const catCount: Record<string, number> = {};
  completed.forEach((t) => (catCount[t.category] = (catCount[t.category] ?? 0) + 1));
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
  return {
    total: week.length,
    completed: completed.length,
    missed: missed.length,
    rate: week.length ? round((completed.length / week.length) * 100) : 0,
    bestDay: best && best.done > 0 ? best.day : null,
    topCategory: topCat?.[0] ?? null,
    byDay,
  };
}

// ---------------------------------------------------------------- habits

export const habitDone = (s: Snapshot, habitId: string, day: string) => s.habitLogs.some((l) => l.habitId === habitId && l.date === day && l.done);

export function habitStreak(s: Snapshot, habitId: string, today: string): number {
  const dates = new Set(s.habitLogs.filter((l) => l.habitId === habitId && l.done).map((l) => l.date));
  let d = dates.has(today) ? today : addDays(today, -1); // today isn't over yet
  let n = 0;
  while (dates.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function habitStatsForDay(s: Snapshot, day: string) {
  const total = s.habits.length;
  const done = s.habits.filter((h) => habitDone(s, h.id, day)).length;
  return { total, done, pct: total ? round((done / total) * 100) : null as number | null };
}

export function habitConsistency(s: Snapshot, days: string[]): number | null {
  if (!s.habits.length) return null;
  const pcts = days.map((d) => habitStatsForDay(s, d).pct ?? 0);
  return round(avg(pcts));
}

// ---------------------------------------------------------------- sleep / mood

export function sleepScore(s: Snapshot, day: string): number | null {
  const l = s.dailyLogs.find((x) => x.date === day);
  if (!l || l.sleepHours == null) return null;
  const target = s.user.sleepTarget || 7.5;
  const dur = clamp(100 - Math.abs(l.sleepHours - target) * 18); // penalise both too little and too much
  return round(l.sleepQuality ? dur * 0.7 + (l.sleepQuality / 5) * 100 * 0.3 : dur);
}

export function moodEnergyScore(s: Snapshot, day: string): number | null {
  const l = s.dailyLogs.find((x) => x.date === day);
  const parts: number[] = [];
  if (l?.mood) parts.push((MOOD_VALUE[l.mood] / 5) * 100);
  if (l?.energy) parts.push((ENERGY_VALUE[l.energy] / 3) * 100);
  return parts.length ? round(avg(parts)) : null;
}

export function waterScore(s: Snapshot, day: string): number | null {
  const l = s.dailyLogs.find((x) => x.date === day);
  if (l?.water == null) return null;
  return round(clamp((l.water / (s.user.waterGoal || 8)) * 100));
}

// ---------------------------------------------------------------- fitness

const doneW = (s: Snapshot) => s.workouts.filter((w) => w.completed !== false);
export const workoutsOn = (s: Snapshot, day: string) => doneW(s).filter((w) => w.date === day);

export function weeklyFitness(s: Snapshot, day: string) {
  const days = weekDays(day);
  const list = doneW(s).filter((w) => inRange(w.date, days[0], days[6]));
  const activeDays = new Set(list.map((w) => w.date)).size;
  const minutes = sum(list.map((w) => w.durationMin));
  const calories = sum(list.map((w) => w.calories ?? 0));
  const goal = s.user.weeklyWorkoutGoal || 4;
  const minGoal = s.user.weeklyActiveMinGoal || 150;
  const consistency = round(clamp(activeDays / goal * 70 + clamp(minutes / minGoal * 100) * 0.3));
  const w = s.bodyEntries.filter((b) => b.weightKg != null);
  const inWeek = w.filter((b) => inRange(b.date, days[0], days[6]));
  const prior = [...w].reverse().find((b) => b.date < days[0]);
  const latestInWeek = inWeek[inWeek.length - 1];
  const weightChange = latestInWeek && prior ? Math.round((latestInWeek.weightKg! - prior.weightKg!) * 10) / 10 : null;
  return { count: list.length, activeDays, minutes, calories, goal, minGoal, consistency, weightChange, days };
}

/** Consecutive days (ending today/yesterday) that contain a workout; rest days are allowed once per 3 days. */
export function workoutStreak(s: Snapshot, today: string): number {
  const dates = new Set(doneW(s).map((w) => w.date));
  let d = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  let restRun = 0;
  for (let i = 0; i < 365; i++) {
    if (dates.has(d)) {
      streak++;
      restRun = 0;
    } else {
      restRun++;
      if (restRun > 1) break; // a single rest day does not break the streak
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function weightProgress(s: Snapshot) {
  const entries = s.bodyEntries.filter((b) => b.weightKg != null);
  const start = entries[0]?.weightKg ?? s.user.weightKg ?? null;
  const current = entries[entries.length - 1]?.weightKg ?? s.user.weightKg ?? null;
  const target = s.user.targetWeightKg ?? null;
  if (start == null || current == null || target == null || start === target) return { start, current, target, pct: 0 };
  const pct = clamp(((start - current) / (start - target)) * 100);
  return { start, current, target, pct: round(pct) };
}

export function fitnessScore(s: Snapshot, day: string): number {
  const f = weeklyFitness(s, day);
  const stepsLog = s.dailyLogs.find((l) => l.date === day)?.steps;
  const stepPart = stepsLog != null ? clamp((stepsLog / (s.user.stepGoal || 8000)) * 100) : null;
  return round(stepPart != null ? f.consistency * 0.75 + stepPart * 0.25 : f.consistency);
}

// ---------------------------------------------------------------- food

export const mealsOn = (s: Snapshot, day: string) => s.meals.filter((m) => m.date === day);
export const isOutside = (m: Meal) => m.category === 'Outside food';
export const isJunk = (m: Meal) => m.category === 'Junk food';
export const isSugar = (m: Meal) => m.hasSugar || m.category === 'Sugary food';
export const isHome = (m: Meal) => m.category === 'Home food' || m.category === 'Healthy';
const GOOD_FOODS = /(fruit|apple|banana|papaya|orange|guava|salad|veg|sabzi|spinach|palak|dal|curd|egg|paneer|sprouts|chana|oats|roti|buttermilk|chicken)/i;

/** Cheat meals used in the week containing `day`. */
export const cheatMealsInWeek = (s: Snapshot, day: string) => {
  const d = weekDays(day);
  return s.meals.filter((m) => m.category === 'Cheat meal' && inRange(m.date, d[0], d[6])).length;
};

export function foodScore(s: Snapshot, day: string): number | null {
  const meals = mealsOn(s, day);
  if (!meals.length) return null;
  let score = 70;
  let goodHits = 0;
  const allowance = s.user.cheatMealsPerWeek ?? 1;
  for (const m of meals) {
    if (isOutside(m)) score -= 15;
    if (isJunk(m)) score -= 15;
    if (m.category === 'Sugary food') score -= 12;
    else if (m.hasSugar) score -= 8;
    if (m.category === 'Cheat meal') {
      // the first cheat meals within the weekly allowance cost little; extra ones cost a lot
      const sameWeek = s.meals
        .filter((x) => x.category === 'Cheat meal' && inRange(x.date, weekDays(day)[0], weekDays(day)[6]))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      const idx = sameWeek.findIndex((x) => x.id === m.id);
      score -= idx >= 0 && idx < allowance ? 4 : 14;
    }
    if (m.category === 'Home food') score += 5;
    if (m.category === 'Healthy') score += 8;
    if (GOOD_FOODS.test(m.food) && goodHits < 3) {
      score += 3;
      goodHits++;
    }
    const [h] = m.time.split(':').map(Number);
    if (h >= 23 || h < 4) score -= 8; // late-night eating
  }
  const cal = sum(meals.map((m) => m.calories));
  const calGoal = s.user.calorieGoal || 2200;
  if (cal > calGoal * 1.15) score -= 10; // overeating
  const protein = sum(meals.map((m) => m.protein));
  const proteinGoal = s.user.proteinGoal || 100;
  score += clamp((protein / proteinGoal) * 10, 0, 10);
  const water = s.dailyLogs.find((l) => l.date === day)?.water ?? 0;
  if (water >= (s.user.waterGoal || 8)) score += 8;
  else score += (water / (s.user.waterGoal || 8)) * 4;
  return round(clamp(score));
}

type Violation = (m: Meal) => boolean;
function cleanStreak(s: Snapshot, today: string, violated: Violation): number {
  const first = s.meals.reduce((min, m) => (m.date < min ? m.date : min), today);
  const bad = new Set(s.meals.filter(violated).map((m) => m.date));
  let d = today;
  let n = 0;
  while (d >= first && !bad.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
export const noOutsideStreak = (s: Snapshot, today: string) => cleanStreak(s, today, isOutside);
export const noSugarStreak = (s: Snapshot, today: string) => cleanStreak(s, today, isSugar);
export const noJunkStreak = (s: Snapshot, today: string) => cleanStreak(s, today, isJunk);

export function homeCookedStreak(s: Snapshot, today: string): number {
  const days = new Set(s.meals.filter(isHome).map((m) => m.date));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function dayNutrition(s: Snapshot, day: string) {
  const meals = mealsOn(s, day);
  return {
    calories: sum(meals.map((m) => m.calories)),
    protein: round(sum(meals.map((m) => m.protein))),
    carbs: round(sum(meals.map((m) => m.carbs))),
    fats: round(sum(meals.map((m) => m.fats))),
    count: meals.length,
  };
}

export function weeklyFood(s: Snapshot, day: string) {
  const days = weekDays(day);
  const meals = s.meals.filter((m) => inRange(m.date, days[0], days[6]));
  const scores = days.map((d) => foodScore(s, d)).filter((x): x is number => x != null);
  return {
    outside: meals.filter(isOutside).length,
    sugar: meals.filter(isSugar).length,
    junk: meals.filter(isJunk).length,
    healthy: meals.filter((m) => m.category === 'Healthy' || m.category === 'Home food').length,
    cheat: meals.filter((m) => m.category === 'Cheat meal').length,
    avgScore: scores.length ? round(avg(scores)) : null,
  };
}

// ---------------------------------------------------------------- money

export function monthMoney(s: Snapshot, day: string) {
  const ms = monthStart(day);
  const monthKey = day.slice(0, 7);
  const tx = s.transactions.filter((t) => t.date.startsWith(monthKey) && t.date <= day);
  const expenses = tx.filter((t) => t.type === 'expense');
  const income = sum(tx.filter((t) => t.type === 'income').map((t) => t.amount));
  const spent = sum(expenses.map((t) => t.amount));
  const budget = s.user.monthlyBudget || 0;
  const byCat: Record<string, number> = {};
  expenses.forEach((t) => (byCat[t.category] = (byCat[t.category] ?? 0) + t.amount));
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const biggest = [...expenses].sort((a, b) => b.amount - a.amount)[0] ?? null;
  const usedPct = budget ? round((spent / budget) * 100) : 0;
  const [y, m] = day.split('-').map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dayNum = Number(day.slice(8, 10));
  const daysLeft = dim - dayNum + 1;
  return {
    monthStart: ms, income, spent, budget, usedPct, byCat, topCategory: topCat?.[0] ?? null, topCategoryAmount: topCat?.[1] ?? 0,
    biggest, remainingBudget: budget - spent, balance: income - spent,
    dailyLimit: budget ? Math.max(0, Math.round((budget - spent) / daysLeft)) : 0,
    daysLeft, dim, dayNum, count: tx.length,
  };
}

export const spentOn = (s: Snapshot, day: string) => sum(s.transactions.filter((t) => t.type === 'expense' && t.date === day).map((t) => t.amount));
export const spentInRange = (s: Snapshot, from: string, to: string) =>
  sum(s.transactions.filter((t) => t.type === 'expense' && inRange(t.date, from, to)).map((t) => t.amount));

export function budgetAlert(usedPct: number): { level: 'ok' | 'info' | 'warn' | 'danger'; text: string } {
  if (usedPct >= 100) return { level: 'danger', text: `You have used ${usedPct}% of this month's budget. Spending is over the limit.` };
  if (usedPct >= 90) return { level: 'danger', text: `${usedPct}% of your monthly budget is gone. Only essentials from here.` };
  if (usedPct >= 70) return { level: 'warn', text: `${usedPct}% of your monthly budget is used. Slow down a little.` };
  return { level: 'ok', text: 'Spending is comfortably within budget.' };
}

export function categoryBudgetStatus(s: Snapshot, day: string) {
  const m = monthMoney(s, day);
  return s.budgets.map((b) => {
    const spent = m.byCat[b.category] ?? 0;
    return { ...b, spent, pct: b.monthlyLimit ? round((spent / b.monthlyLimit) * 100) : 0 };
  });
}

export function moneyScore(s: Snapshot, day: string): number | null {
  const m = monthMoney(s, day);
  if (!m.count && !m.budget) return null;
  if (!m.budget) return m.income > m.spent ? 75 : 40;
  // Compare spend against how far through the month we are, then reward saving.
  const pace = m.dayNum / m.dim;
  const expected = m.budget * pace;
  let score = 100 - Math.max(0, ((m.spent - expected) / m.budget) * 120);
  if (m.usedPct >= 100) score = Math.min(score, 45 - Math.min(35, m.usedPct - 100));
  else if (m.usedPct >= 90) score = Math.min(score, 65);
  else if (m.usedPct >= 70) score = Math.min(score, 85);
  if (m.income > 0) score += clamp(((m.income - m.spent) / m.income) * 15, -10, 10);
  return round(clamp(score));
}

export function monthlySeries(s: Snapshot, endDay: string, months = 6) {
  const out: { key: string; label: string; income: number; expense: number; net: number; cumulative: number }[] = [];
  const keys: string[] = [];
  const [y, m] = endDay.split('-').map(Number);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const before = s.transactions.filter((t) => t.date.slice(0, 7) < keys[0]);
  let cumulative = sum(before.map((t) => (t.type === 'income' ? t.amount : -t.amount)));
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (const k of keys) {
    const tx = s.transactions.filter((t) => t.date.slice(0, 7) === k);
    const income = sum(tx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sum(tx.filter((t) => t.type === 'expense').map((t) => t.amount));
    cumulative += income - expense;
    out.push({ key: k, label: names[Number(k.slice(5)) - 1], income, expense, net: income - expense, cumulative });
  }
  return out;
}

// ---------------------------------------------------------------- life score

/** Weighted blend of whatever has been logged for the day; missing categories are ignored, not penalised. */
export function lifeScore(s: Snapshot, day: string): number | null {
  const parts: [number | null, number][] = [
    [taskStatsForDay(s, day).pct, 20],
    [habitStatsForDay(s, day).pct, 20],
    [sleepScore(s, day), 15],
    [waterScore(s, day), 8],
    [foodScore(s, day), 15],
    [workoutsOn(s, day).length ? 100 : null, 12],
    [moodEnergyScore(s, day), 10],
  ];
  const used = parts.filter(([v]) => v != null) as [number, number][];
  if (!used.length) return null;
  const w = sum(used.map(([, wt]) => wt));
  return round(sum(used.map(([v, wt]) => v * wt)) / w);
}

export type DayQuality = 'good' | 'average' | 'bad' | 'none';
export function dayQuality(score: number | null): DayQuality {
  if (score == null) return 'none';
  if (score >= 70) return 'good';
  if (score >= 45) return 'average';
  return 'bad';
}

export function weeklyLifeScore(s: Snapshot, day: string): number | null {
  const scores = weekDays(day).filter((d) => d <= day).map((d) => lifeScore(s, d)).filter((x): x is number => x != null);
  return scores.length ? round(avg(scores)) : null;
}

export function overallLifeScore(s: Snapshot, today: string): number {
  // Blend today (60%) with the recent week so the score isn't zero first thing in the morning.
  const t = lifeScore(s, today);
  const recent = lastNDays(addDays(today, -1), 7).map((d) => lifeScore(s, d)).filter((x): x is number => x != null);
  const r = recent.length ? avg(recent) : null;
  if (t != null && r != null) return round(t * 0.6 + r * 0.4);
  return round(t ?? r ?? 0);
}

// ---------------------------------------------------------------- movies

export function movieStats(s: Snapshot) {
  const m = s.movies;
  const rated = m.filter((x) => x.rating != null);
  const genreCount: Record<string, number> = {};
  m.filter((x) => x.status === 'Completed' || x.favorite).forEach((x) => x.genre && (genreCount[x.genre] = (genreCount[x.genre] ?? 0) + 1));
  return {
    total: m.length,
    watching: m.filter((x) => x.status === 'Watching').length,
    completed: m.filter((x) => x.status === 'Completed').length,
    wantToWatch: m.filter((x) => x.status === 'Want to watch').length,
    favorites: m.filter((x) => x.favorite).length,
    avgRating: rated.length ? Math.round(avg(rated.map((x) => x.rating!)) * 10) / 10 : null,
    favoriteGenre: Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };
}

/** Stable "Movie of the Day": picks from the want-to-watch list using the date as a seed. */
export function movieOfTheDay(s: Snapshot, today: string) {
  const pool = s.movies.filter((m) => m.status === 'Want to watch');
  if (!pool.length) return null;
  const seed = Number(today.replace(/-/g, '')) % 9973;
  return pool[seed % pool.length];
}

// ---------------------------------------------------------------- reports

export function periodDays(kind: 'week' | 'month', today: string): string[] {
  if (kind === 'week') return weekDays(today);
  const ms = monthStart(today);
  return Array.from({ length: diffDays(today, ms) + 1 }, (_, i) => addDays(ms, i));
}

export function periodReport(s: Snapshot, kind: 'week' | 'month', today: string) {
  const days = periodDays(kind, today).filter((d) => d <= today);
  const from = days[0];
  const to = days[days.length - 1];
  const lifeByDay = days.map((d) => ({ day: d, score: lifeScore(s, d) }));
  const scored = lifeByDay.filter((x) => x.score != null) as { day: string; score: number }[];
  const best = [...scored].sort((a, b) => b.score - a.score)[0] ?? null;
  const worst = [...scored].sort((a, b) => a.score - b.score)[0] ?? null;

  const tasksDone = s.tasks.filter((t) => t.completedOn && inRange(t.completedOn, from, to));
  const catCount: Record<string, number> = {};
  tasksDone.forEach((t) => (catCount[t.category] = (catCount[t.category] ?? 0) + 1));
  const logs = s.dailyLogs.filter((l) => inRange(l.date, from, to));
  const sleepVals = days.map((d) => sleepScore(s, d)).filter((x): x is number => x != null);
  const foodVals = days.map((d) => foodScore(s, d)).filter((x): x is number => x != null);
  const wk = weeklyFitness(s, to);
  const workouts = doneW(s).filter((w) => inRange(w.date, from, to));
  const m = monthMoney(s, to);
  const periodSpent = spentInRange(s, from, to);
  const periodIncome = sum(s.transactions.filter((t) => t.type === 'income' && inRange(t.date, from, to)).map((t) => t.amount));
  const habitLogsIn = s.habitLogs.filter((l) => l.done && inRange(l.date, from, to)).length;

  return {
    kind, from, to, days,
    lifeScore: scored.length ? round(avg(scored.map((x) => x.score))) : null,
    productivity: productivityScore(s, days),
    fitness: kind === 'week' ? wk.consistency : round(clamp((workouts.length / (days.length / 7 * (s.user.weeklyWorkoutGoal || 4))) * 100)),
    food: foodVals.length ? round(avg(foodVals)) : null,
    money: moneyScore(s, to),
    sleep: sleepVals.length ? round(avg(sleepVals)) : null,
    habits: habitConsistency(s, days),
    best, worst,
    topCategory: Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    tasksCompleted: tasksDone.length,
    workouts: workouts.length,
    studyHours: Math.round(sum(logs.map((l) => l.studyHours ?? 0)) * 10) / 10,
    expenses: periodSpent,
    income: periodIncome,
    savings: periodIncome - periodSpent,
    moviesCompleted: s.movies.filter((x) => x.status === 'Completed' && x.watchDate && inRange(x.watchDate, from, to)).length,
    habitsMaintained: habitLogsIn,
    avgSleepHours: logs.filter((l) => l.sleepHours != null).length ? Math.round(avg(logs.filter((l) => l.sleepHours != null).map((l) => l.sleepHours!)) * 10) / 10 : null,
    avgWater: logs.filter((l) => l.water != null).length ? Math.round(avg(logs.filter((l) => l.water != null).map((l) => l.water!)) * 10) / 10 : null,
    monthSnapshot: m,
  };
}
