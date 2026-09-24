/* 四柱推命占い自動鑑定 — オフライン対応 Service Worker（経験者版ドメイン専用）
   このドメインのページ一式を端末にキャッシュし、電波がなくても
   鑑定・60干支の教科書を使えるようにする。
   オンライン鑑定（生成AI）だけは通信が要るが、圏外時は端末内の
   オフライン鑑定に自動で切り替わる。 */
const CACHE = 'shichu-jidou-v127';  /* 相談への回答を強化：オフラインに「子宝」「学業・試験」テーマを追加＋「子ども→対人」の誤爆を修正、宝くじ/株など。占いで断定できない質問（寿命・病名・当落・投資額・法律）は黙ってすり替えず「断定できません」と断ってから読める範囲へ案内（オフライン＋オンライン両対応）。※v126＝詳細鑑定に1日上限 */＝50回/日を追加（不正利用防止）。超過はその日だけ自動で定型文（オフライン鑑定）にフォールバック・翌日リセット。アプリと鑑定書で共有カウンタ。厳密な強制はサーバー側（HANDOFF記載）。※v125＝認証をメール＋パスワード方式に変更 */（マジックリンク廃止）：auth.htmlをログイン/新規登録/確認メール/再設定に刷新、会員ゲートもメール＋パスワード＋「この端末に保存」に。メール誤りは確認メール不達→登録し直し導線。BACKEND_HANDOFF.md更新。※v124＝鑑定書を命式表つきに一本化 */：各鑑定文の「印刷/PDF」と保存一覧の「印刷」を廃止。鑑定書の鑑定文は既定オンライン(詳細鑑定)＝圏外時のみ自動でオフライン(定型文)にフォールバック。※v123＝端末内保存の注意書きを追加＋PDF保存/共有ボタンを目立たせ、「わたしの既定（この設定を既定にする）」で紙・版・モチーフ・五行カラー・命式表の型・章の選択を次回も同じに。将来のクラウド同期の接続点(CLOUD stub)も用意。※v122＝マイページ周りの見た目統一・導線整理 */：auth.htmlを暖色テーマに統一、アプリ内パネルは「保存・メモ」に改称して契約ページ（マイページ）へのリンクを追加、mypage-pro.htmlからツール内「保存・メモ」への案内を追加。決済/バックエンドの接続点(CONFIG)は不変。※v121＝目次ピルボタン色分け／v120＝会局を分かりやすく／v119＝通変星ホイールの数え方注記を司令に統一／v118＝要約枠セージ緑＋本文15px／v117＝要約枠を短い結論に＋箇条書き整形／v116＝相性もテーマ別／v115＝個人オフラインのテーマ別化＋わかりやすさ3原則 */

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
