import { prisma } from '@/lib/db';
import { fail, ok, withUser } from '@/lib/api-utils';
import { profileSchema } from '@/lib/validators';

export const PATCH = withUser(async (req, userId) => {
  const data = profileSchema.parse(await req.json());
  const { notifications, image, ...rest } = data;
  if (rest.email) {
    const taken = await prisma.user.findFirst({ where: { email: rest.email, NOT: { id: userId } }, select: { id: true } });
    if (taken) return fail(409, 'That email is already used by another account.');
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...rest,
      ...(notifications ? { notifications } : {}),
      ...(image !== undefined ? { image: image || null } : {}),
    },
    select: { id: true },
  });
  return ok(user);
});

export const DELETE = withUser(async (req, userId) => {
  const { confirmEmail } = (await req.json().catch(() => ({}))) as { confirmEmail?: string };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user || confirmEmail?.toLowerCase().trim() !== user.email) {
    return fail(400, 'Type your account email exactly to confirm deletion.');
  }
  await prisma.user.delete({ where: { id: userId } }); // cascades to all user data
  return ok({ deleted: true });
});
