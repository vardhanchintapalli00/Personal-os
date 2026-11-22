/* LifeOS service worker: makes the app open and show saved data without internet. */
const VERSION = 'v1';
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
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName, fallbackToHome) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req)) || (fallbackToHome ? await cache.match('/') : undefined);
    if (hit) return hit;
    if (fallbackToHome) {
      return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#080a12;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h2>You are offline</h2><p>Open LifeOS once with internet to save it for offline use.</p></div>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }
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
    event.respondWith(networkFirst(req, PAGES, true));
    return;
  }
  if (url.searchParams.has('_rsc')) {
    event.respondWith(networkFirst(req, PAGES, false));
  }
});
