import type { Snapshot } from '@/types';
import { money } from './dates';
import { periodReport, weeklyFood, weeklyFitness, monthMoney, isOverdue } from './scores';
import { weekDays, inRange } from './dates';

export interface Insight { tone: 'good' | 'warn' | 'bad' | 'tip'; text: string }

/** Rule-based, personalised suggestions generated from the latest data. */
export function buildInsights(s: Snapshot, today: string): Insight[] {
  const out: Insight[] = [];
  const week = periodReport(s, 'week', today);
  const fit = weeklyFitness(s, today);
  const food = weeklyFood(s, today);
  const m = monthMoney(s, today);
  const days = weekDays(today);
  const daysElapsed = days.filter((d) => d <= today).length;

  // Workouts
  const skipped = Math.max(0, daysElapsed - fit.activeDays);
  if (fit.activeDays >= fit.goal) out.push({ tone: 'good', text: `You hit your weekly workout goal (${fit.activeDays}/${fit.goal}). Excellent consistency!` });
  else if (skipped >= 3) out.push({ tone: 'bad', text: `You skipped workouts ${skipped} days this week; schedule 30-minute home workouts to stay on track.` });
  else if (fit.activeDays < fit.goal) out.push({ tone: 'tip', text: `${fit.goal - fit.activeDays} more workout${fit.goal - fit.activeDays > 1 ? 's' : ''} to reach this week's goal. Even a 20-minute walk counts.` });

  // Tasks
  const high = s.tasks.filter((t) => (t.priority === 'High' || t.priority === 'Urgent') && t.dueDate && inRange(t.dueDate, days[0], days[6]));
  if (high.length >= 3) {
    const pct = Math.round((high.filter((t) => t.status === 'Completed').length / high.length) * 100);
    out.push(pct >= 80
      ? { tone: 'good', text: `You completed ${pct}% of high-priority tasks; excellent consistency.` }
      : { tone: pct >= 50 ? 'tip' : 'warn', text: `Only ${pct}% of high-priority tasks are done this week. Tackle the most urgent one first thing tomorrow.` });
  }
  const overdue = s.tasks.filter((t) => isOverdue(t, today));
  if (overdue.length) out.push({ tone: 'bad', text: `${overdue.length} task${overdue.length > 1 ? 's are' : ' is'} overdue. Clear the oldest one today to regain momentum.` });

  // Food
  if (food.outside >= 2) out.push({ tone: 'bad', text: `You ate outside ${food.outside} times this week; reduce it next week and cook simple home meals instead.` });
  if (food.sugar >= 3) out.push({ tone: 'warn', text: `Sugar showed up ${food.sugar} times this week. Swap sweets for fruit or a handful of nuts.` });
  if (food.avgScore != null && food.avgScore >= 75) out.push({ tone: 'good', text: 'Your food discipline is strong this week; keep avoiding sugar and outside food.' });
  const last = week.food;
  if (last != null && last < 55) out.push({ tone: 'warn', text: 'Food discipline is low this week. Plan tomorrow\'s meals tonight: dal, roti, eggs, curd and a fruit.' });

  // Sleep
  if (week.avgSleepHours != null && week.avgSleepHours < (s.user.sleepTarget || 7.5) - 0.75) {
    out.push({ tone: 'warn', text: `Your sleep average is ${week.avgSleepHours}h, below your ${s.user.sleepTarget}h target; try sleeping before 12 AM.` });
  } else if (week.avgSleepHours != null) {
    out.push({ tone: 'good', text: `Sleep average of ${week.avgSleepHours}h is on target. Great for recovery and focus.` });
  }

  // Water
  if (week.avgWater != null && week.avgWater < (s.user.waterGoal || 8) * 0.7) {
    out.push({ tone: 'tip', text: `You average ${week.avgWater} glasses of water; keep a bottle on your desk and aim for ${s.user.waterGoal}.` });
  }

  // Money
  if (m.budget && m.usedPct >= 90) out.push({ tone: 'bad', text: `You have used ${m.usedPct}% of your monthly budget. Pause non-essential spending.` });
  else if (m.budget && m.usedPct >= 70) out.push({ tone: 'warn', text: `${m.usedPct}% of the monthly budget is used with ${m.daysLeft} days left. Stay near ${money(m.dailyLimit, s.user.currency)} a day.` });
  else if (m.budget && m.count) out.push({ tone: 'good', text: `You are within budget (${m.usedPct}% used). Move any extra into your savings goal.` });
  const foodSpend = m.byCat['Food'] ?? 0;
  if (m.budget && foodSpend > m.budget * 0.35) out.push({ tone: 'warn', text: `Food is ${Math.round((foodSpend / m.budget) * 100)}% of your budget; outside food costs both health and money.` });

  // Habits
  if (week.habits != null && week.habits < 50) out.push({ tone: 'tip', text: `Habit consistency is ${week.habits}%. Pick your two most important habits and protect only those this week.` });
  else if (week.habits != null && week.habits >= 75) out.push({ tone: 'good', text: `Habit consistency is ${week.habits}%. You're building real discipline.` });

  if (!out.length) out.push({ tone: 'tip', text: 'Log tasks, meals, workouts and expenses for a few days to unlock personalised insights.' });
  return out.slice(0, 9);
}
