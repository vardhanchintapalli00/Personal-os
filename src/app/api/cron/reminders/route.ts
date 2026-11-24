import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pushConfigured, sendToUser } from '@/lib/push-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HOUR = 3600 * 1000;
const IST = 5.5 * HOUR;
const DEFAULT_DUE_TIME = '18:00'; // tasks with a date but no time are treated as due at 6 pm
const QUIET_FROM = 23; // no reminders from 11 pm ...
const QUIET_UNTIL = 7; // ... until 7 am (India time)

const pad = (n: number) => String(n).padStart(2, '0');
const dayStr = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);
const dueMs = (date: string, time?: string | null) => new Date(`${date}T${time || DEFAULT_DUE_TIME}:00+05:30`).getTime();

function leftLabel(ms: number) {
  const mins = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  const t = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return ms >= 0 ? `due in ${t}` : `overdue by ${t}`;
}
function clock12(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'pm' : 'am'}`;
}

/** Runs every few minutes (from cron-job.org). Sends each reminder at most once, using ReminderLog as the memory. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!pushConfigured()) return NextResponse.json({ error: 'Missing VAPID keys' }, { status: 503 });

  const now = Date.now();
  const ist = new Date(now + IST);
  const hour = ist.getUTCHours();
  const today = dayStr(now);
  if (hour >= QUIET_FROM || hour < QUIET_UNTIL) return NextResponse.json({ skipped: 'quiet hours' });

  await prisma.reminderLog.deleteMany({ where: { sentAt: { lt: new Date(now - 3 * 24 * HOUR) } } }).catch(() => null);

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true, waterGoal: true, notifications: true },
  });

  // Claims a reminder slot. Returns false if it was already sent (so overlapping runs never double-send).
  const claim = async (userId: string, key: string) => {
    try { await prisma.reminderLog.create({ data: { userId, key } }); return true; } catch { return false; }
  };

  let sent = 0;
  for (const u of users) {
    const prefs = (u.notifications ?? {}) as Record<string, boolean>;

    // ---- Water: every 2 hours from 8 am to 10 pm until the daily goal is reached ----
    if (prefs.water !== false && hour >= 8 && hour <= 22) {
      const slot = hour - (hour % 2);
      const log = await prisma.dailyLog.findUnique({ where: { userId_date: { userId: u.id, date: today } }, select: { water: true } });
      const glasses = log?.water ?? 0;
      if (glasses < u.waterGoal && (await claim(u.id, `water:${today}:${slot}`))) {
        sent += await sendToUser(u.id, {
          title: '💧 Time to drink water',
          body: `Water today: ${glasses}/${u.waterGoal} glasses ❌`,
          tag: 'water', kind: 'water', url: '/life',
        });
      }
    }

    // ---- Tasks: once 5 hours before the due time, then every hour from 3 hours before until done (up to 24 h overdue) ----
    if (prefs.tasks !== false) {
      const tasks = await prisma.task.findMany({
        where: { userId: u.id, status: { not: 'Completed' }, dueDate: { gte: dayStr(now - 24 * HOUR), lte: dayStr(now + 24 * HOUR) } },
        select: { id: true, title: true, dueDate: true, dueTime: true },
        take: 30,
      });
      for (const t of tasks) {
        const due = dueMs(t.dueDate!, t.dueTime);
        const left = due - now;
        let slotKey: string | null = null;
        if (left <= 5 * HOUR && left > 3 * HOUR) slotKey = `task:${t.id}:t5`;
        else if (left <= 3 * HOUR && left > -24 * HOUR) slotKey = `task:${t.id}:h${Math.floor((3 * HOUR - left) / HOUR)}`;
        if (!slotKey || !(await claim(u.id, slotKey))) continue;
        const when = t.dueDate === today ? 'today' : t.dueDate!;
        sent += await sendToUser(u.id, {
          title: '❌ Task not completed',
          body: `${t.title}\nDue ${when} ${clock12(t.dueTime || DEFAULT_DUE_TIME)} · ${leftLabel(left)}`,
          tag: `task-${t.id}`, kind: 'task', taskId: t.id, taskTitle: t.title, url: '/tasks',
        });
      }
    }
  }
  return NextResponse.json({ ok: true, users: users.length, sent });
}
