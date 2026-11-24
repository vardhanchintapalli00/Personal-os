/* LifeOS service worker: makes the app open and show saved data without internet. */
const VERSION = 'v1';  // keep in sync with src/lib/offline.ts
const STATIC = `lifeos-static-${VERSION}`;
const PAGES = `lifeos-pages-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

const OFFLINE_PAGE = new Response(
  '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#080a12;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h2>You are offline</h2><p>Open LifeOS once with internet to save it for offline use.</p></div>',
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
);

/** Pages: show the saved copy immediately (like a native app) and refresh it in the background for next time. */
async function pageFast(event, req) {
  const cache = await caches.open(PAGES);
  const opts = { ignoreSearch: true, ignoreVary: true };
  const saved = await cache.match(req, opts);
  const refresh = fetch(req)
    .then((res) => { if (res.ok && !res.redirected) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  if (saved) { event.waitUntil(refresh); return saved; }
  const res = await refresh;
  if (res) return res;
  return (await cache.match('/', opts)) || OFFLINE_PAGE.clone();
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // data is saved by the app itself

  if (url.pathname.startsWith('/_next/static/') || url.pathname === '/icon.svg' || url.pathname === '/pwa-icon') {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(pageFast(event, req));
    return;
  }
  if (url.searchParams.has('_rsc')) {
    event.respondWith(networkFirst(req));
  }
});

/* ---------- Push reminders (water and tasks) with ✅ / ❌ buttons ---------- */
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'LifeOS', body: event.data ? event.data.text() : '' }; }
  const actionable = d.kind === 'water' || d.kind === 'task';
  const actions = actionable ? [{ action: 'done', title: d.kind === 'water' ? '✅ I drank' : '✅ Done' }, { action: 'notyet', title: '❌ Not yet' }] : [];
  event.waitUntil(
    self.registration.showNotification(d.title || 'LifeOS', {
      body: d.body || '',
      tag: d.tag || undefined,
      renotify: Boolean(d.tag),
      icon: '/pwa-icon?size=192',
      badge: '/pwa-icon?size=192',
      data: d,
      actions,
      requireInteraction: d.kind === 'task',
    }),
  );
});

const JSON_HEADERS = { 'Content-Type': 'application/json' };

self.addEventListener('notificationclick', (event) => {
  const d = event.notification.data || {};
  event.notification.close();
  const show = (title, body) => self.registration.showNotification(title, { body, tag: d.tag || undefined, icon: '/pwa-icon?size=192', badge: '/pwa-icon?size=192' });

  event.waitUntil(
    (async () => {
      if (event.action === 'notyet') {
        await show('❌ Not completed yet', d.kind === 'task' ? `${d.taskTitle || 'Your task'}: I will remind you again in an hour.` : 'No problem. I will remind you again later.');
        return;
      }
      if (event.action === 'done') {
        try {
          if (d.kind === 'water') {
            const res = await fetch('/api/push/action', { method: 'POST', headers: JSON_HEADERS, credentials: 'same-origin', body: JSON.stringify({ kind: 'water' }) });
            if (res.ok) {
              const out = await res.json();
              await show('✅ Water logged', `Water today: ${out.water}/${out.goal} glasses ${out.water >= out.goal ? '✅' : '❌'}`);
              return;
            }
          } else if (d.kind === 'task' && d.taskId) {
            const today = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
            const res = await fetch('/api/tasks/' + d.taskId, { method: 'PATCH', headers: JSON_HEADERS, credentials: 'same-origin', body: JSON.stringify({ status: 'Completed', completedOn: today, progress: 100 }) });
            if (res.ok) { await show('✅ Task completed', d.taskTitle || 'Great job!'); return; }
          }
        } catch (e) { /* fall through and open the app */ }
      }
      const url = d.url || '/';
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if ('focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url); } catch (e) { /* ignore */ } } return; }
      }
      await clients.openWindow(url);
    })(),
  );
});
