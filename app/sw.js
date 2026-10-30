/* JournalOS service worker
 * ------------------------------------------------------------------
 * HOW UPDATES WORK
 *   • index.html is fetched NETWORK-FIRST, so whenever you upload a new
 *     index.html, the next open (online) loads it automatically.
 *   • A running app also asks this worker "is there a newer index.html?"
 *     every hour / on tab focus; if yes, the user sees an
 *     "Update available" bar and one tap reloads into the new version.
 *   • If you change THIS file (e.g. bump VERSION) browsers install the new
 *     worker in the background and the same bar appears.
 *   • Bump VERSION whenever you want old caches cleared.
 * Firebase / Firestore / Auth / Storage / Gemini calls are NEVER cached
 * or intercepted — they always go straight to the network.
 */
const VERSION = '1.4.0';
const SHELL_CACHE = 'journalos-shell-' + VERSION;
const RUNTIME_CACHE = 'journalos-runtime-' + VERSION;
const SCOPE = self.registration.scope;               // https://your-domain.com/app/
const SHELL_KEY = SCOPE;                             // index.html is always stored under the scope URL
const STATIC_FILES = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const CDN_PRECACHE = [
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage-compat.js'
];
const NAV_TIMEOUT_MS = 5000;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // allSettled: one missing file must never block installation of the whole app
    await Promise.allSettled([
      shell.add(new Request(SHELL_KEY, { cache: 'reload' })),
      ...STATIC_FILES.map(f => shell.add(new Request(new URL(f, SCOPE).href, { cache: 'reload' })))
    ]);
    const rt = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(CDN_PRECACHE.map(async u => { const r = await fetch(u); if (r.ok) await rt.put(u, r); }));
    // NOTE: no skipWaiting() here — the page asks for it when the user taps "Update".
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('journalos-') && !keep.has(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'GET_VERSION' && event.ports[0]) { event.ports[0].postMessage({ version: VERSION }); return; }
  if (data.type === 'CHECK_UPDATE' && event.ports[0]) {
    event.waitUntil(checkForNewShell(data.build).then(r => event.ports[0].postMessage(r)));
  }
});

function buildOf(html) { const m = /<meta\s+name=["']app-build["']\s+content=["']([^"']*)["']/i.exec(html || ''); return m ? m[1] : ''; }

async function checkForNewShell(pageBuild) {
  let fresh;
  try { fresh = await fetch(new Request(SHELL_KEY, { cache: 'no-store' })); } catch (e) { return { status: 'offline' }; }
  if (!fresh || !fresh.ok) return { status: 'error' };
  const cache = await caches.open(SHELL_CACHE);
  const old = await cache.match(SHELL_KEY);
  const [a, b] = await Promise.all([fresh.clone().text(), old ? old.text() : Promise.resolve(null)]);
  const build = buildOf(a);
  const buildDiffers = !!(build && pageBuild && build !== pageBuild);
  if (b === null || a !== b) await cache.put(SHELL_KEY, fresh);
  return { status: (a !== b && b !== null) || buildDiffers ? 'updated' : 'current', build };
}

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin: only the Firebase SDK scripts and Google Fonts are cached; everything else
  // (Firestore, Auth, Storage, Gemini, accounts, analytics…) is left completely alone.
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) { event.respondWith(cacheFirst(req)); return; }
    if (url.hostname === 'fonts.googleapis.com') { event.respondWith(staleWhileRevalidate(req)); return; }
    if (url.hostname === 'fonts.gstatic.com') { event.respondWith(cacheFirst(req)); return; }
    return;
  }

  if (req.mode === 'navigate') { event.respondWith(networkFirstShell(event)); return; }
  if (url.pathname.endsWith('/sw.js')) return;
  if (req.cache === 'no-store' || req.cache === 'reload') return;       // explicit freshness requests pass through
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirstShell(event) {
  const cache = await caches.open(SHELL_CACHE);
  const fromNetwork = fetch(event.request).then(res => {
    if (res && res.ok) cache.put(SHELL_KEY, res.clone());
    return res;
  });
  try {
    return await Promise.race([
      fromNetwork,
      new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), NAV_TIMEOUT_MS))
    ]);
  } catch (e) {
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    try { return await fromNetwork; } catch (e2) {
      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JournalOS offline</title><body style="font-family:system-ui;padding:32px;text-align:center"><h2>You\'re offline</h2><p>Open JournalOS once while online so it can be saved on this device.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req) || await caches.match(req);
  const refresh = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await refresh) || new Response('', { status: 504 });
}
