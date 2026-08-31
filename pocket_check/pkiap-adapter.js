/* ============================================================================
 * pkiap-adapter.js  —  window.PKIAP の実装テンプレート（アプリ内課金の橋渡し）
 *
 * index.html のフロントは window.PKIAP.available()/purchase()/restore() を呼ぶだけ。
 * ここでネイティブのIAPプラグインを束ねて window.PKIAP を定義する。
 * Capacitorビルドで、IAPプラグインの後・index.html の後に読み込む：
 *     <script src="cordova-plugin-purchase.js 等"></script>
 *     <script src="index.html内のJS"></script>   ← 既存
 *     <script src="pkiap-adapter.js"></script>    ← これ
 *
 * ★2つの実装を用意。使う方だけ USE を切り替える。
 *   'cdv'  … cordova-plugin-purchase（レシートを自前サーバー /api/verify-purchase で検証）← 既存のverify-purchase.jsがそのまま活きる（推奨）
 *   'rc'   … RevenueCat（RevenueCatが検証を代行。サーバーは別途 RevenueCat連携が必要／下部の注記参照）
 * プラグインが無い環境（PWA/Web）では自動的に available()=false になり、UIは「アプリ版で」と案内する。
 * ==========================================================================*/
(function () {
  var USE = 'cdv';   // ← 'cdv' か 'rc' に切り替え

  // 商品ID（index.html / サーバーの PK_PRODUCTS と完全一致させること）
  var PRODUCT_IDS = [
    'pk_standard_monthly', 'pk_standard_yearly',
    'pk_pro_monthly', 'pk_pro_yearly',
    'pk_vip_monthly', 'pk_vip_yearly'
  ];

  // ---------------------------------------------------------------------------
  // 実装A：cordova-plugin-purchase（グローバル CdvPurchase）。レシート/トークンを取り出して自前検証。
  // ※プラグインのバージョンでレシートの取り出し方が変わるため、★印の箇所は実機で要確認。
  // ---------------------------------------------------------------------------
  function initCdv() {
    if (typeof CdvPurchase === 'undefined') return null;
    var store = CdvPurchase.store, P = CdvPurchase.Platform, T = CdvPurchase.ProductType;
    var appleP = P.APPLE_APPSTORE, googleP = P.GOOGLE_PLAY;
    var plat = (CdvPurchase.Utils && CdvPurchase.Utils.platformName) ? null : null;

    // 商品登録（両プラットフォームぶん登録し、実行時に該当するものだけ有効になる）
    var regs = [];
    PRODUCT_IDS.forEach(function (id) {
      regs.push({ id: id, type: T.PAID_SUBSCRIPTION, platform: appleP });
      regs.push({ id: id, type: T.PAID_SUBSCRIPTION, platform: googleP });
    });
    try { store.register(regs); } catch (e) {}
    // 自前検証は使わず（validatorは未設定）、承認時にレシートを取り出して /api/verify-purchase に送る
    try { store.initialize([appleP, googleP]); } catch (e) {}

    function currentPlatform() {
      // iOSかAndroidか（Capacitor があれば getPlatform、無ければ UA から推定）
      try { if (window.Capacitor && Capacitor.getPlatform) { var p = Capacitor.getPlatform(); if (p === 'ios') return 'ios'; if (p === 'android') return 'android'; } } catch (e) {}
      return /android/i.test(navigator.userAgent) ? 'android' : 'ios';
    }
    // ★iOSのApp Storeレシート(base64)を取り出す（バージョン差あり。localReceipts から探す）
    function appleReceipt() {
      try {
        var rs = store.localReceipts || [];
        for (var i = 0; i < rs.length; i++) {
          var r = rs[i];
          var nd = r && r.nativeData;
          if (nd && (nd.appStoreReceipt || nd.appStoreReceiptURL)) return nd.appStoreReceipt || '';
        }
      } catch (e) {}
      return '';
    }
    // ★Androidの purchaseToken を transaction から取り出す
    function androidToken(tx) {
      try { return (tx && (tx.purchaseToken || (tx.nativePurchase && tx.nativePurchase.purchaseToken))) || ''; } catch (e) { return ''; }
    }
    function pack(productId, tx) {
      var platform = currentPlatform();
      return {
        platform: platform, productId: productId,
        receipt: platform === 'ios' ? appleReceipt() : undefined,
        token: platform === 'android' ? androidToken(tx) : undefined
      };
    }

    return {
      available: function () { return true; },
      // 各商品のストア現地価格（¥3,000 / ₩29,000 等の表示文字列）を {productId: priceString} で返す。
      // index.html がプラン画面でこれを使い、実際に課金される正しい価格を表示する（審査対策）。
      prices: function () {
        var out = {};
        try {
          PRODUCT_IDS.forEach(function (id) {
            var p = null; try { p = store.get(id); } catch (e) {}
            if (!p) return;
            var s = '';
            try { var off = p.getOffer && p.getOffer(); if (off && off.pricingPhases && off.pricingPhases.length) s = off.pricingPhases[0].price || ''; } catch (e) {}
            if (!s) { try { s = (p.pricing && p.pricing.price) || ''; } catch (e) {} }
            if (s) out[id] = s;
          });
        } catch (e) {}
        return out;
      },
      purchase: function (productId) {
        return new Promise(function (resolve, reject) {
          var done = false;
          var offApproved = store.when().approved(function (tx) {
            // 対象商品のtxか確認
            var owns = tx.products && tx.products.some(function (p) { return p.id === productId; });
            if (!owns) return;
            var data = pack(productId, tx);
            try { tx.finish(); } catch (e) {}
            if (!done) { done = true; resolve(data); }
          });
          var prod = null;
          try { prod = store.get(productId); } catch (e) {}
          if (!prod) { reject(new Error('product not found: ' + productId)); return; }
          var offer = prod.getOffer && prod.getOffer();
          if (!offer) { reject(new Error('offer not found')); return; }
          offer.order().then(function (err) { if (err && !done) { done = true; reject(err); } }, reject);
          setTimeout(function () { if (!done) { done = true; reject(new Error('purchase timeout')); } }, 120000);
        });
      },
      restore: function () {
        return new Promise(function (resolve) {
          var found = [];
          store.when().approved(function (tx) {
            (tx.products || []).forEach(function (p) { found.push(pack(p.id, tx)); });
            try { tx.finish(); } catch (e) {}
          });
          Promise.resolve(store.restorePurchases && store.restorePurchases()).then(function () {
            setTimeout(function () { resolve(found); }, 2500); // 復元は非同期で集まるので少し待つ
          }, function () { resolve(found); });
        });
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 実装B：RevenueCat（@revenuecat/purchases-capacitor）。
  // ※RevenueCatはレシート検証とエンタイトルメント管理を代行する＝生レシートは基本渡さない。
  //   そのため verify-purchase.js（自前検証）はそのままでは使えない。次のどちらかでサーバーに反映する：
  //   (1) RevenueCat Webhook → 自前サーバー → ent:<device> を更新（推奨・即時反映）
  //   (2) 購入/復元後、RevenueCat REST API（GET /subscribers/{app_user_id}）を叩く小さな関数を作り ent を更新
  //   いずれも appUserID を Pocketの device（x-pk-device）に一致させること：
  //       Purchases.logIn({ appUserID: window.__pkDeviceId })  など
  //   下のadapterは「購入UIを動かす」ところまで。サーバー反映は上記(1)/(2)を実装のこと。
  // ---------------------------------------------------------------------------
  function initRC() {
    var RC = (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Purchases) || (window.Purchases);
    if (!RC) return null;
    // オファリングを一度取得して現地価格をキャッシュ（prices() は同期で返せるように）
    var _rcPrices = {};
    try { RC.getOfferings().then(function (o) { var all = (o && o.all) || {}; for (var k in all) { (all[k].availablePackages || []).forEach(function (pk) { if (pk.product && pk.product.identifier) _rcPrices[pk.product.identifier] = pk.product.priceString || ''; }); } }).catch(function () {}); } catch (e) {}
    function pkgFor(productId, offerings) {
      try {
        var all = offerings.all || {};
        for (var k in all) { var pk = (all[k].availablePackages || []); for (var i = 0; i < pk.length; i++) { if (pk[i].product && pk[i].product.identifier === productId) return pk[i]; } }
      } catch (e) {} return null;
    }
    return {
      available: function () { return true; },
      prices: function () { return Object.assign({}, _rcPrices); },
      purchase: function (productId) {
        return RC.getOfferings().then(function (o) {
          var pkg = pkgFor(productId, o); if (!pkg) throw new Error('package not found: ' + productId);
          return RC.purchasePackage({ aPackage: pkg });
        }).then(function (res) {
          // res.customerInfo.entitlements.active にエンタイトルメントが入る。
          // ★サーバー反映（上記(1)/(2)）を呼び、成功したら下記形で返す（productIdだけでも可）。
          return { platform: (window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios') ? 'ios' : 'android', productId: productId, rc: true };
        });
      },
      restore: function () {
        return RC.restorePurchases().then(function (res) {
          // active な entitlement から productId を復元して返す。ここでは空配列＝サーバー反映側で判定する構成を推奨。
          return [];
        });
      }
    };
  }

  var impl = (USE === 'rc') ? initRC() : initCdv();
  if (impl) { window.PKIAP = impl; }
  // impl が null（プラグイン未検出＝Web/PWA）の時は window.PKIAP を定義しない → available()===false 扱いでUIが「アプリ版で」と案内。
})();
