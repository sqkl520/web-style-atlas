// 探针 4：collect-schemes.mjs 的 13 FIELDS 逐个「读了几次 / 赋给哪个 rec 键」，以及反向检查
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib-load.mjs';

const src = readFileSync(join(ROOT, 'prototypes/_build/collect-schemes.mjs'), 'utf8');
const lines = src.split(/\r?\n/);

// 剥离注释：块注释 /** */ 与行注释 //（必须先做，否则注释里提到的 fields['机制'] 会被误算成代码读取）
function stripComments(text) {
  const out = [];
  let inBlock = false;
  for (const line of text.split(/\r?\n/)) {
    let l = line;
    if (inBlock) {
      const e = l.indexOf('*/');
      if (e < 0) { out.push(''); continue; }
      l = l.slice(e + 2); inBlock = false;
    }
    let s = l;
    for (;;) {
      const b = s.indexOf('/*');
      if (b < 0) break;
      const e = s.indexOf('*/', b + 2);
      if (e < 0) { s = s.slice(0, b); inBlock = true; break; }
      s = s.slice(0, b) + s.slice(e + 2);
    }
    const c = s.indexOf('//');
    if (c >= 0 && (s.slice(0, c).match(/"/g) || []).length % 2 === 0) s = s.slice(0, c);
    out.push(s);
  }
  return out;
}
const codeLines = stripComments(src);

const FIELDS = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素',
  '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];

// 声明行
const declLine = lines.findIndex((l) => /^const FIELDS\s*=/.test(l)) + 1;
console.log('FIELDS 声明行: L' + declLine);
console.log('');

console.log('字段\t读取次数\t行号\t赋给rec.键\trec键在其它处被读?');
for (const f of FIELDS) {
  const hits = [];
  codeLines.forEach((l, i) => { if (l.includes("fields['" + f + "']")) hits.push(i + 1); });
  let assigned = [];
  lines.forEach((l, i) => {
    if (!l.includes("fields['" + f + "']")) return;
    const m = /(\w+):\s*spec\.fields\[/.exec(l) || /(\w+):\s*spec\s*&&\s*spec\.fields\[/.exec(l);
    if (m) assigned.push(m[1] + '@L' + (i + 1));
  });
  // 变量形式 const x = spec.fields['f'] 并之后被使用
  const varHits = [];
  lines.forEach((l, i) => {
    const m = /const\s+(\w+)\s*=\s*spec(?:\s*&&\s*spec)?\.fields\['([^']+)'\]/.exec(l);
    if (m && m[2] === f) varHits.push({ v: m[1], ln: i + 1 });
  });
  let varUse = [];
  for (const v of varHits) lines.forEach((l, i) => { if (new RegExp('\\b' + v.v + '\\b').test(l) && i + 1 !== v.ln) varUse.push(v.v + '@L' + (i + 1)); });
  console.log(`${f}\t${hits.length}\t${hits.join(',')}\t${assigned.join(',') || (varHits.length ? 'const ' + varHits.map((x) => x.v + '@L' + x.ln).join(',') : '（无）')}\t${varUse.join(',')}`);
}

// 反向：读到的 key 是否都在 FIELDS 里
console.log('\n--- 代码里所有 fields[...] 读取表达式（已剔除行内/块注释）---');

const readKeys = new Map();
codeLines.forEach((l, i) => {
  for (const m of l.matchAll(/fields\[['"]([^'"]+)['"]\]/g)) {
    if (!readKeys.has(m[1])) readKeys.set(m[1], []);
    readKeys.get(m[1]).push(i + 1);
  }
});
for (const [k, v] of readKeys) {
  console.log(`${k}  →  L${v.join(',')}  ${FIELDS.includes(k) ? '[在 FIELDS 中]' : '⚠ 不在 FIELDS 声明里'}`);
}
console.log('\nFIELDS 里声明但代码中从未 read 的：' + (FIELDS.filter((f) => !readKeys.has(f)).join(' ') || '（无）'));
console.log('fields[...] 读取涉及但不在 FIELDS 的：' + ([...readKeys.keys()].filter((k) => !FIELDS.includes(k)).join(' ') || '（无）'));
