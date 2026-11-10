import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));

/* 逐"条"（①②③ / （1） / 第一，）切开，再把每条切成三个语义段：
 *   [引用段] 反 <编号>「规则名」—— 到第一个 —— 或 ： 为止
 *   [做法段] 到"跳脱之处"之前
 *   [元话术] 跳脱之处…（到条末）
 * 然后对"做法段"再二分：
 *   B 否证型承诺：含 "没有/只用/唯一/不存在/不用/不得/不许/一律/全部…" 且可一眼反查
 *   C 工程量/规格：含数量词 + 单位/比例（px/mm/%/栏/个/条/级/档/倍/面积）
 *   A 其余叙述
 * 引用段整体计为 A'（内部术语）。
 */
const n = (s) => s.replace(/\s/g, '').length;
function items(s) {
  const m = [...s.matchAll(/[①②③④⑤⑥⑦⑧⑨]|[（(]\d+[）)]|第[一二三四五六七八九]，/g)];
  if (!m.length) return [s];
  return m.map((x, i) => s.slice(x.index, i + 1 < m.length ? m[i + 1].index : s.length).trim());
}
const isNeg = (s) => /没有|不存在|只用|只有|唯一|一律|全部|不得|不许|禁止|不用|不使用|而非|不是/.test(s);
const isQty = (s) => /\d/.test(s) && /(px|mm|%|deg|°|:1|栏|个|条|处|层|档|级|倍|行|枚|格)/.test(s);

let T = { cite: 0, neg: 0, qty: 0, other: 0, meta: 0 };
const perItem = [];
for (const r of D) {
  for (const it of items(r.audit)) {
    let meta = '';
    const mi = it.search(/跳脱之处/);
    let head = it;
    if (mi >= 0) { meta = it.slice(mi); head = it.slice(0, mi); }
    // 引用段
    let cite = '', rest = head;
    const cut = head.search(/——|→|：|:/);
    if (cut >= 0 && /反/.test(head.slice(0, cut))) { cite = head.slice(0, cut + 1); rest = head.slice(cut + 1); }
    else if (/^[（(]?\d*[）)]?\s*它?故意反/.test(head)) { cite = head; rest = ''; }
    T.cite += n(cite); T.meta += n(meta);
    // 做法段按 ；/。 切句再判
    for (const s of rest.split(/[；;。]/).filter((x) => n(x) > 0)) {
      const cls = isNeg(s) ? 'neg' : (isQty(s) ? 'qty' : 'other');
      T[cls] += n(s);
      perItem.push({ id: r.id, cls, s: s.trim(), n: n(s) });
    }
    if (n(rest) === 0) perItem.push({ id: r.id, cls: 'other', s: '(做法段为空)', n: 0 });
  }
}
const tot = T.cite + T.neg + T.qty + T.other + T.meta;
console.log('=== 字段8 四类合计（去空白字符）===');
const LAB = {
  cite: 'A 内部术语（规则编号/文件名/审查流程号 + 规则名）',
  neg: 'B 可当场验证的否证型承诺（没有X / 只用Y一个值）',
  qty: 'C 工程量与规格参数（数量+单位/比例）',
  other: 'D 其他叙述（机制理由、观感描述）',
  meta: 'E 元话术（"跳脱之处…"）',
};
for (const k of ['cite', 'neg', 'qty', 'other', 'meta']) {
  console.log('  ' + String(T[k]).padStart(5) + '  ' + (T[k] / tot * 100).toFixed(1).padStart(5) + '%  ' + LAB[k]);
}
console.log('  ' + String(tot).padStart(5) + '  100.0%  合计');
writeFileSync('D:/Web/style/deliverables/65-audit/_cls.json', JSON.stringify(perItem, null, 1), 'utf8');

console.log('\n=== 每类抽 12 条实例（供人工核对）===');
for (const k of ['neg', 'qty', 'other']) {
  console.log('\n--- ' + k + ' ---');
  perItem.filter((x) => x.cls === k).slice(0, 12).forEach((x) => console.log('  [' + x.id + '/' + x.n + '] ' + x.s.slice(0, 90)));
}
