/* Numinous service worker — NETWORK-FIRST.
   Online: every request goes to the network, so users always see the newest
   deploy immediately — stale content is never shown, not even for a moment.
   Offline: the app shell (including the engine) is served from the cache, so
   charts, cycles and the calendar still compute without a connection.
   (Readings are composed live and need the network either way.) */
const CACHE = 'clarity-v2';
const ASSETS = [
  './', './index.html', './app.html',
  './geo.js', './cycles.js', './lexicon.js', './bazi.js', './bazi-bridge.js', './dayfortune.js',
  './meishiban_pillars.html',
  './terms.html', './privacy.html',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      // online: pass the fresh response through, and keep the offline copy current
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      // offline: fall back to the cached copy (or the app shell for navigations)
      caches.match(e.request).then(c => c || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
