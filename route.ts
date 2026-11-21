import { prisma } from '@/lib/db';
import { ok, withUser } from '@/lib/api-utils';
import { dailyLogSchema } from '@/lib/validators';

/** Upsert the single daily log for (user, date). Only fields present in the body are changed. */
export const PUT = withUser(async (req, userId) => {
  const raw = await req.json();
  const body = dailyLogSchema.partial().required({ date: true }).parse(raw);
  const { date, ...fields } = body;
  const item = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date } },
    update: fields,
    create: { ...fields, userId, date },
  });
  return ok(item);
});
