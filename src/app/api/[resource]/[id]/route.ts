import { prisma } from '@/lib/db';
import { fail, ok, withUser } from '@/lib/api-utils';
import { RESOURCES, isResource } from '@/lib/validators';
import { nextOccurrence } from '@/lib/recurrence';

type Ctx = { params: { resource: string; id: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegate = (model: string) => (prisma as any)[model];

export const GET = withUser<Ctx>(async (_req, userId, { params }) => {
  if (!isResource(params.resource)) return fail(404, 'Unknown resource');
  const include = params.resource === 'tasks' ? { subtasks: { orderBy: { position: 'asc' } } } : undefined;
  const item = await delegate(RESOURCES[params.resource].model).findFirst({ where: { id: params.id, userId }, include });
  return item ? ok(item) : fail(404, 'Not found');
});

export const PATCH = withUser<Ctx>(async (req, userId, { params }) => {
  if (!isResource(params.resource)) return fail(404, 'Unknown resource');
  const def = RESOURCES[params.resource];
  const raw = await req.json();
  // Partial update: reuse the create schema's shape without defaults overriding untouched fields.
  const shape = 'partial' in def ? def.partial : (def.schema as unknown as { partial: () => { parse: (v: unknown) => unknown } }).partial();
  const body = shape.parse(raw) as Record<string, unknown>;

  const existing = await delegate(def.model).findFirst({ where: { id: params.id, userId } });
  if (!existing) return fail(404, 'Not found');

  if (params.resource === 'tasks') {
    const { subtasks, ...rest } = body as { subtasks?: { title: string; completed: boolean }[] } & Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest };
    const wasDone = existing.status === 'Completed';

    if (subtasks) {
      const done = subtasks.filter((s) => s.completed).length;
      data.progress = subtasks.length ? Math.round((done / subtasks.length) * 100) : existing.progress;
    }
    if (data.status === 'Completed') {
      data.progress = 100;
      data.completedOn = (raw.completedOn as string | undefined) ?? existing.completedOn ?? new Date().toISOString().slice(0, 10);
    } else if (data.status && wasDone) {
      data.completedOn = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (subtasks) {
        await tx.subtask.deleteMany({ where: { taskId: params.id } });
        await tx.subtask.createMany({
          data: subtasks.map((s, i) => ({ taskId: params.id, title: s.title, completed: s.completed, position: i })),
        });
      }
      return tx.task.update({
        where: { id: params.id },
        data: data as never,
        include: { subtasks: { orderBy: { position: 'asc' } } },
      });
    });

    // Recurring task completed -> spawn the next occurrence.
    if (!wasDone && updated.status === 'Completed' && updated.recurrence !== 'none' && updated.dueDate) {
      const nextDue = nextOccurrence(updated.dueDate, updated.recurrence, updated.recurrenceInterval);
      if (nextDue) {
        await prisma.task.create({
          data: {
            userId,
            title: updated.title,
            description: updated.description,
            category: updated.category,
            priority: updated.priority,
            dueDate: nextDue,
            dueTime: updated.dueTime,
            estimatedMin: updated.estimatedMin,
            recurrence: updated.recurrence,
            recurrenceInterval: updated.recurrenceInterval,
            reminderMinutes: updated.reminderMinutes,
            notes: updated.notes,
            position: updated.position,
            subtasks: { create: updated.subtasks.map((s, i) => ({ title: s.title, completed: false, position: i })) },
          },
        });
      }
    }
    return ok(updated);
  }

  const item = await delegate(def.model).update({ where: { id: params.id }, data: body });
  return ok(item);
});

export const DELETE = withUser<Ctx>(async (_req, userId, { params }) => {
  if (!isResource(params.resource)) return fail(404, 'Unknown resource');
  const def = RESOURCES[params.resource];
  const result = await delegate(def.model).deleteMany({ where: { id: params.id, userId } });
  return result.count ? ok({ deleted: true }) : fail(404, 'Not found');
});
