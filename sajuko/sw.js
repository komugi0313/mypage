/* 사주 자동풀이 — 오프라인 지원 Service Worker (경험자판 도메인 전용)
   이 도메인의 페이지 일체를 기기에 캐시하여, 인터넷이 없어도
   감정 · 60간지 교과서를 사용할 수 있게 합니다.
   온라인 감정(생성형 AI)만 통신이 필요하며, 오프라인 시에는 기기 내
   오프라인 감정으로 자동 전환됩니다. */
const CACHE = 'saju-jadongpuri-v3';

/* 첫 방문 시 미리 캐시하는 페이지 일체 (이 브랜드 전용) */
const ASSETS = [
  'app-pro.html', 'index.html', 'textbook-pro.html',
  'pricing-pro.html', 'mypage-pro.html',
  'terms-pro.html', 'tokushoho-pro.html', 'privacy-pro.html',
  'manifest-pro.webmanifest', 'icon-pro.svg',
  'icon-180.png', 'icon-192.png', 'icon-512.png'
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
  if (req.method !== 'GET') return;                       // 전송 계열은 그대로
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // 생성형 AI 등 외부 통신은 통과

  // network-first: 온라인이면 항상 최신본을 표시하고 캐시를 갱신,
  // 오프라인일 때만 캐시로 대체(오프라인 지원은 그대로 유지)
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(req, { cache: 'no-cache' }).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() =>
        cache.match(req).then((cached) => cached || cache.match('app-pro.html'))
      )
    )
  );
});
