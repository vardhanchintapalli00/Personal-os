import { prisma } from '@/lib/db';
import { ok, withUser } from '@/lib/api-utils';
import { addDays, addMonths } from '@/lib/recurrence';

const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

/** Creates missing copies of recurring transactions (monthly / weekly) up to `today`. Idempotent. */
async function materializeRecurring(userId: string, today: string) {
  const parents = await prisma.transaction.findMany({
    where: { userId, recurrence: { in: ['weekly', 'monthly'] }, parentId: null },
  });
  if (!parents.length) return;
  const copies = await prisma.transaction.findMany({
    where: { userId, parentId: { in: parents.map((p) => p.id) } },
    select: { parentId: true, date: true },
  });
  const haveBy = new Map<string, Set<string>>();
  for (const c of copies) {
    if (!c.parentId) continue;
    if (!haveBy.has(c.parentId)) haveBy.set(c.parentId, new Set());
    haveBy.get(c.parentId)!.add(c.date);
  }
  const rows: { userId: string; type: string; amount: number; category: string; date: string; paymentMethod: string; notes: string | null; recurrence: string; parentId: string }[] = [];
  for (const p of parents) {
    const have = haveBy.get(p.id) ?? new Set<string>();
    let cursor = p.date;
    for (let i = 0; i < 60; i++) {
      const next = p.recurrence === 'weekly' ? addDays(cursor, 7) : addMonths(p.date, i + 1);
      cursor = next;
      if (next > today) break;
      if (!have.has(next)) {
        rows.push({ userId, type: p.type, amount: p.amount, category: p.category, date: next, paymentMethod: p.paymentMethod, notes: p.notes, recurrence: 'none', parentId: p.id });
      }
    }
  }
  if (rows.length) await prisma.transaction.createMany({ data: rows });
}

/** Returns everything the app needs in one round trip. Overdue/missed state is derived on the client. */
export const GET = withUser(async (req, userId) => {
  const today = new URL(req.url).searchParams.get('today') ?? istToday();
  const since = addDays(today, -400);

  await materializeRecurring(userId, today);

  const [user, tasks, movies, habits, habitLogs, dailyLogs, workouts, bodyEntries, meals, transactions, budgets, savingsGoals] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: {
        id: true, name: true, email: true, image: true, age: true, location: true, heightCm: true, weightKg: true,
        targetWeightKg: true, fitnessGoal: true, activityLevel: true, goals: true, waterGoal: true, calorieGoal: true,
        proteinGoal: true, stepGoal: true, weeklyWorkoutGoal: true, weeklyActiveMinGoal: true, monthlyBudget: true,
        cheatMealsPerWeek: true, sleepTarget: true, studyTarget: true, currency: true, theme: true, notifications: true,
        onboarded: true, createdAt: true, passwordHash: true,
      } }),
      prisma.task.findMany({ where: { userId }, include: { subtasks: { orderBy: { position: 'asc' } } }, orderBy: { position: 'asc' }, take: 3000 }),
      prisma.movie.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.habit.findMany({ where: { userId, archived: false }, orderBy: { createdAt: 'asc' } }),
      prisma.habitLog.findMany({ where: { userId, date: { gte: since } } }),
      prisma.dailyLog.findMany({ where: { userId, date: { gte: since } } }),
      prisma.workout.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'desc' } }),
      prisma.bodyEntry.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      prisma.meal.findMany({ where: { userId, date: { gte: since } }, orderBy: [{ date: 'desc' }, { time: 'asc' }] }),
      prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    ]);

  if (!user) return ok({ error: 'User not found' }, 404);
  const { passwordHash, ...safeUser } = user;
  return ok({
    user: { ...safeUser, hasPassword: Boolean(passwordHash) },
    tasks, movies, habits, habitLogs, dailyLogs, workouts, bodyEntries, meals, transactions, budgets, savingsGoals,
  });
});
