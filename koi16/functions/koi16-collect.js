// Netlify Function：恋のかたち診断（koi16）の答えを、名前なしで集める受け口。
// 目的＝質問がぶれずに測れているか・16タイプがかたよらないかを、集まった答えで確かめる（論文と同じ確かめ方）。
//
// 保存するもの（これだけ）：質問の版・本格版/かんたん版・今の恋の状況・40問の答え（-2〜2 か null）・
//   年代と性別（任意。答えなくてよい）・出たタイプ・日付（日まで。時刻は残さない）。
// 保存しないもの：名前・メール・IPアドレス・端末の情報・時刻。連打よけにIPを使うが、日ごとに変わる合言葉で
//   ハッシュにして「回数」だけを数え、答えとは結びつけない。
// 18歳未満（年代が「〜17歳」）の答えは受け取らない（保護者の同意を確かめられないため）。
//
// ※要設定（Netlify → Site settings → Environment variables）
//   必須 KOI16_SALT        … 連打よけのハッシュに混ぜる合言葉（長いランダムな文字列）。
//   任意 KOI16_MAX_IP_DAY  … 同じIPから1日に受け取る件数の上限（既定 20）。
//   任意 ALLOWED_ORIGINS   … 自サイト以外に許可する送信元（カンマ区切り・完全一致）。
//   自動 URL / DEPLOY_PRIME_URL … Netlify が入れる自サイトのURL（送信元の確認に使う）。
//   Blobs は Netlify の通常デプロイで自動有効（@netlify/blobs）。

const crypto = require('crypto');

const QV = 'q2';                                   // 質問の版（2026-11-12 本格版の40問）。質問を変えたら上げる
const N = 40;
const QUICK = [0,1,2,3,5,6,7,8,10,11,12,13,15,16,17,18];
const STATUS = ['partner', 'crush', 'none'];
const AGES = ['', '18-24', '25-29', '30-34', '35-39', '40-49', '50-59', '60-'];
const GENDERS = ['', 'female', 'male', 'other'];
const CODE = /^[LR][VA][TS][PC]$/;

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
function originOf(u) { try { return new URL(u).origin; } catch (e) { return ''; } }

// 中身を1つずつ確かめる。少しでもおかしければ受け取らない。
function validate(b) {
  if (!b || typeof b !== 'object') return 'body';
  if (b.v !== QV) return 'version';
  if (b.mode !== 'full' && b.mode !== 'quick') return 'mode';
  if (!STATUS.includes(b.status)) return 'status';
  if (!AGES.includes(b.age || '')) return 'age';
  if (!GENDERS.includes(b.gender || '')) return 'gender';
  if (!CODE.test(b.code || '')) return 'code';
  if (!Array.isArray(b.ans) || b.ans.length !== N) return 'ans';
  for (let i = 0; i < N; i++) {
    const v = b.ans[i];
    const need = b.mode === 'full' || QUICK.includes(i);
    if (need) { if (![-2, -1, 0, 1, 2].includes(v)) return 'ans' + i; }
    else if (v !== null) return 'ans' + i;
  }
  return '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false });
  // 自サイトからの送信だけ受け取る
  const site = process.env.URL || '';
  if (site) {
    const allowed = [site, process.env.DEPLOY_PRIME_URL || '', ...(process.env.ALLOWED_ORIGINS || '').split(',')].map((x) => originOf(String(x).trim())).filter(Boolean);
    const h = event.headers || {};
    const o = originOf(h.origin || h.Origin || h.referer || h.Referer || '');
    if (!o || !allowed.includes(o)) return json(403, { ok: false });
  }
  if ((event.body || '').length > 4000) return json(413, { ok: false });
  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { ok: false }); }
  const bad = validate(b);
  if (bad) return json(400, { ok: false, error: bad });

  const store = globalThis.__koi16TestStore || await getStore();
  if (!store) return json(503, { ok: false });

  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 日本時間の日付
  // 連打よけ：IPは日ごとの合言葉でハッシュにして回数だけ数える（答えとは結びつけない）
  const ip = ((event.headers || {})['x-nf-client-connection-ip'] || (event.headers || {})['x-forwarded-for'] || '').split(',')[0].trim();
  const salt = process.env.KOI16_SALT || '';
  if (ip && salt) {
    const hk = 'rl/' + day + '/' + crypto.createHash('sha256').update(salt + '|' + day + '|' + ip).digest('hex').slice(0, 32);
    const n = Number(await store.get(hk)) || 0;
    if (n >= (Number(process.env.KOI16_MAX_IP_DAY) || 20)) return json(429, { ok: false });
    await store.set(hk, String(n + 1));
  }

  const rec = { v: b.v, mode: b.mode, status: b.status, age: b.age || '', gender: b.gender || '', code: b.code, ans: b.ans, day };
  const key = 'r/' + day + '/' + crypto.randomBytes(12).toString('hex');
  await store.setJSON(key, rec);
  return json(200, { ok: true });
};

async function getStore() { try { const { getStore } = require('@netlify/blobs'); return getStore('koi16-answers'); } catch (e) { return null; } }
exports._validate = validate;   // 点検用
