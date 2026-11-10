import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const ch = (s) => String(s || '').replace(/\s/g, '').length;

/* 先按"条"切开（①②③ / （1） / 第一，第二，…），再在条内分层。 */
function items(s) {
  const m = [...s.matchAll(/[①②③④⑤⑥⑦⑧⑨]|[（(]\d+[）)]|第[一二三四五六七八九]，/g)];
  if (!m.length) return [s];
  return m.map((x, i) => s.slice(x.index, i + 1 < m.length ? m[i + 1].index : s.length));
}
let L = { p1: 0, p2: 0, p3: 0, p4: 0 };
const detail = [];
for (const r of D) {
  let whole = r.audit;
  let l4 = 0;
  const i4 = whole.indexOf('反套路改造三指标');
  if (i4 >= 0) { l4 = ch(whole.slice(i4)); whole = whole.slice(0, i4); }
  let l1 = 0, l2 = 0, l3 = 0;
  for (let it of items(whole)) {
    // 条首编号符不算
    it = it.replace(/^[①②③④⑤⑥⑦⑧⑨]|^[（(]\d+[）)]|^第[一二三四五六七八九]，/, '');
    // 辩护层：跳脱之处 到条末（条内唯一），以及（理由：…）
    const mi = it.indexOf('跳脱之处');
    if (mi >= 0) { l3 += ch(it.slice(mi)); it = it.slice(0, mi); }
    for (const m of it.matchAll(/[（(][^）)]*理由[^）)]*[）)]/g)) l3 += ch(m[0]);
    it = it.replace(/[（(][^）)]*理由[^）)]*[）)]/g, '');
    // 指针层
    for (const m of it.matchAll(/(?:`?01-research-brief\.md`?\s*F\s*节\s*)?(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+(?![0-9])|文件\s*01)/g)) l1 += ch(m[0]);
    l2 += ch(it.replace(/(?:`?01-research-brief\.md`?\s*F\s*节\s*)?(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+(?![0-9])|文件\s*01)/g, ''));
  }
  L.p1 += l1; L.p2 += l2; L.p3 += l3; L.p4 += l4;
  detail.push({ id: r.id, total: ch(r.audit), p1: l1, p2: l2, p3: l3, p4: l4 });
}
const tot = L.p1 + L.p2 + L.p3 + L.p4;
console.log('=== 字段 8 四层结构（去空白，合计 ' + tot + '）===');
const names = {
  p1: 'L1 指针层：规则编号/文件名',
  p2: 'L2 承诺层：页面实际长什么样（可验证）',
  p3: 'L3 辩护层：跳脱之处 +（理由：…）',
  p4: 'L4 审查专用：S13"反套路改造三指标"块',
};
for (const k of ['p1', 'p2', 'p3', 'p4']) console.log('  ' + String(L[k]).padStart(5) + '  ' + (L[k] / tot * 100).toFixed(1).padStart(5) + '%  ' + names[k]);
console.log('\nid\t总\t指针\t承诺\t辩护\t审查块');
for (const d of detail) console.log([d.id, d.total, d.p1, d.p2, d.p3, d.p4].join('\t'));
console.log('\n承诺层 ' + L.p2 + ' 字 = ' + (L.p2 / tot * 100).toFixed(0) + '%；其余 ' + (tot - L.p2) + ' 字 = ' + ((tot - L.p2) / tot * 100).toFixed(0) + '%');
