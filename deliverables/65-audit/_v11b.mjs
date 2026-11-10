import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const HEX = /#[0-9A-Fa-f]{6}\b/g;
const NUM = /(\d+(?:\.\d+)?)\s*(px|mm|%|deg|°|:1)/g;
// 关键修正：先挖掉「规则名」与（规则解释），那里的 24px 是**被反对的套路**，不是本案的值
const clean = (s) => String(s || '')
  .replace(/[「][^」]{0,60}[」]/g, '')
  .replace(/[（][^）]{0,60}(?:条|圆角|投影|导航|铺底|卡片|居中|图标|球体)[^）]{0,40}[）]/g, '')
  .replace(/(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+(?![0-9])|文件\s*01|01-research-brief\.md)/g, '');
function items(s) {
  const m = [...s.matchAll(/[①②③④⑤⑥⑦⑧⑨]|[（(]\d+[）)]|第[一二三四五六七八九]，/g)];
  if (!m.length) return [s];
  return m.map((x, i) => s.slice(x.index, i + 1 < m.length ? m[i + 1].index : s.length));
}
const res = {};
for (const [name, key] of [['fields11', 'landing'], ['fields9', 'risk']]) {
  let ti = 0, hit = 0; const list = [];
  for (const r of D) {
    const t = clean(r[key]);
    const th = new Set([...t.matchAll(HEX)].map((m) => m[0].toUpperCase()));
    const tn = new Set([...t.matchAll(NUM)].map((m) => m[0]));
    for (let it of items(r.audit)) {
      if (it.indexOf('反套路改造三指标') >= 0) continue;
      it = clean(it);
      const mi = it.indexOf('跳脱之处');
      const body = mi >= 0 ? it.slice(0, mi) : it;
      if (body.replace(/\s/g, '').length < 8) continue;
      ti++;
      const hs = [...new Set([...body.matchAll(HEX)].map((m) => m[0].toUpperCase()))].filter((h) => th.has(h));
      const ns = [...new Set([...body.matchAll(NUM)].map((m) => m[0]))].filter((x) => tn.has(x));
      if (hs.length || ns.length) { hit++; list.push(r.id + ':' + (hs.join('/') || '') + (ns.join('/') || '')); }
    }
  }
  res[name] = { ti, hit };
  console.log('字段8 vs ' + name + '：' + ti + ' 条里 ' + hit + ' 条（' + (hit / ti * 100).toFixed(0) + '%）');
  console.log('   ' + list.join('  '));
}
