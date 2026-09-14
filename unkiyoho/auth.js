/* =============================================================================
 * 私だけの運気予報 ── 認証クライアント (auth.js)
 * -----------------------------------------------------------------------------
 * パスワードレス（メール確認コード / OTP）方式のログインをフロント側で扱う共通部品。
 * register.html / login.html / mypage.html から読み込んで使う。
 *
 * ■ 2つの動作モード
 *   1) 本番モード : window.UNKIYOHO_AUTH_API_BASE にサーバーAPIのURLを設定すると、
 *                   下記エンドポイントを呼び出す（本人確認・セッションはサーバーが担当）。
 *   2) 開発モード : 上記が未設定（空）なら、ブラウザ内だけで完結するデモとして動く。
 *                   確認コードを画面に表示し、localStorage で本人確認を模擬する。
 *                   ※ メールは送信されない。動作確認・引き継ぎ用。
 *
 * ■ 本番でエンジニアが実装するAPI（詳細は docs/認証設計_引き継ぎ.md）
 *   POST {API_BASE}/auth/request-code   { email, purpose, identify? } → コードをメール送信
 *       ・identify={nick,birth} は change-email（アドレス修正）時の本人確認用
 *   POST {API_BASE}/auth/verify-code    { email, code, remember } → 検証しセッション発行(Cookie)
 *   POST {API_BASE}/auth/logout         { }                       → セッション破棄
 *   GET  {API_BASE}/auth/session        (Cookie)                  → 現在のログイン状態
 *
 * ■ セキュリティ上の重要事項（エンジニア向け）
 *   - ここで持つ localStorage のセッションは「画面の出し分け(UX)」専用。
 *     本当の保護はサーバー側で行うこと。マイページの会員データを返すAPIは、
 *     必ず HttpOnly Cookie のセッションを検証してから返す（クライアント判定を信用しない）。
 * ========================================================================== */
(function (global) {
  'use strict';

  var CONFIG = {
    apiBase: (global.UNKIYOHO_AUTH_API_BASE || '').replace(/\/+$/, ''),
    codeLength: 6,
    codeTTLms: 10 * 60 * 1000,      // 確認コードの有効期限：10分
    maxAttempts: 5,                 // コード誤入力の上限
    resendCooldownMs: 60 * 1000,    // 再送クールダウン：60秒
    // 「ログイン状態を保持する」にチェック → ずっとログイン（有効期限なし＝ログアウトするまで）。
    // チェックなし → tempTTLms 後に自動ログアウト（共用端末向け）。
    tempTTLms: 12 * 60 * 60 * 1000, // 保持しない場合のセッション寿命：12時間
    rememberDays: 365,              // 本番Cookieの目安（Max-Age）。毎回の利用で更新推奨
    sessionKey: 'unkiyoho_session',
    pendingKey: 'unkiyoho_otp_pending',
    lastEmailKey: 'unkiyoho_last_email', // 前回入力したメール（ログイン画面で自動表示）
    selfKey: 'enbiyori_self_birth'  // 既存：本人プロフィール（生年月日・ニックネーム・メール等）
  };
  var DEV = !CONFIG.apiBase;

  function now() { return Date.now(); }
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function remove(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function normEmail(e) { return (e || '').trim().toLowerCase(); }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function genCode() {
    var n = '';
    // なるべく偏りのない乱数（対応環境では crypto を使用）
    var buf = (global.crypto && global.crypto.getRandomValues) ? global.crypto.getRandomValues(new Uint32Array(CONFIG.codeLength)) : null;
    for (var i = 0; i < CONFIG.codeLength; i++) {
      n += String((buf ? buf[i] : Math.floor(Math.random() * 1e9)) % 10);
    }
    return n;
  }

  /* ---- 本番モード：サーバーAPI呼び出し ---- */
  function api(path, body) {
    return fetch(CONFIG.apiBase + path, {
      method: 'POST',
      credentials: 'include', // HttpOnly Cookie をやり取り
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          var err = new Error(data.message || 'サーバーエラーが発生しました。');
          err.code = data.code; err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---- 確認コードを送る ----
   * 戻り値: { devCode, cooldownMs }（devCode は開発モードのみ。本番は null） */
  function requestCode(opts) {
    opts = opts || {};
    var email = normEmail(opts.email);
    var purpose = opts.purpose || 'login'; // 'login' | 'register' | 'change-email'
    if (!validEmail(email)) return Promise.reject(new Error('メールアドレスの形式が正しくありません。'));
    try { localStorage.setItem(CONFIG.lastEmailKey, email); } catch (e) {} // 次回ログインで自動表示

    if (!DEV) {
      var payload = { email: email, purpose: purpose };
      // change-email（アドレス修正）の本人確認情報を渡す：{ nick, birth }。サーバーで照合する。
      if (opts.identify) payload.identify = opts.identify;
      return api('/auth/request-code', payload)
        .then(function () { return { devCode: null, cooldownMs: CONFIG.resendCooldownMs }; });
    }

    // 開発モード：クールダウン中は同じコードを再利用
    var pend = readJSON(CONFIG.pendingKey);
    if (pend && pend.email === email && (now() - pend.sentAt) < CONFIG.resendCooldownMs) {
      return Promise.resolve({ devCode: pend.code, cooldownMs: CONFIG.resendCooldownMs - (now() - pend.sentAt), reused: true });
    }
    var code = genCode();
    writeJSON(CONFIG.pendingKey, {
      email: email, code: code, purpose: purpose,
      sentAt: now(), expiresAt: now() + CONFIG.codeTTLms, attempts: 0
    });
    // 開発モードでは「コンソールにも」出す（実機テストの補助）
    try { console.info('[運気予報:開発モード] ' + email + ' 宛の確認コード = ' + code); } catch (e) {}
    return Promise.resolve({ devCode: code, cooldownMs: CONFIG.resendCooldownMs });
  }

  /* ---- 確認コードを検証してログイン ----
   * 戻り値: セッション { email, nick, loginAt, ... } */
  function verifyCode(opts) {
    opts = opts || {};
    var email = normEmail(opts.email);
    var code = String(opts.code || '').replace(/\s/g, '');
    var remember = !!opts.remember;

    if (!DEV) {
      return api('/auth/verify-code', { email: email, code: code, remember: remember })
        .then(function (data) {
          // サーバーが HttpOnly Cookie を発行。画面の出し分け用に軽量セッションも保持
          // remember=true はログアウトするまで（有効期限なし）、false は tempTTLms 後に失効。
          var sess = { email: email, nick: (data && data.nick) || null, loginAt: now(), remember: remember, server: true,
            expiresAt: remember ? null : now() + CONFIG.tempTTLms };
          writeJSON(CONFIG.sessionKey, sess);
          return sess;
        });
    }

    var pend = readJSON(CONFIG.pendingKey);
    if (!pend || pend.email !== email) return Promise.reject(new Error('先に確認コードを送信してください。'));
    if (now() > pend.expiresAt) { remove(CONFIG.pendingKey); return Promise.reject(new Error('コードの有効期限が切れました。もう一度お送りください。')); }
    pend.attempts = (pend.attempts || 0) + 1;
    if (pend.attempts > CONFIG.maxAttempts) { remove(CONFIG.pendingKey); return Promise.reject(new Error('入力回数の上限を超えました。もう一度コードをお送りください。')); }
    writeJSON(CONFIG.pendingKey, pend);
    if (code !== pend.code) {
      var err = new Error('コードが違います。もう一度ご確認ください。');
      err.code = 'invalid_code'; err.remaining = CONFIG.maxAttempts - pend.attempts;
      return Promise.reject(err);
    }
    remove(CONFIG.pendingKey);
    var self = readJSON(CONFIG.selfKey) || {};
    var sess = {
      email: email, nick: self.nick || null, loginAt: now(),
      // remember=true → 有効期限なし（ログアウトするまでずっと）。false → 12時間で自動失効。
      remember: remember, expiresAt: remember ? null : now() + CONFIG.tempTTLms
    };
    writeJSON(CONFIG.sessionKey, sess);
    // 開発モード：本人プロフィールのメールも最新に合わせる（アドレス修正時の整合のため）
    if (self && self.email !== email) { self.email = email; writeJSON(CONFIG.selfKey, self); }
    return Promise.resolve(sess);
  }

  /* ---- 現在のセッション（なければ null） ---- */
  function session() {
    var sess = readJSON(CONFIG.sessionKey);
    if (!sess) return null;
    if (sess.expiresAt && now() > sess.expiresAt) { remove(CONFIG.sessionKey); return null; }
    return sess;
  }
  function isLoggedIn() { return !!session(); }

  /* ---- ログアウト ---- */
  function logout() {
    remove(CONFIG.sessionKey);
    if (!DEV) return api('/auth/logout', {}).catch(function () {});
    return Promise.resolve();
  }

  /* ---- ログイン必須ページの入口ガード（未ログインならログイン画面へ） ----
   * 施錠するのはこのガードを置いたページだけ（例：マイページ）。 */
  function requireLogin(nextPage) {
    if (isLoggedIn()) return true;
    var url = 'login.html' + (nextPage ? ('?next=' + encodeURIComponent(nextPage)) : '');
    location.replace(url);
    return false;
  }

  global.Auth = {
    DEV: DEV,
    config: CONFIG,
    requestCode: requestCode,
    verifyCode: verifyCode,
    session: session,
    isLoggedIn: isLoggedIn,
    logout: logout,
    requireLogin: requireLogin,
    normEmail: normEmail,
    validEmail: validEmail,
    lastEmail: function () { try { return localStorage.getItem(CONFIG.lastEmailKey) || ''; } catch (e) { return ''; } }
  };
})(window);
