// 探针 19：逐个校验字段 8 引用的 P 编号在 01-research-brief.md 里是否真的存在、且描述是否对得上
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readSpec, specIds, dec } from './lib-load.mjs';

const BRIEF = readFileSync(join(ROOT, 'deliverables/01-research-brief.md'), 'utf8');
const RULES = readFileSync(join(ROOT, 'deliverables/02-anti-ai-rules.md'), 'utf8');

// 建 P 编号 → 该行原文 的索引（只取表格行 `| Pn | ... |`）
const pdef = new Map();
for (const line of BRIEF.split(/\r?\n/)) {
  const m = /^\|\s*(P\d{1,2})\s*\|([^|]*)\|/.exec(line.trim());
  if (m) pdef.set(m[1], m[2].trim());
}
console.log('01-research-brief.md 定义的 P 编号: ' + [...pdef.keys()].sort((a, b) => +a.slice(1) - +b.slice(1)).join(' '));
console.log('共 ' + pdef.size + ' 条\n');

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

console.log('=== 字段 8 里每个 P 编号引用 → 是否能在 01-research-brief.md 查到 ===');
const used = new Map();
for (const id of specIds()) {
  const v = field8(id);
  for (const m of v.matchAll(/\bP(\d{1,2})\b/g)) {
    const k = 'P' + m[1];
    if (!used.has(k)) used.set(k, new Set());
    used.get(k).add(id);
  }
}
console.log('编号\t引用案\t在 01-research-brief 的定义\t规则文档 02 有没有');
for (const [k, ids] of [...used].sort((a, b) => +a[0].slice(1) - +b[0].slice(1))) {
  const def = pdef.get(k);
  const inRules = new RegExp('\\b' + k + '\\b').test(RULES);
  console.log(`${k}\t${[...ids].join(',')}\t${def ? '✓ ' + def.slice(0, 40) : '✗ 未定义'}\t${inRules ? '有' : '无'}`);
}

console.log('\n=== C 编号在 02-anti-ai-rules.md 的定义形态 ===');
const cdef = new Map();
for (const line of RULES.split(/\r?\n/)) {
  const m = /^\|\s*\**\s*(C-\d+\.\d+)\s*\**\s*\|([^|]*)\|/.exec(line.trim());
  if (m) cdef.set(m[1], m[2].trim());
  const m2 = /^#{2,6}\s*.*?(C-\d+\.\d+)/.exec(line.trim());
  if (m2) cdef.set(m2[1], line.trim().slice(0, 60));
}
console.log('规则文档里带定义的 C 编号: ' + [...cdef.keys()].join(' ') + '  (共 ' + cdef.size + ')');

const usedC = new Map();
for (const id of specIds()) {
  const v = field8(id);
  for (const m of v.matchAll(/C-(\d+)\.(\d+)/g)) { const k = `C-${m[1]}.${m[2]}`; if (!usedC.has(k)) usedC.set(k, new Set()); usedC.get(k).add(id); }
  for (const m of v.matchAll(/C-(\d+)\s*第\s*(\d+)\s*条/g)) { const k = `C-${m[1]}.${m[2]}`; if (!usedC.has(k)) usedC.set(k, new Set()); usedC.get(k).add(id); }
}
console.log('\n字段 8 引用的 C 编号共 ' + usedC.size + ' 个：' + [...usedC.keys()].join(' '));
const missC = [...usedC.keys()].filter((k) => !cdef.has(k) && !RULES.includes(k));
console.log('其中在 02 里**找不到定义行**的: ' + (missC.join(' ') || '无'));
