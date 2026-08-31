// Netlify Function：テレコムクレジット（Web/PWA課金）のエンタイトルメント確認。
//
// 【役割】Web/PWAで決済リンクから戻ってきたクライアントが {device, plan, cycle} を送ってくる。
//   このサーバーが「その device の課金が本当に有効か」を確認し、
//   有効なときだけ Netlify Blobs に ent:<device> = {plan, exp} を書く（IAPの verify-purchase と同じ土俵）。
//   gemini.js はこの ent を読んでプランを決める＝クライアント申告だけでは有効化しない（タダ乗り防止）。
//
// 【重要 / 実装方針】決済の“真実”はブラウザの戻りではなく、テレコムクレジットからの
//   サーバー間通知（結果通知 / webhook）で確定させること。おすすめの2本立て：
//     (A) テレコムの結果通知を受ける別Function（例 functions/telecom-webhook.js）を用意し、
//         受信した「取引ID・会員ID・プラン・課金状態・次回課金日」を検証のうえ
//         ent:<device>（または ent:<memberId>）に {plan, exp} を書き込む。
//         ※ device と会員/注文の紐付けは、決済リンクに渡した pk_device を
//           テレコム側の任意パラメータ（送り返される項目）に載せて突き合わせる。
//     (B) この verify-telecom は「確定済みの ent を読み返して返すだけ」にする（下の実装）。
//         → 二重処理や改ざんの余地がなく、安全。
//
// 【設定（エンジニア）】
//   ・テレコムの管理画面で結果通知URL（webhook）を (A) のFunctionに向ける
//   ・継続課金の「次回課金日/契約状態」を webhook で受け取り exp を更新（解約・失敗で失効）
//   ・PK_TELECOM_ENABLED=1 を設定するとこのFunctionが応答する（未設定時は 200 {ok:false} を返し、
//     クライアントは何も有効化しない＝誤付与ゼロ）
//
// ※ここでは (B) の「entを読み返す」安全実装のみを置く。webhook本体は環境に合わせて別途実装のこと。

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  // 未設定の間は必ず ok:false（本物の webhook が ent を書くまで、誰にもプランを付与しない）
  if (String(process.env.PK_TELECOM_ENABLED || '') !== '1') {
    return json(200, { ok: false, reason: 'TELECOM_NOT_ENABLED' });
  }

  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'BAD_JSON' }); }
  const device = clean(b.device);
  if (!device) return json(400, { error: 'NO_DEVICE' });

  try {
    const store = await getStore();
    if (!store) return json(200, { ok: false, reason: 'NO_STORE' });

    // webhook が確定させた ent を読み返すだけ（このFunctionは書かない＝改ざん不能）
    const ent = await store.get(`ent:${device}`, { type: 'json' }).catch(() => null);
    if (ent && ent.plan && ent.exp && ent.exp > Date.now()) {
      return json(200, { ok: true, plan: ent.plan, exp: ent.exp });
    }
    return json(200, { ok: false, reason: 'NO_ACTIVE_ENTITLEMENT' });
  } catch (e) {
    try { console.error('[pk] verify-telecom failed:', (e && e.message) || e); } catch (e2) {}
    return json(502, { error: 'VERIFY_FAILED' });
  }
};

// ---- utils ----
function getStore() { try { const { getStore } = require('@netlify/blobs'); return Promise.resolve(getStore('pk-usage')); } catch (e) { return Promise.resolve(null); } }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }
