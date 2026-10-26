/* FIT//OS service worker
 * - App shell (index.html, manifest, icons) is cached so the app opens offline / instantly.
 * - Page navigations are NETWORK-FIRST, so every normal launch picks up your latest GitHub deploy.
 *   Offline (or network slower than NAV_TIMEOUT) falls back to the cached copy.
 * - Firebase / Firestore / Google auth traffic is NEVER touched: those requests go straight to the
 *   network exactly as before, so your database behaviour is unchanged.
 * - Bump CACHE_VERSION on a release if you want installed apps to show the "update available" banner
 *   immediately (the page also detects index.html changes on its own — see the PWA block in index.html).
 */
const CACHE_VERSION = 'fitos-v1';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';
const NAV_TIMEOUT = 5000;

const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

// Only these cross-origin hosts are cached (static assets: fonts + Firebase SDK modules). Nothing else.
const CACHEABLE_CROSS_ORIGIN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => Promise.all(SHELL.map((u) =>
      c.add(new Request(u, { cache: 'reload' })).catch(() => {})
    )))
  );
  // No automatic skipWaiting: the page asks the user first (update banner), then sends SKIP_WAITING.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, RUNTIME_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('fitos-') && !keep.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function networkFirstNav(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await withTimeout(fetch(request, { cache: 'no-store' }), NAV_TIMEOUT);
    if (fresh && fresh.ok) cache.put('./index.html', fresh.clone());
    return fresh;
  } catch (e) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') { event.respondWith(networkFirstNav(req)); return; }
    if (url.pathname.endsWith('/sw.js')) return; // always let the browser check the worker itself
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (CACHEABLE_CROSS_ORIGIN.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
  // Everything else (Firestore, Auth, Google APIs…) is not intercepted at all.
});
