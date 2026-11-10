import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const ch = (s) => String(s || '').replace(/\s/g, '').length;

/* 逐条判"这条约束在 f9 里有没有被再说一遍"。
 * 判据用三条硬信号（任一命中即算"再说一遍"）：
 *   H: 同一条里出现过的 hex，f9 也出现
 *   N: 同一条里出现过的"带单位数值+量词"，f9 也出现（且数值不是 3/6/9 这类规则编号产物）
 *   K: 同一条里的核心名词短语（去停用词后 ≥4 字的连续汉字串）在 f9 中出现
 */
const HEX = /#[0-9A-Fa-f]{6}\b/g;
const NUM = /(\d+(?:\.\d+)?)\s*(px|mm|%|deg|°|:1)/g;
function items(s) {
  const m = [...s.matchAll(/[①②③④⑤⑥⑦⑧⑨]|[（(]\d+[）)]|第[一二三四五六七八九]，/g)];
  if (!m.length) return [s];
  return m.map((x, i) => s.slice(x.index, i + 1 < m.length ? m[i + 1].index : s.length));
}
const clean = (s) => s.replace(/(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+(?![0-9])|文件\s*01|01-research-brief\.md)/g, '');
let totItems = 0, restated = 0;
const rows = [];
for (const r of D) {
  const f9 = clean(r.risk || '');
  const f9hex = new Set([...f9.matchAll(HEX)].map((m) => m[0].toUpperCase()));
  const f9num = new Set([...f9.matchAll(NUM)].map((m) => m[0]));
  const f9txt = f9.replace(/\s/g, '');
  let n = 0, hit = 0;
  const hits = [];
  for (let it of items(r.audit)) {
    if (it.indexOf('反套路改造三指标') >= 0) continue;   // S13 审查块单独算
    it = clean(it);
    const mi = it.indexOf('跳脱之处');
    const body = mi >= 0 ? it.slice(0, mi) : it;
    if (ch(body) < 8) continue;
    n++;
    const hs = [...new Set([...body.matchAll(HEX)].map((m) => m[0].toUpperCase()))].filter((h) => f9hex.has(h));
    const ns = [...new Set([...body.matchAll(NUM)].map((m) => m[0]))].filter((x) => f9num.has(x));
    // 核心名词短语：取 body 里最长的 4 字汉字窗口是否出现在 f9
    let kn = false;
    const han = body.replace(/[^\u4e00-\u9fff]/g, '');
    for (let i = 0; i + 5 <= han.length && !kn; i += 1) if (f9txt.includes(han.slice(i, i + 5))) kn = true;
    if (hs.length || ns.length) { hit++; hits.push({ it: body.slice(0, 50), hs, ns, kn }); }
  }
  totItems += n; restated += hit;
  rows.push({ id: r.id, n, hit, hits });
}
console.log('=== 字段8 逐条 vs 字段9：同一条约束有没有被 f9 再说一遍（判据：同 hex 或 同带单位数值）===');
console.log('id\t条数\t被 f9 重述\t重述内容');
for (const x of rows) console.log([x.id, x.n, x.hit, x.hits.map((h) => (h.hs.join('/') || '') + (h.ns.join('/') || '')).join(' ') || '—'].join('\t'));
console.log('\n30 案合计 ' + totItems + ' 条；其中 ' + restated + ' 条（' + (restated / totItems * 100).toFixed(0) + '%）的具体值在 f9 里也出现');
