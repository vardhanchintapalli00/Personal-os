import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, ok, withUser } from '@/lib/api-utils';

const schema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean(),
});

/** Marks a habit done (creates a log) or undone (removes it) for one day. */
export const POST = withUser(async (req, userId) => {
  const { habitId, date, done } = schema.parse(await req.json());
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId }, select: { id: true } });
  if (!habit) return fail(404, 'Habit not found');
  if (done) {
    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      update: { done: true },
      create: { userId, habitId, date, done: true },
    });
    return ok(log);
  }
  await prisma.habitLog.deleteMany({ where: { habitId, userId, date } });
  return ok({ removed: true });
});
