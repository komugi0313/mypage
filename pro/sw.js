/* 四柱推命占い自動鑑定 — オフライン対応 Service Worker（経験者版ドメイン専用）
   このドメインのページ一式を端末にキャッシュし、電波がなくても
   鑑定・60干支の教科書を使えるようにする。
   オンライン鑑定（生成AI）だけは通信が要るが、圏外時は端末内の
   オフライン鑑定に自動で切り替わる。 */
const CACHE = 'shichu-jidou-v376';/* v376=(1)画面結果に「時期アラート」を追加＝次の大運切り替え／次の節木運が2年以内なら上部にピンク字で「まもなく大運切り替えです／まもなく節木運を迎えます（あと約N年）」を表示（節木運＝大運境界が同一なら一本化）。(2)「この命式の詳しい特徴」に通変星セクション(年柱・月柱・時柱の天干＝場面ごとの持ち味／教科書TS_FULLの性格＋適職)を追加。表示のみ・エンジン非改変。命式表レイアウトは不変。 / v375=安全策：v374で入れた命式表のスマホ縦組み切替＆本文フォント拡大は、レイアウトが崩れる恐れを避けるため撤回し、従来の安定レイアウト(常にA4)に戻した。月の目安ラベル「ひと呼吸」→「セーブ月」の言葉の変更のみ残す（レイアウト不変）。表示のみ・エンジン非改変・originalへミラー。 / v374=(撤回)命式表スマホ縦組み＆フォント拡大を試したが崩れ回避のため差し戻し。 / v373=共有(LINE・メール)テキストの可読性を改善＝色/太字が使えないプレーン文でも「見出しに絵文字＋空行」「良い点✅／注意⚠️」「長文は一文ごとに改行」で整形（formatForShare）。相性・鑑定文の“文字の壁”を解消。共有時のみ・画面表示と印刷は不変・エンジン非改変。 / v372=相性の納音文の重複を解消＝見出し「2人の日柱が同じ〇〇＝納音の相性です」の直後に定型文がまた「2人の日柱が同じ納音（納音の相性）。」と繰り返していたのを、定型文の冒頭一文を削除して一文につなげた。表示のみ・エンジン非改変。 / v371=相性導線の紫枠3か所の文言を「この人／この方」から番号（①本人・②お相手）ベースに変更＝違和感を解消。表示のみ・エンジン非改変・印刷内容は不変。 / v370=ダークモード端末で命式表・鑑定書(meishi-sheet)の背景が黒くなり本文が読めなくなる不具合を修正＝ダーク時のステージ暗色化を撤去し「明色専用(color-scheme:light)」を宣言。app-proにも同宣言を追加。表示のみ・エンジン非改変・meishi-sheetはoriginalへミラー。 / v369=古い/非対応端末で計算エンジンが立ち上がらない（白画面・動かない）ときだけ、app-proに全画面の案内「このページを表示できませんでした／最新のChrome・Safariでお試しください」を出す見張り役を追加。ES5のみ・正常端末では何も出さない・エンジン非改変。 / v368=LP:副文を「その場で作成・送信」に戻し「作成」が行またぎで切れないようnowrap／無料文の2行整形を維持。表示のみ。 / v367=LP微修正：ヒーロー副文を「鑑定書はその場で送信」に／無料の一文で「まずは」が行頭で泣き別れしないようnowrap調整。表示のみ。 / v366=天地徳合の位置別解説に「月柱×時柱」「年柱×時柱」を追加＝全6組合せ網羅。表示層のみ。 / v365=要点の「際立つ特徴」チップをタップで解説（天地徳合の意味＋なぜその二柱かの位置別説明、魁罡・会局・異常干支・宿命中殺・冲支合干合も）。表示層のみ。 / v364=要点(この人の核)に「この命式の際立つ特徴」を追加＝天地徳合・会局・魁罡・宿命中殺・異常干支をひと目で表示。表示層のみ。 / v363=客に送る画像共有カード(「この鑑定を画像で送る」)を廃止＝技術情報・異常干支を客に出さない。命式の特徴は従来どおり鑑定者向け(画面／印刷鑑定書のメモ域)にのみ表示。天地徳合を正しくまとめて表示(支合＋干合を分けず「天地徳合」)。meishi-sheet も同修正＋original へミラー。表示層のみ。 / v362=LP軽量化＆デモ動画差し替え：demo.webm/demo-poster.pngを最新版に更新。動画は自動再生・先読みをやめ「ポスター＋タップで再生(preload=none)」に。会員(member_email保持)はLPを開かず即app-proへ遷移。動画類はSWプリキャッシュ対象外のまま。 / v361=相性結果の可読性改善。 / v360=サイト上のオフライン案内(緑の「オンライン鑑定も可能」)を撤去。 / v359=オフライン案内の文言を「オンライン鑑定・鑑定書作成も可能です」に更新。 / v358=オフライン鑑定の下に「オンライン鑑定も可能です」の案内(緑)を追加＝本命のオンライン鑑定を明示。 / v357=自由質問ボックスから🔒の注意書きと✍️絵文字を削除（赤枠＋見出し＋説明1行は維持）。 / v356=自由質問ボックスの「人気」バッジを削除（赤枠強調は維持）。 / v355=自由質問ボックス（詳細鑑定・相性の「自由に質問を入力」）を赤枠で強調＝サイトの主役を埋もれさせない。表示のみ・エンジン非改変。 / v354=入口を必ずLP（index.html）からに。(1)index.htmlの「一度ツールに入った端末はLPを飛ばしてapp-proへ自動遷移」処理を撤去。(2)manifestのstart_urlをapp-pro.html→index.htmlに。(3)SWのオフラインfallbackもapp-pro.html→index.htmlに。表示・導線のみ・エンジン非改変。*/

/* 初回訪問時に先読みしてキャッシュするページ一式（このブランドのみ） */
const ASSETS = [
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-maskable-512.png', 'icon-crystal.png', 'ogp.png',
  'app-pro.html', 'meishi-sheet.html', 'index.html', 'textbook-pro.html',
  'pricing-pro.html', 'mypage-pro.html', 'auth.html',
  'terms-pro.html', 'tokushoho-pro.html', 'privacy-pro.html',
  'manifest-pro.webmanifest', 'icon-pro.svg',
  'pklove.js',
  'jikkan.html', 'tsuhensei.html', 'juniun.html', 'zohkan.html', 'kubo.html',
  'daiun-tenkanki.html', 'ritsuun.html', 'nichiza-tenchusatsu.html', 'ijokanshi.html',
  'kanshi-aisho.html', 'aisho-pattern.html', 'daiun-tsuhen.html', 'setsuboku.html', 'tensen-chichu.html', 'nayin-aisho.html', 'boko-kaichu.html', 'kaikyoku.html', 'inyoku.html', 'nichiza.html', 'kodoku.html', 'kaigou.html'
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
        return cached || network.then((res) => res || cache.match('index.html'));
      })
    )
  );
});
