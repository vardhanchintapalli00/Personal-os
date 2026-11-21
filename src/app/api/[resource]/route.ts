import { prisma } from '@/lib/db';
import { fail, ok, withUser } from '@/lib/api-utils';
import { RESOURCES, isResource } from '@/lib/validators';

type Ctx = { params: { resource: string } };

// Prisma delegates share the same method names, so we address them dynamically.
// Every query below is scoped by userId, so a user can never touch another user's rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegate = (model: string) => (prisma as any)[model];

export const GET = withUser<Ctx>(async (_req, userId, { params }) => {
  if (!isResource(params.resource)) return fail(404, 'Unknown resource');
  const def = RESOURCES[params.resource];
  const include = params.resource === 'tasks' ? { subtasks: { orderBy: { position: 'asc' } } } : undefined;
  const items = await delegate(def.model).findMany({ where: { userId }, include, take: 2000 });
  return ok(items);
});

export const POST = withUser<Ctx>(async (req, userId, { params }) => {
  if (!isResource(params.resource)) return fail(404, 'Unknown resource');
  const def = RESOURCES[params.resource];
  const body = def.schema.parse(await req.json()) as Record<string, unknown>;

  if (params.resource === 'tasks') {
    const { subtasks, ...rest } = body as { subtasks?: { title: string; completed: boolean }[] };
    const subs = subtasks ?? [];
    const done = subs.filter((s) => s.completed).length;
    const progress = subs.length ? Math.round((done / subs.length) * 100) : (rest as { progress?: number }).progress ?? 0;
    const last = await prisma.task.aggregate({ where: { userId }, _max: { position: true } });
    const item = await prisma.task.create({
      data: {
        ...(rest as object),
        progress,
        position: (last._max.position ?? 0) + 1,
        userId,
        subtasks: { create: subs.map((s, i) => ({ title: s.title, completed: s.completed, position: i })) },
      } as never,
      include: { subtasks: { orderBy: { position: 'asc' } } },
    });
    return ok(item, 201);
  }

  if (params.resource === 'budgets') {
    const b = body as { category: string; monthlyLimit: number };
    const item = await prisma.budget.upsert({
      where: { userId_category: { userId, category: b.category } },
      update: { monthlyLimit: b.monthlyLimit },
      create: { userId, category: b.category, monthlyLimit: b.monthlyLimit },
    });
    return ok(item, 201);
  }

  const item = await delegate(def.model).create({ data: { ...body, userId } });
  return ok(item, 201);
});
