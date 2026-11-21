import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ok, withUser } from '@/lib/api-utils';
import { clearUserData, createDefaultHabits, seedDemoData } from '@/lib/demo';

const schema = z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** POST: replace the user's data with fresh demo data. */
export const POST = withUser(async (req, userId) => {
  const { today } = schema.parse(await req.json());
  await seedDemoData(prisma, userId, today);
  return ok({ seeded: true });
});

/** DELETE: remove all tracked data and start clean (keeps the account and default habits). */
export const DELETE = withUser(async (_req, userId) => {
  await clearUserData(prisma, userId);
  await createDefaultHabits(prisma, userId);
  return ok({ cleared: true });
});
