/* Pocket鑑定 PWA Service Worker
   ・アプリシェルをキャッシュしてオフライン対応＆高速起動
   ・HTML/ナビゲーションは network-first（再デプロイ後すぐ最新を表示、圏外はキャッシュ）
   ・JS/画像等は stale-while-revalidate（即表示＋裏で更新）
   ・AI通信（/functions・/.netlify・generativelanguage）は絶対にキャッシュせず常にネットワークへ
   ※アプリを更新したら CACHE の版番号を上げると確実に配信されます。 */
var CACHE = 'pocket-kantei-v93';
var SHELL = [
  './', './index.html', './lp.html', './pro-bazi.js', './pro-adapter.js',
  './owl.png', './icon-512.png', './icon-192.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './favicon-32.png', './favicon.ico', './manifest.webmanifest', './legal.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  /* 外部通信・AI通信はSWを通さない（常にネットワーク） */
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/.netlify/') >= 0 || url.pathname.indexOf('/functions/') >= 0 || url.pathname.indexOf('generativelanguage') >= 0) return;

  var isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0;
  if (isNav) {
    /* HTML＝network-first：最新を優先、圏外はキャッシュ、最後の砦として index.html */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* その他の同一オリジン資産＝stale-while-revalidate */
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (cached) {
        var net = fetch(req).then(function (res) {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) c.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || net;
      });
    })
  );
});
