import { api } from './api';

function keyToBytes(base64Url: string) {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PushResult = 'ok' | 'denied' | 'unsupported' | 'no-server-key';

/** Asks permission and registers this phone for water and task reminders. */
export async function enablePush(): Promise<PushResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const { key } = await api<{ key: string }>('/api/push/key');
  if (!key) return 'no-server-key';
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) as unknown as BufferSource }));
  const json = sub.toJSON();
  await api('/api/push/subscribe', { method: 'POST', json: { endpoint: json.endpoint, keys: json.keys } });
  return 'ok';
}
