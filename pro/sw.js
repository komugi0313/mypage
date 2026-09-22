/* 四柱推命占い自動鑑定 — オフライン対応 Service Worker（経験者版ドメイン専用）
   このドメインのページ一式を端末にキャッシュし、電波がなくても
   鑑定・60干支の教科書を使えるようにする。
   オンライン鑑定（生成AI）だけは通信が要るが、圏外時は端末内の
   オフライン鑑定に自動で切り替わる。 */
const CACHE = 'shichu-jidou-v59';  /* 重要修正: 命式表が印刷で2ページに割れて出ない不具合を修正(＠page余白0でフルブリード) */

/* 初回訪問時に先読みしてキャッシュするページ一式（このブランドのみ） */
const ASSETS = [
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-maskable-512.png', 'icon-crystal.png',
  'app-pro.html', 'meishi-sheet.html', 'index.html', 'textbook-pro.html',
  'pricing-pro.html', 'mypage-pro.html', 'auth.html',
  'terms-pro.html', 'tokushoho-pro.html', 'privacy-pro.html',
  'manifest-pro.webmanifest', 'icon-pro.svg',
  'pklove.js',
  'jikkan.html', 'tsuhensei.html', 'juniun.html', 'zohkan.html', 'kubo.html',
  'daiun-tenkanki.html', 'ritsuun.html', 'nichiza-tenchusatsu.html', 'ijokanshi.html',
  'kanshi-aisho.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // 送信系はそのまま
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // 生成AI等の外部通信は素通し

  // stale-while-revalidate：まずキャッシュを即返し、裏で最新を取り直して次回に備える
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || network.then((res) => res || cache.match('app-pro.html'));
      })
    )
  );
});
