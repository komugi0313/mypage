/*!
 * sw.js — にこカレ オフライン対応サービスワーカー
 * ------------------------------------------------------------------
 * 方針：
 *  - ページ本体(HTML)は「ネットワーク優先＋キャッシュ退避」。
 *    オンライン時は常に最新を取得（_headers の no-store の意図を尊重）、
 *    電波が無い時はキャッシュ済みの最新版を表示＝オフラインでも開ける。
 *  - フォント/CDN等の静的アセットは「キャッシュ優先」で二度目以降オフラインでも整う。
 *  - バージョンを上げると古いキャッシュを自動削除。
 */
'use strict';
var VERSION = 'nikocale-v2';
var SHELL = './';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.add(new Request(SHELL, { cache: 'reload' })).catch(function () {});
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== VERSION) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // ページ遷移（HTML）＝ネットワーク優先、失敗時はキャッシュのシェルへ
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(SHELL, copy); });
        return res;
      }).catch(function () {
        return caches.match(SHELL).then(function (r) { return r || caches.match(req); });
      })
    );
    return;
  }

  // その他（フォント/CDN/画像等）＝キャッシュ優先、無ければ取得してキャッシュ
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
    })
  );
});
