import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, ok, withUser } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const istDate = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

/** Called when "✅ I drank" is tapped on a water reminder: adds one glass to today's log. */
export const POST = withUser(async (req, userId) => {
  const { kind } = z.object({ kind: z.literal('water') }).parse(await req.json());
  if (kind !== 'water') return fail(400, 'Unknown action');
  const date = istDate();
  const [log, user] = await Promise.all([
    prisma.dailyLog.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { waterGoal: true } }),
  ]);
  const water = (log?.water ?? 0) + 1;
  await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date } },
    update: { water },
    create: { userId, date, water },
  });
  return ok({ water, goal: user?.waterGoal ?? 8 });
});
