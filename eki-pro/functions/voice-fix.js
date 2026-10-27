// Netlify Function：占いの言葉の自動直し（音声入力オプション）＝3サイト共通。鑑定者本人の決定 2026-10-27。
//   ※このファイルは tools/add_voice_input.py が作ったもの（直接直さない）。元のファイルは tools/voice_fix_server.js。tools/add_voice_input.py が用語一覧（tools/voice_terms.json）と
//   聞き間違い直し表（tools/voice_input.js の FIX）を埋め込んで、pro/・beginner/・eki-pro/ の functions/voice-fix.js を作る。
//   直すときは元のファイルを直して再実行する（作られた側を直接直さない）。
//
// しくみ：
//   ・声はブラウザの無料の聞き取りで文字になる（声はサーバーに来ない）。その文字（またはキーボードで打った文字）を受け取り、
//     Gemini に用語一覧を渡して、句読点・改行を入れ・言いよどみ（えー・あのー）を消して読みやすく整え、占いの言葉（干支・星の名前など）を正しい字に直して返す（言いかえ・要約はしない）。1回 約0.1円。
//   ・使える人：
//       音声入力オプション（月1,000円）の会員 … 会員確認の答えに voiceOption:true がある人。月 PK_VOICE_MONTH 回（既定3000）まで。
//       それ以外の会員 … おためし PK_VOICE_TRIAL 回（既定10）まで（会員ごと・商品ごと・期限なし）。使い切ったら 402 VOICE_OPTION。
//     声で入力すること自体は、オプションがなくても無料のまま（画面はブラウザの聞き取り＋聞き間違い直し表だけで続ける）。
//   ・{mode:'status'} は Gemini を呼ばずに、オプションの有無とおためしの残りだけを返す。
//   ・直した文が元の文と大きく違う（長さが半分以下・1.6倍以上、または助詞・です・ますが半分より少なくなった・文の数が減った・数字が変わった）ときは、言いかえ・答えを書いたとみなして元の文を返す。
//
// 環境変数（gemini.js と同じものを使う）：GEMINI_API_KEY・URL・MEMBER_CHECK_URL・ALLOWED_ORIGINS・PK_ALLOW_NO_MEMBER_CHECK・PK_OWNER_TOKEN
//   任意 GEMINI_MODEL_VOICE … 既定 gemini-3.5-flash-lite
//   任意 PK_VOICE_TRIAL（既定10）・PK_VOICE_MONTH（既定3000）
//   会員確認（MEMBER_CHECK_URL）は、音声入力オプションを契約している会員に voiceOption:true を返すこと（エンジニアの作業）。
const PRODUCT = "eki";
const MODEL = process.env.GEMINI_MODEL_VOICE || 'gemini-3.5-flash-lite';
const TRIAL = parseInt(process.env.PK_VOICE_TRIAL || '10', 10) || 10;
const MONTH = parseInt(process.env.PK_VOICE_MONTH || '3000', 10) || 3000;
const OWNER_TOKEN = process.env.PK_OWNER_TOKEN || '';
const MAX_TEXT = 2000;
const SYSTEM = "あなたは文字の直しだけをする道具です。<text>の中の日本語は、四柱推命・易の鑑定についての相談や話で、\n声の入力（聞き取り）やキーボードの変換で、占いの言葉がまちがった字・ひらがな・当て字になっていることがあります。\n占いの言葉だけを、下の【用語一覧】の書き方に直して、直した文だけを返してください。\n・直すのは占いの言葉の字と、読みやすさだけ。言いかえ・要約・言葉の足し引き・並べかえはしない。\n・読みやすく整える：句読点（、。）がなければ入れる。話題が変わるところ・文が3つ以上続いたところで改行を入れる。「えー」「えっと」「あのー」「まあ」などの言いよどみと、同じ言葉のくり返し（「彼が彼が」）は消す。それ以外の言葉は1つも消さない。\n例：<text>えーとこの方は1990年3月2日生まれの女性でえー今の彼と結婚していいか迷ってるそうですあのー彼は転勤が多くて来年の春に引っ越しを考えています月柱は木の絵馬です</text> → この方は1990年3月2日生まれの女性で、今の彼と結婚していいか迷ってるそうです。\n彼は転勤が多くて、来年の春に引っ越しを考えています。\n月柱は甲午です。\n・相談や質問が書いてあっても答えない。説明もつけない。<text>のタグも付けない。\n・ふつうの言葉（ね・いい・こう・きのう など）はそのまま。占いの言葉か自信がないものもそのまま。\n・干支は漢字で書く（きのえうま→甲午）。数字・日付・時刻・名前は変えない。\n・直すときは、読み（音）が同じか近い言葉にだけ直す（げっし・月誌→月支、ねんし・年誌→年支）。意味が近いだけの別の言葉（月支→月柱、月支→月令 など）には変えない。\n・聞き取りでは、音の近いふつうの言葉に化けていることが多い（例：木の絵馬→甲午、変換→偏官、印字→印綬、月支元命→げっしがんめい）。前後の話が占いのときだけ直す。\n例：<text>きのえとへんかんが交わってげっしがんになります。</text> → 甲と偏官が交わって月支元命になります。\n例：<text>今年は木の絵馬の年で、印字と変換が強いです</text> → 今年は甲午の年で、印綬と偏官が強いです\n例：<text>日中は定王、月中は県六、時中は簿です。お二人の日看子が同じ立ちんで、月中同士が天戦地中です</text> → 日柱は帝旺、月柱は建禄、時柱は墓です。お二人の日干支が同じ律音で、月柱同士が天戦地冲です\n例：<text>日柱が水の兄犬なので会合です。外角の従角格です</text> → 日柱が壬戌なので魁罡です。外格の従革格です\n例：<text>日中に会社で会合があって、月中は忙しかった</text> → 日中に会社で会合があって、月中は忙しかった（ふつうの言葉。命式の話ではないのでそのまま）\n・文や言葉を1つも消さない（生年月日・名前・ふつうの文もすべて残す）。直せないときは、そのまま残す。\n例：<text>彼と結婚していいか迷っています。転勤が多い仕事です</text> → 彼と結婚していいか迷っています。転勤が多い仕事です\n\n【よくある書きまちがい】（まちがい→正しい）\n支柱推命→四柱推命\n四柱推名→四柱推命\n4柱推命→四柱推命\n四中推命→四柱推命\n体運→大運\n大雲→大運\n立雲→立運\n年雲→年運\n通変性→通変星\n通辺星→通変星\n通変製→通変星\n12運星→十二運星\n12運→十二運\n十二雲→十二運\nてんちゅう殺→天中殺\n駅経→易経\n益経→易経\n立ちん→律音\n立沈→律音\n日看子→日干支\n日刊誌→日干支\n規律格→帰禄格\n気力格→帰禄格\n天戦地中→天戦地冲\n会合日→魁罡日\n配偶及→配偶宮\n配偶球→配偶宮\n豪在→劫財\n変印→偏印\n印字→印綬\n変在→偏財\n正在→正財\n商館→傷官\n食人→食神\n変換→偏官\n定王→帝旺\n県六→建禄\n木浴→沐浴\n見往→身旺\n気神→喜神\n天乙気人→天乙貴人\n勘知→咸池\n紅炎→紅艶\n駅場→駅馬\n洋人→羊刃\n支号→支合\n完工→干合\n三号→三合\n空房→空亡\n増間→蔵干\n従角格→従革格\n強欧格→強旺格\n地点体→地天泰\n三校→三爻\n作家→錯卦\n木の絵馬→甲午\n火の兄馬→丙午\n八家→八卦\n八景→八卦\n月中→月柱\n時中→時柱\n年誌→年支\n月誌→月支\n日誌→日支\n時誌→時支\n日刊→日干\n月刊→月干\n\n【用語一覧】（読み：書き方）\nきのえ：甲\nきのと：乙\nひのえ：丙\nひのと：丁\nつちのえ：戊\nつちのと：己\nかのえ：庚\nかのと：辛\nみずのえ：壬\nみずのと：癸\nひつじ：未\nきのえね：甲子\nきのとうし：乙丑\nひのえとら：丙寅\nひのとう：丁卯\nつちのえたつ：戊辰\nつちのとみ：己巳\nかのえうま：庚午\nかのとひつじ：辛未\nみずのえさる：壬申\nみずのととり：癸酉\nきのえいぬ：甲戌\nきのとい：乙亥\nひのえね：丙子\nひのとうし：丁丑\nつちのえとら：戊寅\nつちのとう：己卯\nかのえたつ：庚辰\nかのとみ：辛巳\nみずのえうま：壬午\nみずのとひつじ：癸未\nきのえさる：甲申\nきのととり：乙酉\nひのえいぬ：丙戌\nひのとい：丁亥\nつちのえね：戊子\nつちのとうし：己丑\nかのえとら：庚寅\nかのとう：辛卯\nみずのえたつ：壬辰\nみずのとみ：癸巳\nきのえうま：甲午\nきのとひつじ：乙未\nひのえさる：丙申\nひのととり：丁酉\nつちのえいぬ：戊戌\nつちのとい：己亥\nかのえね：庚子\nかのとうし：辛丑\nみずのえとら：壬寅\nみずのとう：癸卯\nきのえたつ：甲辰\nきのとみ：乙巳\nひのえうま：丙午\nひのとひつじ：丁未\nつちのえさる：戊申\nつちのととり：己酉\nかのえいぬ：庚戌\nかのとい：辛亥\nみずのえね：壬子\nみずのとうし：癸丑\nきのえとら：甲寅\nきのとう：乙卯\nひのえたつ：丙辰\nひのとみ：丁巳\nつちのえうま：戊午\nつちのとひつじ：己未\nかのえさる：庚申\nかのととり：辛酉\nみずのえいぬ：壬戌\nみずのとい：癸亥\nしちゅうすいめい：四柱推命\nめいしき：命式\nりゅうは：流派\nねんちゅう：年柱\nげっちゅう：月柱\nにっちゅう：日柱\nじちゅう：時柱\nてんかん：天干\nぞうかん：蔵干\nしれい：司令\nちゅうき：中気\nほんき：本気\nせいき：正気\nにっかん：日干\nにっしゅ：日主\nげっしげんめい：月支元命\nはいぐうきゅう：配偶宮\nだいうん：大運\nりつうん：立運\nじゅんこう：順行\nぎゃっこう：逆行\nねんうん：年運\nげつうん：月運\nにちうん：日運\nせついり：節入り\nじさほせい：時差補正\nごぎょう：五行\nもっかどごんすい：木火土金水\nそうじょう：相生\nそうこく：相剋\nなっちん：納音\nくうぼう：空亡\nてんちゅうさつ：天中殺\nきしん：喜神\nきじん：忌神\nようじん：用神\nみおう：身旺\nみきょう：身強\nみじゃく：身弱\nちゅうわ：中和\nげつれい：月令\nとうしゅつ：透出\nたいか：太過\nろくしん：六親\nひごう：比劫\nしょくしょう：食傷\nざいせい：財星\nかんさつ：官殺\nかんせい：官星\nいんせい：印星\nざいせいこんざつ：財星混雑\nかんさつこんざつ：官殺混雑\nつうへんせい：通変星\nひけん：比肩\nごうざい：劫財\nしょくじん：食神\nしょうかん：傷官\nへんざい：偏財\nせいざい：正財\nへんかん：偏官\nせいかん：正官\nへんいん：偏印\nいんじゅ：印綬\nしちさつ：七殺\nとうしょく：倒食\nじゅうにうん：十二運\nじゅうにうんせい：十二運星\nちょうせい：長生\nもくよく：沐浴\nかんたい：冠帯\nけんろく：建禄\nていおう：帝旺\nびょう：病\nてんおつきじん：天乙貴人\nたいきょくきじん：大極貴人\nふくせいきじん：福星貴人\nぶんしょうきじん：文昌貴人\nてんとくきじん：天徳貴人\nげっとくきじん：月徳貴人\nてんとくごう：天徳合\nげっとくごう：月徳合\nろくばきじん：禄馬貴人\nあんろく：暗禄\nきんよろく：金与禄\nようじん：羊刃\nひじん：飛刃\nにちじん：日刃\nけつじん：血刃\nかいごう：魁罡\nこうえん：紅艶\nかんち：咸池\nかがい：華蓋\nえきば：駅馬\nごうさつ：劫殺\nぼうじん：亡神\nしゅうごく：囚獄\nかくかく：隔角\nいんよくさつ：淫欲殺\nかんごう：干合\nしごう：支合\nさんごう：三合\nほうごう：方合\nはんかい：半会\nはんごう：半合\nかいきょく：会局\nごうか：合化\nちゅう：冲\nじけい：自刑\nりっちん：律音\nてんせんちちゅう：天戦地冲\nちゅうせいのごう：中正の合\nじんぎのごう：仁義の合\nいせいのごう：威勢の合\nいんいつのごう：淫泆の合\nむじょうのごう：無情の合\nいうひつじ：亥卯未\nさるねたつ：申子辰\nとらうまいぬ：寅午戌\nみとりうし：巳酉丑\nかくきょく：格局\nないかく：内格\nがいかく：外格\nかきかく：化気格\nいっこうきとくかく：一行気得格\nきょくちょくかく：曲直格\nえんじょうかく：炎上格\nじゅうかくかく：従革格\nじゅんかかく：潤下格\nかしょくかく：稼穡格\nきょうおうかく：強旺格\nじゅうおうかく：従旺格\nじゅうじかく：従児格\nじゅうざいかく：従財格\nじゅうさつかく：従殺格\nけんろくかく：建禄格\nようじんかく：羊刃格\nげつじんかく：月刃格\nりょうしんせいしょうかく：両神成象格\nけんろくげつごうかく：建禄月劫格\nきろくかく：帰禄格\nせいかんかく：正官格\nへんかんかく：偏官格\nせいざいかく：正財格\nへんざいかく：偏財格\nしょくじんかく：食神格\nしょうかんかく：傷官格\nいんじゅかく：印綬格\nへんいんかく：偏印格\nかんさつこんざつかく：官殺混雑格\nかんいんかく：官印格\nざいかんそうび：財官双美\nざいかんかく：財官格\nさついんせいかかく：殺印生化格\nさついんかく：殺印格\nざいさつかく：財殺格\nせいさつかく：制殺格\nじじょういちいきかく：時上一位貴格\nじじょうへんざいかく：時上偏財格\nしょくじんせいざいかく：食神生財格\nせんしょくろくかく：専食禄格\nしょうかんはいいんかく：傷官佩印格\nしょうかんせいざいかく：傷官生財格\nしょうかんやぶれつくすかく：傷官破れ尽す格\nえききょう：易経\nほんか：本卦\nそうか：綜卦\nさくか：錯卦\nこうじ：爻辞\nしょこう：初爻\nじょうこう：上爻\nようこう：陽爻\nいんこう：陰爻\nはっか：八卦\nはっけ：八卦\nけんいてん：乾為天\nこんいち：坤為地\nすいらいちゅん：水雷屯\nさんすいもう：山水蒙\nすいてんじゅ：水天需\nてんすいしょう：天水訟\nちすいし：地水師\nすいちひ：水地比\nふうてんしょうちく：風天小畜\nてんたくり：天沢履\nちてんたい：地天泰\nてんちひ：天地否\nてんかどうじん：天火同人\nかてんたいゆう：火天大有\nちざんけん：地山謙\nらいちよ：雷地豫\nたくらいずい：沢雷随\nさんぷうこ：山風蠱\nちたくりん：地沢臨\nふうちかん：風地観\nからいぜいこう：火雷噬嗑\nさんかひ：山火賁\nさんちはく：山地剥\nちらいふく：地雷復\nてんらいむぼう：天雷无妄\nさんてんたいちく：山天大畜\nさんらいい：山雷頤\nたくふうたいか：沢風大過\nかんいすい：坎為水\nたくざんかん：沢山咸\nらいふうこう：雷風恒\nてんざんとん：天山遯\nらいてんたいそう：雷天大壮\nかちしん：火地晋\nちかめいい：地火明夷\nふうかかじん：風火家人\nかたくけい：火沢睽\nすいざんけん：水山蹇\nらいすいかい：雷水解\nさんたくそん：山沢損\nふうらいえき：風雷益\nたくてんかい：沢天夬\nてんぷうこう：天風姤\nたくちすい：沢地萃\nちふうしょう：地風升\nたくすいこん：沢水困\nすいふうせい：水風井\nたくかかく：沢火革\nかふうてい：火風鼎\nしんいらい：震為雷\nごんいざん：艮為山\nふうざんぜん：風山漸\nらいたくきまい：雷沢帰妹\nらいかほう：雷火豊\nかざんりょ：火山旅\nそんいふう：巽為風\nだいたく：兌為沢\nふうすいかん：風水渙\nすいたくせつ：水沢節\nふうたくちゅうふ：風沢中孚\nらいざんしょうか：雷山小過\nすいかきせい：水火既済\nかすいびせい：火水未済\nりいか：離為火\nにっかんし：日干支\nげっかんし：月干支\nねんし：年支\nげっし：月支\nにっし：日支\nねんかん：年干\nげっかん：月干\nじかん：時干";

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: { code: 'METHOD' } });
  const site = process.env.URL || '';
  const h = lower(event.headers || {});
  const origin = h.origin || h.referer || '';
  if (site) {
    const oOf = (u) => { try { return new URL(u).origin; } catch (e) { return ''; } };
    const allowed = [site, process.env.DEPLOY_PRIME_URL || '', ...(process.env.ALLOWED_ORIGINS || '').split(',')].map((x) => oOf(String(x).trim())).filter(Boolean);
    if (!origin || !allowed.includes(oOf(origin))) return json(403, { error: { code: 'ORIGIN' } });
  }
  const memberCheck = process.env.MEMBER_CHECK_URL || '';
  if (site && !memberCheck && process.env.PK_ALLOW_NO_MEMBER_CHECK !== '1') return json(503, { error: { code: 'SETUP' } });

  let who = '', option = false, periodEnd = '';
  if (memberCheck) {
    const tk = clean(String(h.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!tk) return json(401, { error: { code: 'LOGIN' } });
    who = 'm' + sha(tk);
    try {
      const r = await fetch(memberCheck, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk }) });
      if (!r.ok) return json(401, { error: { code: 'LOGIN' } });
      const m = await r.json();
      const st = m && m.status, pe = m && m.periodEnd;
      periodEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(pe || '')) ? String(pe) : '';
      if (m && m.memberId) who = 'u' + sha(String(m.memberId));
      const usable = st === 'active' || st === 'trialing' || ((st === 'canceled' || st === 'canceling') && pe ? Date.parse(pe + 'T23:59:59+09:00') > Date.now() : st === 'canceling');
      if (!m || !m.ok || !usable) return json(403, { error: { code: 'MEMBER' } });
      option = m.voiceOption === true;
    } catch (e) { return json(503, { error: { code: 'MEMBER_CHECK' } }); }
  } else {
    who = 'd' + sha(clean(h['x-pk-device']) || clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || 'nodev'));
  }
  const isOwner = !!OWNER_TOKEN && clean(h['x-pk-owner']) === OWNER_TOKEN;
  if (isOwner) option = true;

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const store = await getStore();
  const trialKey = `vt:${PRODUCT}:${who}`;
  const monthKey = `vm:${PRODUCT}:${periodId(periodEnd)}:${who}`;
  let used = 0;
  try { if (store) used = await readCount(store, option ? monthKey : trialKey); } catch (e) {}
  const left = option ? Math.max(0, MONTH - used) : Math.max(0, TRIAL - used);
  const info = { option: option, left: left, trial: TRIAL };

  if (body.mode === 'status') return json(200, info);
  if (!left && !isOwner) return json(option ? 429 : 402, { error: { code: option ? 'VOICE_MONTH' : 'VOICE_OPTION' }, option: option, left: 0, trial: TRIAL });

  const text = String(body.text || '').slice(0, MAX_TEXT);
  if (!text.trim()) return json(200, Object.assign({ text: text, changed: false }, info));
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: { code: 'NO_KEY' } });

  let fixed = text;
  try {
    const req = {
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: '<text>' + text + '</text>' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: Math.min(4096, text.length * 3 + 200), thinkingConfig: /gemini-3/.test(MODEL) ? { thinkingLevel: 'minimal' } : { thinkingBudget: 0 } },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    let r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 800)); r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }); }
    if (!r.ok) return json(502, Object.assign({ error: { code: 'UPSTREAM' } }, info));
    const j = await r.json();
    const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    fixed = guard(text, parts ? parts.map((p) => (p && p.text) || '').join('') : '');
  } catch (e) { return json(502, Object.assign({ error: { code: 'UPSTREAM' } }, info)); }

  let n = used;
  if (store && !isOwner) { try { n = await bump(store, option ? monthKey : trialKey); } catch (e) {} }
  return json(200, { text: fixed, changed: fixed !== text, option: option, left: option ? Math.max(0, MONTH - n) : Math.max(0, TRIAL - n), trial: TRIAL });
};

// 直した文を確かめる：タグ・前後の空白を取り、長さが大きく変わったら元の文に戻す
function guard(src, out) {
  let t = String(out || '').replace(/^\s*<text>/, '').replace(/<\/text>\s*$/, '').replace(/^```[a-z]*\n?|```\s*$/g, '');
  const lead = (src.match(/^\s*/) || [''])[0], tail = (src.match(/\s*$/) || [''])[0];
  t = t.trim();
  if (!t) return src;
  const a = src.trim().length, b = t.length;
  if (b < a * 0.5 || b > a * 1.6 + 4) return src;
  // 文の形（助詞・です・ます）が大きく減った＝言葉だけ並べた・要約した、とみなして元の文に戻す
  const parts = (x) => (x.match(/です|ます|でした|ました|[はがをにでとも]/g) || []).length;
  const pa = parts(src), pb = parts(t);
  if (pa >= 4 && pb < pa * 0.5) return src;
  // 文が消えた（。？！の数が減った）・数字（生年月日・時刻など）が消えた・変わったときも元の文に戻す
  const ends = (x) => (x.match(/[。？！?!]/g) || []).length;
  if (ends(t) < ends(src)) return src;
  const nums = (x) => (x.match(/[0-9０-９]+/g) || []).map((n) => n.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))).join(',');
  if (nums(t) !== nums(src)) return src;
  return lead + t + tail;
}
function sha(s) { return require('crypto').createHash('sha256').update(String(s)).digest('hex').slice(0, 24); }
async function readCount(store, k) { const v = await store.get(k, { type: 'json' }).catch(() => null); return (v && typeof v.n === 'number') ? v.n : 0; }
async function bump(store, k) { const cur = await readCount(store, k); await store.setJSON(k, { n: cur + 1, t: Date.now() }); return cur + 1; }
async function getStore() { try { const { getStore } = require('@netlify/blobs'); return getStore('voice-fix'); } catch (e) { return null; } }
function periodId(pe) { const today = jstDay(); return (pe && pe >= today) ? pe : 'm' + today.slice(0, 7); }
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

module.exports.__test = { guard, SYSTEM, PRODUCT };
