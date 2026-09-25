/* 四柱推命占い自動鑑定 — オフライン対応 Service Worker（経験者版ドメイン専用）
   このドメインのページ一式を端末にキャッシュし、電波がなくても
   鑑定・60干支の教科書を使えるようにする。
   オンライン鑑定（生成AI）だけは通信が要るが、圏外時は端末内の
   オフライン鑑定に自動で切り替わる。 */
const CACHE = 'shichu-jidou-v151';  /* LPのデモ動画を字幕なし・現行UIで作り直して差し替え（旧・字幕焼き込みのdemo.mp4/demo-poster.jpgを削除し、demo.webm＋demo-poster.pngに）。※古い端末互換のためエンジニアがwebm→mp4変換予定。※v150＝①鑑定文の「編集」でページが縮み相性セクションへスクロールが飛ぶ不具合を修正（focusのpreventScroll＋編集欄を画面内に固定）。②LPのデモ動画のオーバーレイ文字（📱スマホ対応！／🔊音声ボタン）を削除（動画は自動再生・ミュート・ネイティブ操作は保持）。※デモ動画本体の焼き込みキャプション・内容更新は別途動画差し替えが必要。※v149＝結果上部のジャンプナビ先頭に「🖨 印刷」ボタンを追加（命式表〈鑑定書〉を別タブで開く＝openMeishiSheet）。スティッキーで常時表示・左端固定。ナビ色分けのnth-childを1つ後ろへ調整。※v148＝折りたたみ見出しを「くわしい設定（…）」→「恋愛対象の修正や他流派」に変更（“詳しく設定すると良くなる”という誤解を避け、任意項目であることを明確化）。※v147＝「※ふつうは開かなくてOK」の赤文字注記を削除。※v146＝エンジン正確化：①節入り判定を北京時間(UTC+8)基準に統一（tyme4tsの節気は北京時間のため、日本の生時をそのまま比べていたズレを解消。年柱・月柱・順逆・立運・大運の判定のみ。日柱・時柱は真太陽時で不変。影響は節入り直前約1時間生まれの約0.2%のみ、大多数は不変）②立運前の「今の大運」を第一運＝月柱に統一（curDu/monthDuOf/duListWithMonth、鑑定文・空亡・夫婦冲・相性・五行の巡りに反映）③印刷命式表：立運1年未満で大運が10年ずれる不具合を修正（干支ずらし廃止＋0歳＝月柱行）④命式表の年運「今年」を立春で切替。基準ケース1981-06-10 22:28は不変。※v145＝生年月日プルダウン／v144＝AI鑑定文の分量 */

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
