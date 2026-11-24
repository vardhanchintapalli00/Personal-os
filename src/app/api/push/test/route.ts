import { fail, ok, withUser } from '@/lib/api-utils';
import { pushConfigured, sendToUser } from '@/lib/push-server';

export const dynamic = 'force-dynamic';

/** "Send a test reminder" button in Profile. */
export const POST = withUser(async (_req, userId) => {
  if (!pushConfigured()) return fail(503, 'Reminders are not set up on the server yet (missing VAPID keys).');
  const sent = await sendToUser(userId, { title: '💧 Time to drink water', body: 'Test reminder · Water today: 0/8 glasses ❌', tag: 'test', kind: 'water', url: '/life' });
  return sent ? ok({ sent }) : fail(404, 'No device is subscribed yet. Tap "Turn on phone reminders" first.');
});
