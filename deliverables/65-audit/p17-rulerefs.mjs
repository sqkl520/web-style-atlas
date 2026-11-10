// 探针 17：字段 8 引用的规则编号，在 02-anti-ai-rules.md 里能不能查到
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readSpec, specIds, dec } from './lib-load.mjs';

const RULES = readFileSync(join(ROOT, 'deliverables/02-anti-ai-rules.md'), 'utf8');

// 解析字段 8
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'),
  new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'),
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'),
];
function field8(id) {
  const text = readSpec(id);
  const s = [];
  for (const re of RES) for (const m of text.matchAll(re)) s.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  s.sort((a, b) => a.i - b.i);
  const byLine = new Map();
  for (const x of s) { const ln = text.lastIndexOf('\n', x.i) + 1; if (!byLine.has(ln)) byLine.set(ln, x); }
  const st = [...byLine.values()].sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tm = tailRe.exec(text.slice(st.length ? st[0].i : 0));
  const tailAbs = tm && st.length ? st[0].i + tm.index : text.length;
  const fields = {};
  for (let i = 0; i < st.length; i++) {
    const key = st[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < st.length ? st[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    if (key && !fields[key]) fields[key] = dec(text.slice(st[i].end, to));
  }
  return fields['去 AI 味审查点'] || '';
}

// 规则文档里出现的定义形态
const defined = new Set();
for (const m of RULES.matchAll(/\bC-(\d+)\.(\d+)\b/g)) defined.add(`C-${m[1]}.${m[2]}`);
for (const m of RULES.matchAll(/C-(\d+)\s*第\s*(\d+)\s*条/g)) defined.add(`C-${m[1]}.${m[2]}`);
// 表格行/标题里 形如 | C-2.11 | 或 ### C-2.11
console.log('02-anti-ai-rules.md 中出现的 C-x.y 形态编号数: ' + defined.size);
console.log([...defined].sort().join(' '));

// 收集字段 8 的引用
const refs = new Map();
for (const id of specIds()) {
  const v = field8(id);
  for (const m of v.matchAll(/C-(\d+)\.(\d+)/g)) { const k = `C-${m[1]}.${m[2]}`; if (!refs.has(k)) refs.set(k, new Set()); refs.get(k).add(id); }
  for (const m of v.matchAll(/C-(\d+)\s*第\s*(\d+)\s*条/g)) { const k = `C-${m[1]}.${m[2]}`; if (!refs.has(k)) refs.set(k, new Set()); refs.get(k).add(id); }
  for (const m of v.matchAll(/\bP(\d+)\b/g)) { const k = `P${m[1]}`; if (!refs.has(k)) refs.set(k, new Set()); refs.get(k).add(id); }
  for (const m of v.matchAll(/\bR-(\d+)\b/g)) { const k = `R-${m[1]}`; if (!refs.has(k)) refs.set(k, new Set()); refs.get(k).add(id); }
}

console.log('\n=== 字段 8 引用的编号，逐个查规则文档 ===');
console.log('编号\t引用案数\t引用案\t在规则文档里可查?');
const missing = [];
const all = [...refs.keys()].sort((a, b) => {
  const pa = a.match(/^([A-Z])-?(\d+)(?:\.(\d+))?$/), pb = b.match(/^([A-Z])-?(\d+)(?:\.(\d+))?$/);
  if (!pa || !pb) return a.localeCompare(b);
  return pa[1].localeCompare(pb[1]) || (+pa[2] - +pb[2]) || ((+pa[3] || 0) - (+pb[3] || 0));
});
for (const k of all) {
  const ids = [...refs.get(k)];
  let found = false;
  if (k.startsWith('C-')) {
    const m = k.match(/^C-(\d+)\.(\d+)$/);
    found = defined.has(k) ||
      RULES.includes(k) ||
      new RegExp('C-' + m[1] + '\\s*第\\s*' + m[2] + '\\s*条').test(RULES);
  } else if (k.startsWith('P')) {
    found = new RegExp('\\b' + k + '\\b').test(RULES);
  } else if (k.startsWith('R-')) {
    found = RULES.includes(k);
  }
  console.log(`${k}\t${ids.length}\t${ids.join(' ')}\t${found ? '✓' : '✗ 查不到'}`);
  if (!found) missing.push({ k, ids });
}
console.log('\n查不到的编号共 ' + missing.length + ' 个：' + missing.map((x) => x.k + '(' + x.ids.join(',') + ')').join(' '));
console.log('引用总数（按出现次数）: ' + [...refs.values()].reduce((a, s) => a + s.size, 0) + '（去重编号 × 案）');
