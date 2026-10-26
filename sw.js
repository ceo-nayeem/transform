/* Legacy cleanup: the app's service worker now lives at /app/sw.js. This removes the old root-scope one. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(self.registration.unregister().then(function () { return caches.keys(); })
    .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
});
