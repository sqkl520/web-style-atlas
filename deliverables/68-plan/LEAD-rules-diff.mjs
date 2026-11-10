import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const lint = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lint.mjs', 'utf8');
const rules = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs', 'utf8');

// 1) 静态 vs 动态：规则名交集与分级差异
function staticRules(src) {
  const out = [];
  const re = /\[\s*'(FAIL|WARN)'\s*,\s*'([a-z0-9-]+)'/g;
  for (const m of src.matchAll(re)) out.push({ lv: m[1], id: m[2] });
  return out;
}
function dynamicRules(src) {
  const out = [];
  // add('FAIL', 'id', ...) 和 add(cond ? 'FAIL' : 'WARN', 'id', ...)
  const re = /add\(\s*(?:[^,]*?\?\s*)?'(FAIL|WARN)'(?:\s*:\s*'(FAIL|WARN)')?\s*,\s*'([a-zA-Z0-9_-]+)'/g;
  for (const m of src.matchAll(re)) out.push({ lv: m[1], id: m[3], alt: m[2] || null });
  // 三元形式：add(s.x >= 2 ? 'FAIL' : 'WARN', 'hairline'
  const re2 = /add\(\s*[^,]*?\?\s*'(FAIL|WARN)'\s*:\s*'(FAIL|WARN)'\s*,\s*'([a-zA-Z0-9_-]+)'/g;
  for (const m of src.matchAll(re2)) out.push({ lv: m[1], id: m[3], alt: m[2] });
  return out;
}

const S = staticRules(lint), D = dynamicRules(rules);
const sMap = new Map(S.map(r => [r.id, r.lv]));
const dMap = new Map();
for (const r of D) if (!dMap.has(r.id)) dMap.set(r.id, r.lv);

console.log('静态规则数:', S.length, ' 动态规则数:', D.length);
const both = [...sMap.keys()].filter(k => dMap.has(k));
console.log('\n=== 同名规则分级不一致 ===');
let n = 0;
for (const id of both) {
  if (sMap.get(id) !== dMap.get(id)) { console.log(`  ${id.padEnd(20)} static=${sMap.get(id)}  dynamic=${dMap.get(id)}`); n++; }
}
console.log('不一致数:', n);

console.log('\n=== 只在动态里(无静态 lint 覆盖) ===');
const dOnly = [...dMap.keys()].filter(k => !sMap.has(k));
console.log(dOnly.length, '条:', dOnly.join(' '));

console.log('\n=== 只在静态里 ===');
const sOnly = [...sMap.keys()].filter(k => !dMap.has(k));
console.log(sOnly.length, '条:', sOnly.join(' '));

// 2) lint 对 data.js 这类"数据文件"的判定
console.log('\n\n=== lint 扫 data.js（307KB 数据文件，内容全是描述别人 CSS 的文本）===');
try {
  const out = execFileSync(process.execPath,
    ['tools/taste-skill/skills/taste-skill/scripts/lint.mjs', 'prototypes/_selection/data.js'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  console.log(out.split('\n').slice(0, 30).join('\n'));
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  const lines = out.split('\n');
  console.log('exit=', e.status);
  // 只打印汇总行和规则标题行
  for (const l of lines) {
    if (/RESULT:|^\s*\[[a-z-]+\]/.test(l)) console.log(l);
  }
}

// 3) 全仓裸跑 lint 扫了多少文件
console.log('\n\n=== 裸跑 lint 的文件数 ===');
try {
  const out = execFileSync(process.execPath,
    ['tools/taste-skill/skills/taste-skill/scripts/lint.mjs'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const m = /LINT\s+(\d+)\s+file/.exec(out);
  console.log('扫描文件数:', m ? m[1] : '?');
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  const m = /LINT\s+(\d+)\s+file/.exec(out);
  console.log('扫描文件数:', m ? m[1] : '?', ' exit=', e.status);
}
