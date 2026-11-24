import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, ok, withUser } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const schema = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(5) }) });

export const POST = withUser(async (req, userId) => {
  const body = schema.parse(await req.json());
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
    create: { userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  return ok({ ok: true });
});

export const DELETE = withUser(async (req, userId) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await req.json());
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  return ok({ ok: true });
});
