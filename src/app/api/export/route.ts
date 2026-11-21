import { prisma } from '@/lib/db';
import { fail, withUser } from '@/lib/api-utils';

// Server-side CSV export (PDF is generated in the browser from the same data).
const esc = (v: unknown) => {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]).filter((c) => !['userId', 'passwordHash'].includes(c));
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export const GET = withUser(async (req, userId) => {
  const which = new URL(req.url).searchParams.get('resource') ?? 'all';
  const where = { userId };
  const sources: Record<string, () => Promise<Record<string, unknown>[]>> = {
    tasks: async () => (await prisma.task.findMany({ where, include: { subtasks: true } })).map((t) => ({ ...t, subtasks: t.subtasks.map((s) => `${s.completed ? '[x]' : '[ ]'} ${s.title}`).join(' | ') })),
    movies: () => prisma.movie.findMany({ where }),
    habits: () => prisma.habit.findMany({ where }),
    habitLogs: () => prisma.habitLog.findMany({ where }),
    dailyLogs: () => prisma.dailyLog.findMany({ where }),
    workouts: () => prisma.workout.findMany({ where }),
    bodyEntries: () => prisma.bodyEntry.findMany({ where }),
    meals: () => prisma.meal.findMany({ where }),
    transactions: () => prisma.transaction.findMany({ where }),
    budgets: () => prisma.budget.findMany({ where }),
    savingsGoals: () => prisma.savingsGoal.findMany({ where }),
  };

  const keys = which === 'all' ? Object.keys(sources) : [which];
  if (keys.some((k) => !sources[k])) return fail(400, 'Unknown resource');

  const parts: string[] = [];
  for (const k of keys) {
    const csv = toCsv(await sources[k]());
    parts.push(keys.length > 1 ? `# ${k}\n${csv || '(no data)'}` : csv);
  }
  return new Response(parts.join('\n\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lifeos-${which}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
