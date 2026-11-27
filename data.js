// 源泉徴収いくら？の問題を作る（ブラウザと node の両方で使う）。
// 中身は、国税庁タックスアンサー No.2795「原稿料や講演料等を支払ったとき」・No.2798「弁護士や税理士等に支払う報酬・料金」・No.2792「源泉徴収が必要な報酬・料金等とは」に書いてあることだけ（［令和8年4月1日現在法令等］。2026-11-17 に読んだ。要点は共有フォルダ games/gensen-ikura-research.md）。
// 1問は、居住者の個人に払う原稿料・講演料・弁護士や税理士の報酬の場面を読んで、源泉徴収する税額を選ぶ。正解したら2段目「どの計算？」を選ぶ。
// 答えはコードで計算する（対象の額が100万円以下：×10.21％。100万円超：(額−100万円)×20.42％＋102,100円。1円未満の端数は切り捨て）。金額は種で決まる（同じ tag なら、どの端末でも同じ問題になる）。
// 対象の額は場面で決まる：消費税が分けて書いてあれば報酬だけ・分けていなければ全体／支払う側がホテルへ直接払った宿泊費は含めない／本人に渡した旅費は含める（No.2798）／登録免許税にあてるお金は含めない（No.2798）／懸賞の賞金は1回50,000円以下ならしなくてよい（No.2795）。
// 法人への支払い・外交員・ホステス・診療報酬・芸能・プロスポーツ・非居住者・納付の手続きは扱わない（画面に書く）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。
// KINDS の並びは最後に足すだけにする（並べ替え・削除をすると過去の日の問題が変わる）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const AS_OF = "令和8年4月1日現在法令等";

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    a: ["国税庁 タックスアンサー No.2795 原稿料や講演料等を支払ったとき", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2795.htm"],
    b: ["国税庁 タックスアンサー No.2798 弁護士や税理士等に支払う報酬・料金", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2798.htm"],
    c: ["国税庁 タックスアンサー No.2792 源泉徴収が必要な報酬・料金等とは", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2792.htm"],
  };
  const MEDIA = { a: "原稿料・講演料", b: "弁護士・税理士の報酬" };

  // 税額（No.2795・No.2798 の表）。1円未満の端数は切り捨て。10.21％＝1021/10000、20.42％＝2042/10000 で、整数だけで計算する。
  const MAN = 10000, LINE = 100 * MAN, KENSHO = 50000;
  const taxOf = (base) => (base <= 0 ? 0 : base <= LINE ? Math.floor((base * 1021) / 10000) : Math.floor(((base - LINE) * 2042) / 10000) + 102100);

  // 2段目「どの計算？」
  const GROUPS = {
    lo: { name: "×10.21％", sub: "対象の額が100万円以下", set: "all" },
    hi: { name: "超えた分×20.42％＋102,100円", sub: "対象の額が100万円を超える", set: "all" },
    none: { name: "しなくてよい", sub: "1回50,000円以下の懸賞の賞金", set: "all" },
  };
  const GRP_WHY = {
    lo: "源泉徴収の対象の額が100万円以下なら、その額×10.21％です。1円未満の端数は切り捨てます。",
    hi: "100万円を超えると、(対象の額−100万円)×20.42％＋102,100円です。1円未満の端数は切り捨てます。",
    none: "懸賞に応募した作品の入選者に、1人に1回50,000円以下の賞金を払うときは、源泉徴収しなくてかまいません。",
  };
  // 場面の決まり（対象の額をどう決めるか）
  const MODE = {
    p: { key: "支払う額が、そのまま源泉徴収の対象", why: "原稿料・講演料や、弁護士・税理士への報酬は、支払う額が源泉徴収の対象です。謝金・日当などの名目でも、中身が同じなら対象です。" },
    sep: { key: "消費税が分けて書いてあれば、報酬の額だけが対象", why: "請求書などで報酬の額と消費税の額がはっきり分けてあれば、報酬の額だけを源泉徴収の対象にしてかまいません。" },
    inc: { key: "消費税が分けていなければ、全体が対象", why: "報酬に消費税が含まれていて、請求書などで分けて書かれていなければ、消費税も含めた全体が源泉徴収の対象です。" },
    dir: { key: "ホテルへ直接払った宿泊費は含めない", why: "支払う側がホテルなどへ直接払い、ふつうに要る範囲の宿泊費・交通費は、報酬・料金に含めなくてかまいません。" },
    cash: { key: "本人に渡した旅費も報酬に含める", why: "弁護士・税理士に、旅費という名目で本人に渡したお金も、報酬・料金に含めて源泉徴収します。" },
    fee: { key: "登録免許税にあてるお金は含めない", why: "弁護士などに渡すお金でも、登録免許税・手数料にあてることがはっきりしている分は、源泉徴収しなくてかまいません。" },
    kensho: { key: "懸賞の賞金は1回50,000円以下ならしなくてよい", why: "懸賞に応募した作品の入選者への賞金は、1人に1回50,000円以下なら源泉徴収しなくてかまいません。" },
    kensho2: { key: "懸賞の賞金は原則として原稿料と同じ", why: "懸賞に応募した作品の入選者への賞金は、原則として原稿料に含まれます。1回50,000円を超えれば源泉徴収します。" },
  };

  // 種類：[id, 難しさ, 場面の決まり, 2段目, 出典, 場面（＄ が報酬・＃ がもう一つの額）, 下限, 上限, 刻み, もう一つの額の下限, 上限, ヒント1]
  // 払う相手は、どれも居住者の個人。2段目は、対象の額の範囲で決まる（種類の範囲は100万円をまたがない。QA が見る）。
  const D = [
    ["p_genko", 0, "p", "lo", "a", "作家のAさんに原稿料＄を払う。", 100000, 900000, 10000, 0, 0, "100万円以下は、支払う額×10.21％。"],
    ["p_koen", 0, "p", "lo", "a", "大学教授のBさんに講演料＄を払う。", 50000, 500000, 10000, 0, 0, "100万円以下は、支払う額×10.21％。"],
    ["p_zeiri", 0, "p", "lo", "b", "税理士のCさんに報酬＄を払う。", 100000, 1000000, 10000, 0, 0, "100万円以下は、支払う額×10.21％。"],
    ["p_bengo", 0, "p", "lo", "b", "弁護士のDさんに報酬＄を払う。", 200000, 1000000, 50000, 0, 0, "100万円以下は、支払う額×10.21％。"],
    ["rei150", 0, "p", "hi", "a", "国税庁の例。作家に原稿料＄を払う。", 1500000, 1500000, 1, 0, 0, "100万円を超えた分に20.42％。"],
    ["p_writer", 0, "p", "lo", "a", "作家のEさんに原稿料＄を払う。", 30000, 300000, 1000, 0, 0, "1円未満の端数は切り捨てる。"],
    ["p_shakin", 0, "p", "lo", "a", "教授のFさんに、講演の謝金という名目で＄を払う。", 50000, 600000, 10000, 0, 0, "名目が謝金でも、中身は講演料。"],
    ["k_100", 0, "p", "lo", "b", "弁護士のGさんに、ちょうど＄の報酬を払う。", 1000000, 1000000, 1, 0, 0, "100万円「以下」はどちらの計算？"],
    ["n_kensho", 0, "kensho", "none", "a", "懸賞の入選者Hさんに賞金＄を払う。", 10000, 50000, 1000, 0, 0, "懸賞の賞金は、1回いくら以下なら？"],
    ["p_koen2", 0, "p", "lo", "a", "作家のIさんに講演料＄を払う。", 100000, 800000, 10000, 0, 0, "100万円以下は、支払う額×10.21％。"],
    ["h_genko", 1, "p", "hi", "a", "作家のJさんに原稿料＄を払う。", 1100000, 3000000, 10000, 0, 0, "100万円を超えたら、超えた分に20.42％。"],
    ["h_bengo", 1, "p", "hi", "b", "弁護士のKさんに報酬＄を払う。", 1200000, 5000000, 100000, 0, 0, "(額−100万円)×20.42％＋102,100円。"],
    ["sep_zeiri", 1, "sep", "lo", "b", "税理士Lさんの請求書：報酬＄、消費税＃と分けてある。", 100000, 900000, 10000, 0, 0, "分けてあれば、どの額が対象？"],
    ["sep_genko", 1, "sep", "lo", "a", "作家Mさんの請求書：原稿料＄、消費税＃と分けてある。", 100000, 900000, 10000, 0, 0, "分けてあれば、どの額が対象？"],
    ["inc_bengo", 1, "inc", "lo", "b", "弁護士Nさんの請求書：報酬＄（消費税込み・分けていない）。", 100000, 900000, 10000, 0, 0, "分けていなければ、どの額が対象？"],
    ["dir_koen", 1, "dir", "lo", "a", "教授Oさんに講演料＄。宿泊費＃は主催者がホテルへ直接払う。", 100000, 800000, 10000, 10000, 30000, "ホテルへ直接払った分は、報酬に入る？"],
    ["cash_bengo", 1, "cash", "lo", "b", "弁護士Pさんに報酬＄と、旅費＃を本人に払う。", 100000, 900000, 10000, 10000, 90000, "本人に渡した旅費は、報酬に入る？"],
    ["k_kensho5", 1, "kensho", "none", "a", "懸賞の入選者Qさんに、賞金ちょうど＄を払う。", 50000, 50000, 1, 0, 0, "50,000円「以下」なら？"],
    ["kensho2", 1, "kensho2", "lo", "a", "懸賞の入選者Rさんに賞金＄を払う。", 60000, 500000, 10000, 0, 0, "50,000円を超える賞金は？"],
    ["k_101", 1, "p", "hi", "a", "作家のSさんに原稿料＄を払う。", 1010000, 1010000, 1, 0, 0, "超えたのは1万円だけ。"],
    ["p_hasu", 1, "p", "lo", "a", "作家のTさんに原稿料＄を払う。", 12345, 999999, 1, 0, 0, "1円未満の端数は切り捨てる。"],
    ["nittou", 1, "p", "lo", "b", "弁護士のUさんに、日当という名目で＄を払う。", 30000, 200000, 1000, 0, 0, "名目が日当でも、報酬・料金。"],
    ["h_hasu", 2, "p", "hi", "b", "弁護士のVさんに報酬＄を払う。", 1000001, 9999999, 1, 0, 0, "超えた分×20.42％、端数は切り捨て。"],
    ["sep_h", 2, "sep", "hi", "b", "税理士Wさんの請求書：報酬＄、消費税＃と分けてある。", 1100000, 3000000, 10000, 0, 0, "分けてあれば、報酬の額だけで計算。"],
    ["inc_h", 2, "inc", "hi", "a", "作家Xさんの請求書：原稿料＄（消費税込み・分けていない）。", 1000000, 3000000, 10000, 0, 0, "分けていなければ、全体で計算。"],
    ["inc_edge", 2, "inc", "hi", "b", "弁護士Yさんの請求書：報酬＄（消費税込み・分けていない）。", 910000, 1000000, 10000, 0, 0, "全体だと100万円を超える？"],
    ["sep_edge", 2, "sep", "lo", "a", "作家Zさんの請求書：原稿料＄、消費税＃と分けてある。", 910000, 1000000, 10000, 0, 0, "報酬の額だけなら、100万円以下？"],
    ["cash_edge", 2, "cash", "hi", "b", "弁護士あさひさんに報酬＄と、旅費＃を本人に払う。", 960000, 990000, 10000, 50000, 90000, "旅費を足すと、100万円を超える？"],
    ["dir_edge", 2, "dir", "lo", "b", "弁護士いぶきさんに報酬＄。宿泊費＃は依頼者がホテルへ直接払う。", 900000, 1000000, 10000, 20000, 80000, "直接払った宿泊費は足さない。"],
    ["fee", 2, "fee", "lo", "b", "弁護士うみさんに報酬＄と、登録免許税にあてる＃を渡す。", 100000, 900000, 10000, 10000, 100000, "登録免許税にあてる分は？"],
    ["kensho_big", 2, "kensho2", "hi", "a", "懸賞の入選者えまさんに賞金＄を払う。", 1100000, 3000000, 100000, 0, 0, "100万円を超える賞金は？"],
    ["h_genko2", 2, "p", "hi", "a", "作家のおとさんに原稿料＄を払う。", 3000000, 20000000, 10000, 0, 0, "(額−100万円)×20.42％＋102,100円。"],
    ["dir_h", 2, "dir", "hi", "a", "教授かえでさんに講演料＄。旅費＃は主催者が旅行会社へ直接払う。", 1100000, 2000000, 10000, 10000, 50000, "直接払った分は足さずに計算。"],
    ["cash_h", 2, "cash", "hi", "b", "税理士きよさんに報酬＄と、旅費＃を本人に払う。", 1100000, 3000000, 10000, 10000, 90000, "旅費も足してから計算。"],
    ["h_koen", 2, "p", "hi", "a", "教授のくるみさんに講演料＄を払う。", 1000001, 2999999, 1, 0, 0, "超えた分×20.42％、端数は切り捨て。"],
  ];

  const yen = (n) => n.toLocaleString("ja-JP") + "円";
  const label = (t) => (t === 0 ? "0円（しなくてよい）" : yen(t));
  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end

  // 対象の額（場面の決まりから）。x は書いてある報酬（inc は消費税込みの全体）、e はもう一つの額
  const baseOf = (mode, x, e) => (mode === "cash" ? x + e : mode === "kensho" && x <= KENSHO ? 0 : x);
  const formula = (b) => (b <= LINE ? `${yen(b)}×10.21％` : `(${yen(b)}−100万円)×20.42％＋102,100円`);

  function maker(id, mode, sent, lo, hi, step, elo, ehi) {
    return (R) => {
      const n = Math.floor((hi - lo) / step), x0 = lo + ri(R, 0, n) * step, e0 = elo ? elo + ri(R, 0, Math.floor((ehi - elo) / 1000)) * 1000 : 0;
      // inc は、税抜きの額 x0 に消費税10％を足した全体を書く。sep は消費税（x0 の10％）を ＃ に書く
      const x = mode === "inc" ? (x0 * 11) / 10 : x0, e = mode === "sep" ? x0 / 10 : e0;
      const base = baseOf(mode, x, e), ans = taxOf(base);
      const sentence = sent.replace("＄", yen(x)).replace("＃", yen(e));
      // 選び肢：まちがった額を対象にした税額・計算のしかたのまちがい（もう一方の計算・102,100円の足し忘れ・10％だけ）から3つ
      const cand = new Set();
      if (mode === "sep" || mode === "dir" || mode === "fee") cand.add(taxOf(x + e));
      if (mode === "inc") cand.add(taxOf(x0));
      if (mode === "cash") cand.add(taxOf(x));
      if (mode === "kensho") { cand.add(taxOf(x)); cand.add(Math.floor(x / 10)); cand.add(Math.floor((x * 2042) / 10000)); }
      if (mode === "kensho2") cand.add(0);
      if (base > 0 && base <= LINE) { cand.add(Math.floor((base * 2042) / 10000)); cand.add(Math.floor(base / 10)); }
      if (base > LINE) { cand.add(Math.floor((base * 1021) / 10000)); cand.add(Math.floor(((base - LINE) * 2042) / 10000)); cand.add(Math.floor((base * 2042) / 10000)); }
      const ok = (v) => Number.isInteger(v) && v >= 0 && v !== ans;
      const wrong0 = [...cand].filter(ok);
      // 足りないときは、答えの1割ずつ上と下の額（100円単位）を足す（どの問題も選び肢は4つ）
      for (const k of [1, -1, 2, -2, 3, 4, 5, 6]) { if (new Set(wrong0).size >= 3) break; const v = Math.round((ans * (1 + k / 10)) / 100) * 100 || 100 * (k + 8); if (ok(v) && !wrong0.includes(v)) wrong0.push(v); }
      const wrong = pickN(R, [...new Set(wrong0)].sort((p, q) => p - q), 3);
      const opts = shuffle(R, [ans, ...wrong]).map(label);
      const full = base === 0 ? `${sentence} → 1回50,000円以下の懸賞の賞金なので、源泉徴収しなくてよい` : `${sentence} → 対象は${yen(base)}。${formula(base)}＝${yen(ans)}（1円未満は切り捨て）`;
      return { type: "act", q: `${sentence}　源泉徴収税額は？`, opts, ans: label(ans), rev: false, full, amt: x, ext: e, base, tax: ans, v: e ? `${x}/${e}` : `${x}` };
    };
  }
  const KINDS = D.map(([id, lv, mode, grp, col, sent, lo, hi, step, elo, ehi, look]) => ({ id, lv, grp, mode, col, sent, lo, hi, step, elo, ehi, look, src: [col, "c"], name: MEDIA[col] + "：" + sent.replace(/＄|＃/g, "○円").slice(0, 22) + "…", key: MODE[mode].key, why: MODE[mode].why, make: maker(id, mode, sent, lo, hi, step, elo, ehi) }));
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  const GRP_OF = Object.fromEntries(KINDS.map((k) => [k.id, k.grp]));
  const groupsOf = (g) => Object.keys(GROUPS).filter((x) => GROUPS[x].set === GROUPS[g].set);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, gwhy: GRP_WHY[k.grp], media: MEDIA[k.col], src: k.src.map((s) => SRC[s]), ...p };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const GSN = { KINDS, BY, GROUPS, GRP_OF, GRP_WHY, MODE, LV, SRC, MEDIA, AS_OF, LINE, KENSHO, taxOf, baseOf, kindsOf, groupsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = GSN; else root.GSN = GSN;
})(typeof self !== "undefined" ? self : this);
