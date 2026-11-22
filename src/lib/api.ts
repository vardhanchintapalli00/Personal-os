export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---- Offline support: writes made without internet are saved on the device and sent later, in order. ----
const QUEUE_KEY = 'lifeos-queue-v1';
const MAP_KEY = 'lifeos-idmap-v1';
const QUEUEABLE = /^\/api\/(tasks|movies|habits|workouts|bodyEntries|meals|transactions|budgets|savingsGoals|dailylog|habitlog)(\/|\?|$)/;

interface Queued { url: string; method: string; json?: unknown; tmpId?: string }

const readJson = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};
const writeJson = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full */ } };

const canQueue = (url: string, method: string) =>
  typeof window !== 'undefined' && method !== 'GET' && (QUEUEABLE.test(url) || (url === '/api/profile' && method === 'PATCH'));

export const pendingCount = () => (typeof window === 'undefined' ? 0 : readJson<Queued[]>(QUEUE_KEY, []).length);

const swapIds = (text: string, map: Record<string, string>) => Object.entries(map).reduce((t, [from, to]) => t.split(from).join(to), text);

let flushing = false;
/** Sends saved offline changes to the server, oldest first. Stops (and keeps the rest) if the network or session is not ready. */
export async function flushQueue(): Promise<number> {
  if (flushing || typeof window === 'undefined' || navigator.onLine === false) return 0;
  flushing = true;
  let sent = 0;
  try {
    let queue = readJson<Queued[]>(QUEUE_KEY, []);
    const map = readJson<Record<string, string>>(MAP_KEY, {});
    while (queue.length) {
      const item = queue[0];
      try {
        const res = await fetch(swapIds(item.url, map), {
          method: item.method,
          headers: item.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
          body: item.json !== undefined ? swapIds(JSON.stringify(item.json), map) : undefined,
        });
        if (res.status === 401 || res.status >= 500) break; // try again later
        if (res.ok) {
          sent++;
          if (item.tmpId) {
            const data = (await res.json().catch(() => null)) as { id?: string } | null;
            if (data?.id) { map[item.tmpId] = data.id; writeJson(MAP_KEY, map); }
          }
        } // other 4xx: the change is no longer valid (for example the item was deleted), so drop it
      } catch {
        break; // still offline
      }
      queue = queue.slice(1);
      writeJson(QUEUE_KEY, queue);
    }
    if (!queue.length) writeJson(MAP_KEY, {});
  } finally {
    flushing = false;
  }
  if (sent > 0) window.dispatchEvent(new CustomEvent('lifeos:synced', { detail: sent }));
  return sent;
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown; tmpId?: string }): Promise<T> {
  const { json, headers, tmpId, ...rest } = init ?? {};
  const method = (rest.method ?? 'GET').toUpperCase();
  const queueable = canQueue(url, method);
  const saveForLater = (): T => {
    writeJson(QUEUE_KEY, [...readJson<Queued[]>(QUEUE_KEY, []), { url, method, json, tmpId } satisfies Queued]);
    return (tmpId ? { id: tmpId, ...((json as object) ?? {}) } : {}) as T;
  };

  // Offline, or older changes are still waiting: keep order by saving this one behind them.
  if (queueable && (navigator.onLine === false || pendingCount() > 0)) {
    const result = saveForLater();
    void flushQueue();
    return result;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    if (queueable) return saveForLater();
    throw new ApiError('You appear to be offline. Check your connection and try again.', 0);
  }
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new ApiError('Please sign in again.', 401);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', res.status);
  return data as T;
}
