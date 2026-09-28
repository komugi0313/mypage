/* 四柱推命占い自動鑑定 — オフライン対応 Service Worker（経験者版ドメイン専用）
   このドメインのページ一式を端末にキャッシュし、電波がなくても
   鑑定・60干支の教科書を使えるようにする。
   オンライン鑑定（生成AI）だけは通信が要るが、圏外時は端末内の
   オフライン鑑定に自動で切り替わる。 */
const CACHE = 'shichu-jidou-v255';  /* (1)用語を流派に合わせ「身強」→「身旺（みおう）」に統一（複合語は身旺・身弱）。(2)身旺・身弱の上書きボタンを「⚙詳細設定」の中から、鑑定バーの常時表示位置へ移動（鑑定書を見ながら即切替できるように）。上書き→喜神・忌神・会局色・ラッキーカラー・養生の文章まで連動＋別人で自動リセットは従来通り。※v249=日支の通根を追加。※v248=月令点導入＋比劫印カウント撤去。 ※v252=上書き時に守護神(喜神)が空になる不具合を修正。※v253=全体点検：上書き時に守護神パネル(#shugoWrap)も追随していなかったのを修正。命式表の身旺/身弱ラベル・守護神パネル・鑑定書の文言・喜神忌神・会局色まで、ボタン1つで完全連動（UI操作で検証）。 ※v254=月運にも「巡る吉凶星」を追加（大運・年運と同じ照合ロジック＝月支基準/三合基準/日干基準。今月の運気パネル＋鑑定文に反映。短期・影響小と明記）。 ※v255=「目の前の運（日運・月運）」セクションを新設。日付/月を選んで照会＋今日から2週間の日運一覧＋これから12ヶ月の月運一覧。各々に良い日/注意日の目安（身旺身弱＋喜神忌神）・巡る吉凶星・命式との合冲・過ごし方を表示。鑑定文にも近運の山谷を提供。計算エンジンは非改変。 */

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
  'kanshi-aisho.html', 'aisho-pattern.html', 'daiun-tsuhen.html', 'setsuboku.html', 'tensen-chichu.html', 'nayin-aisho.html', 'boko-kaichu.html', 'kaikyoku.html', 'inyoku.html', 'nichiza.html', 'kodoku.html'
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
