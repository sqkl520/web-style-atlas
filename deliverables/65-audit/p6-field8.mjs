// 探针 6：字段 8 的原始体量 vs 解析体量；验证 tail 截断 / lookahead 吞内容
import { readSpec, specIds, dec } from './lib-load.mjs';

const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'),
  new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'),
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'),
];

function startsOf(text) {
  const s = [];
  for (const re of RES) for (const m of text.matchAll(re)) s.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  s.sort((a, b) => a.i - b.i);
  const seen = new Set(); const d = [];
  for (const x of s) { if (seen.has(x.i)) continue; seen.add(x.i); d.push(x); }
  // 同一行多条正则命中 → 去重
  const byLine = new Map();
  for (const x of d) { const ln = text.lastIndexOf('\n', x.i) + 1; if (!byLine.has(ln)) byLine.set(ln, x); }
  return [...byLine.values()];
}

console.log('案号\t字段8原始字数\t字段8解析字数\t差\t字段8原始段落数(含换行)');
let sumRaw = 0, sumParsed = 0;
const per = [];
for (const id of specIds()) {
  const text = readSpec(id);
  const st = startsOf(text);
  const idx = st.findIndex((s) => s.key.replace(/（[^）]*）/g, '').trim() === '去 AI 味审查点');
  if (idx < 0) { console.log(id + '\t未找到字段8'); continue; }
  const rawSeg = text.slice(st[idx].end, idx + 1 < st.length ? st[idx + 1].i : text.length);
  const parsed = dec(rawSeg);
  sumRaw += rawSeg.length; sumParsed += parsed.length;
  per.push({ id, raw: rawSeg.length, parsed: parsed.length });
  console.log(`${id}\t${rawSeg.length}\t${parsed.length}\t${rawSeg.length - parsed.length}\t${rawSeg.split(/\n/).filter((x) => x.trim()).length}`);
}
console.log(`\n合计：原始 ${sumRaw} 字 / 解析 ${sumParsed} 字`);

const g = (a, b) => per.filter((p) => +p.id.slice(1) >= a && +p.id.slice(1) <= b);
const avg = (a, k) => Math.round(a.reduce((s, p) => s + p[k], 0) / a.length);
console.log(`\nS01–S10  原始 avg ${avg(g(1, 10), 'raw')} / 解析 avg ${avg(g(1, 10), 'parsed')}`);
console.log(`S11–S20  原始 avg ${avg(g(11, 20), 'raw')} / 解析 avg ${avg(g(11, 20), 'parsed')}`);
console.log(`S21–S30  原始 avg ${avg(g(21, 30), 'raw')} / 解析 avg ${avg(g(21, 30), 'parsed')}`);

// 检查 tailAbs 是否小于最后一个字段起点（会截断字段区）
console.log('\n=== tail 截断检查 ===');
for (const id of specIds()) {
  const text = readSpec(id);
  const st = startsOf(text);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(st.length ? st[0].i : 0));
  const tailAbs = tailM && st.length ? st[0].i + tailM.index : text.length;
  const lastStart = st.length ? st[st.length - 1].i : 0;
  const flag = tailAbs < lastStart ? '  ⚠ tailAbs 早于最后字段起点 → 该字段被截成空' : '';
  console.log(`${id} tailAbs=${tailAbs} lastStart=${lastStart} len=${text.length}${flag}`);
}
