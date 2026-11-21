import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { prisma } from '@/lib/db';
import { fail, ok, rateLimit } from '@/lib/api-utils';
import { registerSchema } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
    if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) return fail(429, 'Too many attempts. Please try again later.');

    const { name, email, password } = registerSchema.parse(await req.json());
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return fail(409, 'An account with this email already exists. Try signing in.');

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
      select: { id: true, email: true },
    });
    return ok(user, 201);
  } catch (err) {
    if (err instanceof ZodError) return fail(400, err.issues[0]?.message ?? 'Invalid input');
    console.error('[register]', err);
    return fail(500, 'Could not create your account. Please try again.');
  }
}
