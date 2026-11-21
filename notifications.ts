import type { Snapshot } from '@/types';
import { diffDays, money, shortDate, fmtTime12 } from './dates';
import {
  budgetAlert, dayNutrition, isJunk, isOutside, isOverdue, isSugar, mealsOn, monthMoney, workoutsOn,
  habitStatsForDay, weeklyFitness, categoryBudgetStatus,
} from './scores';

export interface AppNotification {
  id: string;
  tone: 'danger' | 'warn' | 'info' | 'success';
  title: string;
  text: string;
  href: string;
}

const hour = (hm: string) => Number(hm.slice(0, 2));
const on = (s: Snapshot, key: string) => s.user.notifications?.[key] !== false; // default: enabled

/** Everything worth nudging the user about right now. Ids are stable per day so "mark read" sticks. */
export function buildNotifications(s: Snapshot, today: string, nowHm: string): AppNotification[] {
  const out: AppNotification[] = [];
  const h = hour(nowHm);

  if (on(s, 'tasks')) {
    const overdue = s.tasks.filter((t) => isOverdue(t, today, nowHm));
    overdue.slice(0, 4).forEach((t) =>
      out.push({ id: `overdue:${t.id}:${today}`, tone: 'danger', title: 'Overdue task', text: `${t.title} was due ${t.dueDate === today ? `today ${fmtTime12(t.dueTime)}` : shortDate(t.dueDate!)}`, href: '/tasks' }));
    if (overdue.length > 4) out.push({ id: `overdue-more:${today}:${overdue.length}`, tone: 'danger', title: `${overdue.length - 4} more overdue`, text: 'Open Tasks to clear your backlog.', href: '/tasks' });
    s.tasks
      .filter((t) => t.status !== 'Completed' && t.dueDate === today && !isOverdue(t, today, nowHm))
      .slice(0, 3)
      .forEach((t) => out.push({ id: `due:${t.id}:${today}`, tone: 'info', title: 'Due today', text: `${t.title}${t.dueTime ? ` at ${fmtTime12(t.dueTime)}` : ''}`, href: '/tasks' }));
  }

  if (on(s, 'budget')) {
    const m = monthMoney(s, today);
    if (m.budget) {
      const a = budgetAlert(m.usedPct);
      if (a.level !== 'ok') {
        const band = m.usedPct >= 100 ? 100 : m.usedPct >= 90 ? 90 : 70;
        out.push({ id: `budget:${today.slice(0, 7)}:${band}`, tone: a.level === 'warn' ? 'warn' : 'danger', title: `Budget ${band}% alert`, text: a.text, href: '/money' });
      }
      categoryBudgetStatus(s, today).filter((c) => c.pct >= 100).slice(0, 2)
        .forEach((c) => out.push({ id: `catbudget:${c.category}:${today.slice(0, 7)}`, tone: 'danger', title: `${c.category} over budget`, text: `You've spent ${money(c.spent, s.user.currency)} of ${money(c.monthlyLimit, s.user.currency)}.`, href: '/money' }));
    }
  }

  if (on(s, 'food')) {
    const meals = mealsOn(s, today);
    if (meals.some(isOutside)) out.push({ id: `outside:${today}`, tone: 'danger', title: 'Outside food logged', text: 'Your no-outside-food streak was reset. Cook at home tomorrow!', href: '/food' });
    if (meals.some(isSugar)) out.push({ id: `sugar:${today}`, tone: 'danger', title: 'Sugar logged', text: 'No-sugar streak reset. Try fruit or nuts next time.', href: '/food' });
    if (meals.some(isJunk)) out.push({ id: `junk:${today}`, tone: 'danger', title: 'Junk food logged', text: 'Food discipline score dropped. Balance it with a healthy dinner.', href: '/food' });
    const n = dayNutrition(s, today);
    if (n.calories > (s.user.calorieGoal || 2200) * 1.1) out.push({ id: `cal:${today}`, tone: 'warn', title: 'Over calorie goal', text: `${n.calories} kcal logged against a ${s.user.calorieGoal} goal.`, href: '/food' });
  }

  if (on(s, 'water') && h >= 15) {
    const w = s.dailyLogs.find((l) => l.date === today)?.water ?? 0;
    if (w < (s.user.waterGoal || 8) * 0.5) out.push({ id: `water:${today}:${h >= 19 ? 'late' : 'mid'}`, tone: 'info', title: 'Drink some water', text: `${w}/${s.user.waterGoal} glasses so far today.`, href: '/life' });
  }

  if (on(s, 'workout')) {
    const f = weeklyFitness(s, today);
    const done = workoutsOn(s, today).length > 0;
    const yesterdayCount = s.workouts.filter((w) => diffDays(today, w.date) === 1).length;
    const recent3 = s.workouts.filter((w) => { const d = diffDays(today, w.date); return d >= 0 && d < 3; }).length;
    if (!done && h >= 17 && f.activeDays < f.goal) out.push({ id: `workout:${today}`, tone: 'warn', title: 'No workout yet', text: `${f.activeDays}/${f.goal} workouts this week. Even 20 minutes counts.`, href: '/fitness' });
    if (recent3 >= 3 || (yesterdayCount > 0 && recent3 >= 3)) out.push({ id: `rest:${today}`, tone: 'info', title: 'Rest-day reminder', text: 'Three active days in a row. Consider stretching or a rest day for recovery.', href: '/fitness' });
  }

  if (on(s, 'habits') && h >= 20) {
    const st = habitStatsForDay(s, today);
    if (st.total && st.done < st.total) out.push({ id: `habits:${today}`, tone: 'warn', title: 'Habits pending', text: `${st.total - st.done} habit${st.total - st.done > 1 ? 's' : ''} left today. Protect your streaks!`, href: '/life' });
  }

  if (on(s, 'sleep') && (h >= 23 || h < 4)) {
    out.push({ id: `sleep:${today}`, tone: 'info', title: 'Time to wind down', text: `Aim for ${s.user.sleepTarget}h sleep. Phone away, lights low.`, href: '/life' });
  }

  return out;
}

/** Task reminders that should fire a browser notification right now (within a 2 minute window). */
export function dueReminders(s: Snapshot, now: Date, todayStr: string) {
  const out: { key: string; title: string; body: string }[] = [];
  for (const t of s.tasks) {
    if (t.status === 'Completed' || !t.dueDate || t.reminderMinutes == null) continue;
    const time = t.dueTime ?? '09:00';
    const [y, mo, d] = t.dueDate.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const due = new Date(y, mo - 1, d, hh, mm).getTime();
    const fireAt = due - t.reminderMinutes * 60000;
    if (now.getTime() >= fireAt && now.getTime() < fireAt + 120000) {
      out.push({ key: `${t.id}:${t.dueDate}:${t.reminderMinutes}`, title: 'Task reminder', body: `${t.title}${t.dueTime ? ` is due at ${fmtTime12(t.dueTime)}` : ' is due today'}` });
    }
  }
  void todayStr;
  return out;
}
