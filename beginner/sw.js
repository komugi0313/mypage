/* 今日から占い師 — オフライン対応 Service Worker（初心者版ドメイン専用）
   このドメインのページ一式を端末にキャッシュし、電波がなくても
   鑑定・60干支の教科書を使えるようにする。
   オンライン鑑定（生成AI）だけは通信が要るが、圏外時は端末内の
   オフライン鑑定に自動で切り替わる。 */
const CACHE = 'kyoukara-uranaishi-v18';/* v18=流派名は一切出さない方針に統一（誤解防止）。鑑定書(meishi-sheet)コード内コメントの帰属表記から「阿部泰山流／当流派」を外し「（CLAUDE.md準拠）」のみに。表示/表記のみ・計算エンジン非改変。 / v17=LP表記の是正：(1)CLAUDE.mdの「サイト内で『AI』語を使わない」に合わせ、ヒーロー下バッジ「🤖 AIが詳しく解析」→「🔍 自動で詳しく解析」、ギャラリー注記「（AI鑑定・実データ）」→「（詳細鑑定・実データ）」。(2)鑑定書コメントの流派帰属を調整。表示/表記のみ・価格/計算エンジン非改変。 / v16=LP泣き別れ一括修正＋見出しコピー調整：(1)「できることは本物」見出しを「占い師に必要なこと、全部揃ってます。」に変更し語のまとまりで改行。(2)「いちばんの強み」見出しの「時期が、」が「時／期が」と割れていたのを解消＋見出し先頭の浮いた絵文字🌟を削除（高級感のため）。(3)強みのリード文と特徴カード（狙って動く・今、動くといい理由 等）の泣き別れを.nbチャンクで解消。表示のみ・価格/計算エンジン非改変。 / v15=ヒーローのリード文「本格的な鑑定士」が「本／格的な鑑定士」と泣き別れしていたのを折り返し禁止(nowrap)で解消。表示のみ・文言非改変。 / v14=LP上部バー(.topbar:ロゴ＋今すぐ無料体験)を固定(sticky)から通常配置に変更＝スクロール時に画面上部へ貼り付いて「月額プラン」等の見出しに重なる問題を解消。モバイルは下部に常時表示の無料体験CTAが別途あるため、上部の追従は不要。表示のみ・文言/価格/エンジン非改変。 / v13=LP料金セクションの日本語の泣き別れ（語の途中での改行）を解消＝見出し「四柱推命をイチから学ぶことを考えたら。」・料金比較の行（このツール等のラベルを折り返し禁止＋flex固定、各値を語のまとまりで保持）・料金注記（「費用／0円」等の分断を防止）を、既存の.nb(nowrap)でチャンク化して自然な位置でのみ改行されるよう調整。文言・価格・計算は不変、見た目のみ。 / v12=LP刷新＝価格をPRO版と統一（月額9,800／年8,167・年98,000／半年8,800・半52,800）。ヒーローをA案「勉強ゼロで、今日から本格。」＋タグライン「一生使える本格鑑定ツール」に差し替え、リード文を「やさしく学んで本格的な鑑定士にもなれます」に。比較カードの対象を「はじめて〜これから極めたい方へ／趣味から副業・プロの鑑定士まで」へ書き換え（“家族・友達だけ”の限定イメージを撤廃）。料金比較ブロックに「対面鑑定1回5,000〜10,000円／都度払い」の行と「月額9,800円で何人でも・何回でも使い放題」の訴求、料金注記に「対面鑑定1回分より安い・1日約320円」を追加。pricing.htmlも同価格に統一。表示のみ・エンジン非改変。 / v11=LP(index.html)に「どちらが向いてる？」比較セクションを追加＝初心者版(今日から占い師)と本格版(経験者版)の違い(言葉のやさしさ・対象)を2枚のカードで提示し、計算エンジン・鑑定書・教科書・相性・詳細鑑定は“どちらも同じ本格仕様”と明示。お客様が自分で選べる導線。表示のみ・エンジン非改変。 / v10=【PRO並み化・フェーズC】AI鑑定をサーバー中継に＝APIキーをブラウザに出さない本番構成。PROの functions/gemini.js・netlify.toml・package.json を移植し、アプリのgenerateReading()を /.netlify/functions/gemini 呼び出しに切替（キー無しでもオンライン鑑定が動く／テスト用にキーを入れたら直接も可／オフライン・エラー時は端末内鑑定に自動フォールバック）。鑑定書(meishi-sheet)の詳細鑑定も同関数を使用。※要・Netlify環境変数 GEMINI_API_KEY。表示/配信のみ・計算エンジン非改変。 / v9=教科書21ページの専門用語をやさしく＝初心者が知らない裸の用語（日主/用神/喜神/忌神/官殺/比劫/食傷/生剋/蔵干/空亡/天戦地冲/墓庫開冲/会局/納音 等）に、初出だけ読み仮名＋一言の言い換えを追加。表・数値・干支/星名・内容は一切無改変（全21ページでtd/th/script数がpro原本と一致を検証）。表示のみ・エンジン非改変。 / v8=【PRO並み化・フェーズB】教科書の用語解説ページ21本をビギナーに搭載（十干/通変星/十二運/蔵干/空亡/立運/大運と転換期/大運年運の星/節木運/会局/干支相性/相性の見どころ/納音相性/魁罡/異常干支/孤独の星/日座中殺/日座天中殺/天戦地冲/墓庫開冲/淫欲殺）。教科書ハブ(textbook.html)に「用語をもっとやさしく」の導線を追加。各ページの戻り先をtextbook.htmlに付替え。※元ページは読み仮名＋平易な説明つき。表示のみ・エンジン非改変。 / v7=【PRO並み化・フェーズA】A4の本格鑑定書 meishi-sheet.html をビギナーにも搭載（PROからエンジンごと移植＝結果完全一致）。鑑定書の文章は「やさしい版」が既定。出力内容(表紙/命式表/鑑定書・版・章)・印刷/PDF・LINE共有つき。アプリに「📄本格鑑定書をひらく」ボタンを追加し、今の入力を引き継いで開く。金はグレー。表示のみ・エンジン非改変。 / v6=PRO版と足並みをそろえる改善：(1)五行「金」の色を #8A93A6→#5F6B77（PROと同じ寒色グレー）に統一し、土(金色)とよりハッキリ区別。金を背景に敷く箇所は文字を白字に（EL_ON・庚カード・干合バッジ）。(2)お名前のすぐ上に「📂 保存した人を呼び出す」ドロップダウンを追加（0人でも常時表示）。表示のみ・エンジン非改変。 / v5=Phase2a②：共有(LINE・メール)テキストの可読性を改善＝色/太字が使えないプレーン文でも「見出しに絵文字＋空行」「良い点✅／注意⚠️」「長文は一文ごとに改行」で整形（formatForShare移植）。文字の壁を解消。共有時のみ・画面表示と印刷は不変・エンジン非改変。 / v4=Phase2a①：鑑定結果の先頭に「🔔まもなく運の節目です」アラートを追加＝次の大運の切替／次の節木運が2年以内なら予告（PROのtimingAlert移植）。専門用語を避け「運の大きな流れが変わる」「人生の大きな転換点」等のやさしい言葉に。節木運と大運が同時なら一本化。表示のみ・エンジン非改変。 / v3=Phase2a：鑑定結果に「✴️人と違う道でこそ輝くサイン（宿命中殺）」カードを追加。PROの検出(detectChusatsu)を移植しPROと完全一致、表示はやさしい言葉＋読み付き・前向きな枠組み。既存セクションと重複しない部分のみ追加。表示のみ・エンジン非改変。 / v2=計算エンジン(内蔵window.Bazi)をPRO版と完全一致に同期。地方時・均時差の補正をUTC基準にしタイムゾーン依存を解消（旧版はローカル時刻依存だった）。命式・大運・立運・五行はPRO版と完全一致を検証済み。表示は据え置き。 */

/* 初回訪問時に先読みしてキャッシュするページ一式（このブランドのみ） */
const ASSETS = [
  'app-beginner.html', 'meishi-sheet.html', 'index.html', 'textbook.html',
  'jikkan.html', 'tsuhensei.html', 'juniun.html', 'zohkan.html', 'kubo.html',
  'ritsuun.html', 'daiun-tenkanki.html', 'daiun-tsuhen.html', 'setsuboku.html', 'kaikyoku.html',
  'kanshi-aisho.html', 'aisho-pattern.html', 'nayin-aisho.html', 'kaigou.html', 'ijokanshi.html',
  'kodoku.html', 'nichiza.html', 'nichiza-tenchusatsu.html', 'tensen-chichu.html', 'boko-kaichu.html', 'inyoku.html',
  'pricing.html', 'mypage.html',
  'terms.html', 'tokushoho.html', 'privacy.html',
  'manifest-beginner.webmanifest', 'icon-beginner.svg'
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
        return cached || network.then((res) => res || cache.match('app-beginner.html'));
      })
    )
  );
});
