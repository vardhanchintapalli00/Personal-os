/** Saves every page of the app (and the script/style files they need) on the device so LifeOS opens without internet. */
const PAGES = 'lifeos-pages-v2';
const STATIC = 'lifeos-static-v1';

export async function precacheApp(paths: string[]) {
  if (typeof window === 'undefined' || !('caches' in window) || navigator.onLine === false) return;
  try {
    const pages = await caches.open(PAGES);
    const files = await caches.open(STATIC);
    for (const path of paths) {
      const res = await fetch(path, { credentials: 'same-origin' });
      if (!res.ok || res.redirected || !(res.headers.get('content-type') || '').includes('text/html')) continue;
      const html = await res.clone().text();
      await pages.put(path, res);
      const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s<>]+\.(?:js|css|woff2?)/g) ?? []);
      for (const url of Array.from(assets)) {
        if (await files.match(url)) continue;
        const r = await fetch(url);
        if (r.ok) await files.put(url, r);
      }
    }
  } catch { /* offline or storage full: try again next session */ }
}
