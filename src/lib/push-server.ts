import webpush from 'web-push';
import { prisma } from './db';

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  kind?: 'water' | 'task' | 'test';
  taskId?: string;
  taskTitle?: string;
  url?: string;
}

export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function configure() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

/** Sends a push notification to every device the user has turned reminders on for. Returns how many were delivered. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  configure();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => null); // device unsubscribed
      }
    }),
  );
  return sent;
}
