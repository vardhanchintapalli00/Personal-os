import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ZodError } from 'zod';
import { authOptions } from './auth';

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: message, details }, { status });

export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** Wraps a handler: authenticates, converts thrown errors to JSON responses. */
export function withUser<Ctx = unknown>(
  handler: (req: Request, userId: string, ctx: Ctx) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const userId = await getUserId();
      if (!userId) return fail(401, 'Please sign in to continue.');
      return await handler(req, userId, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const where = first?.path?.length ? `${first.path.join('.')}: ` : '';
        return fail(400, `${where}${first?.message ?? 'Invalid input'}`, err.flatten());
      }
      console.error('[api]', err);
      return fail(500, 'Something went wrong on our side. Please try again.');
    }
  };
}

/** Simple in-memory limiter (per server instance). Swap for Redis/Upstash when scaling out. */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  entry.n += 1;
  return entry.n <= max;
}
