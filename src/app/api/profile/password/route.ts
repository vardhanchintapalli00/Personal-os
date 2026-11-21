import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { fail, ok, rateLimit, withUser } from '@/lib/api-utils';
import { passwordSchema } from '@/lib/validators';

export const POST = withUser(async (req, userId) => {
  if (!rateLimit(`pw:${userId}`, 8, 15 * 60 * 1000)) return fail(429, 'Too many attempts. Try again later.');
  const { currentPassword, newPassword } = passwordSchema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return fail(404, 'User not found');

  // Google-only accounts have no password yet, so they can set one without a current password.
  if (user.passwordHash) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return fail(400, 'Current password is incorrect.');
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  return ok({ changed: true });
});
