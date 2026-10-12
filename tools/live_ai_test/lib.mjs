import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
export async function launch() { return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
export async function ctxFor(browser, vp = { w: 375, h: 740, mobile: true }, opts = {}) {
  return browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, deviceScaleFactor: 1, ...opts });
}
export function watch(page, errs) {
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 250)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 250)));
}
// fill the personal form
export async function fillPerson(page, { name = 'テスト花子', sex = 'female', y, m, d, hh, mm, notime = false, pref = '' }) {
  await page.fill('#f-name', name);
  await page.click(`#f-sex button[data-v="${sex}"]`);
  await page.selectOption('#f-y', String(y));
  await page.selectOption('#f-m', String(m));
  await page.selectOption('#f-d', String(d));
  if (notime) { const c = await page.$('#f-notime'); if (!(await c.isChecked())) await c.check(); }
  else {
    const c = await page.$('#f-notime'); if (await c.isChecked()) await c.uncheck();
    await page.selectOption('#f-hh', { value: String(hh).padStart(2, '0') }).catch(async () => page.selectOption('#f-hh', String(hh)));
    await page.selectOption('#f-mm', { value: String(mm).padStart(2, '0') }).catch(async () => page.selectOption('#f-mm', String(mm)));
  }
  if (pref) await page.selectOption('#f-pref', { label: pref });
}
export const JARGON = ['命式', '大運', '年運', '月運', '日運', '通変星', '十干', '十二支', '干支', '五行', '日主', '蔵干', '空亡', '天中殺', '十二運', '比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '印綬', '身強', '身弱', '身旺', '用神', '喜神', '忌神', '日柱', '月柱', '年柱', '時柱', '四柱', '天干', '地支', '会局', '三合', '方合', '半合', '干合', '支合', '天戦地冲', '律音', '納音', '立運', '節木', '元命', '宿命中殺', '日座', '魁罡', '墓庫', '真太陽時', '早子時', '均時差', '陰陽', '扶抑', '神殺', '天乙', '駅馬', '咸池', '羊刃', '冲', '刑', '長生', '沐浴', '冠帯', '建禄', '帝旺', '順行', '逆行', '節入り', '養生', '中和', '旺'];
