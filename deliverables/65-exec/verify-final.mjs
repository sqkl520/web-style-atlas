// 交付前总校验：跑一次，把报告要的全部数字以原始 stdout 打出来。
// 用法：node deliverables/65-exec/verify-final.mjs
//
// before = 本轮动手前的 data.js（deliverables/65-exec/data.before.js）
// after  = 现在的 prototypes/_selection/data.js
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const A = load('deliverables/65-exec/data.before.js');
const B = load('prototypes/_selection/data.js');

console.log('=== [1] audit 字段（任务 1）===');
const aLen = B.map((r) => (r.audit || '').length);
console.log('  audit 非空：' + B.filter((r) => r.audit && r.audit.length).length + '/30');
console.log('  audit 总字数：' + aLen.reduce((x, y) => x + y, 0));
console.log('  最短 ' + Math.min(...aLen) + ' / 中位 ' + aLen.slice().sort((x, y) => x - y)[15] + ' / 最长 ' + Math.max(...aLen));
console.log('  改前 data.js 里 "audit" 键数：' + A.filter((r) => 'audit' in r).length + '/30');
console.log('  改前 prompts.js 里 "audit" 键数：' +
  (JSON.parse(readFileSync('deliverables/65-exec/prompts.before.js', 'utf8').replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/, '').replace(/;\s*$/, ''))
    .schemes.filter((s) => 'audit' in s || 'audit' in (s.dna || {})).length) + '/30');

console.log('\n=== [2] layout 字段（任务 3）===');
for (const id of ['S12', 'S15', 'S19']) {
  const a = A.find((r) => r.id === id).layout, b = B.find((r) => r.id === id).layout;
  console.log(`  ${id} 改前 ${a.length} 字 → 改后 ${b.length} 字｜尾部：…${b.slice(-42)}`);
}
console.log('  30 案 layout 非空：' + B.filter((r) => r.layout && r.layout.length).length + '/30');

console.log('\n=== [3] 逐案字节级对比（任务 3 的强制要求）===');
let same = 0; const diffs = [];
for (let i = 0; i < 30; i++) {
  const a = A[i], b = B[i];
  const ka = Object.keys(a).filter((k) => k !== 'audit');   // audit 是本轮**新增**的键，单独看
  const kb = Object.keys(b).filter((k) => k !== 'audit');
  const d = [];
  if (JSON.stringify(ka) !== JSON.stringify(kb)) d.push('键集/键序');
  for (const k of ka) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) d.push(k);
  if (d.length) diffs.push(a.id + ' → ' + d.join(',')); else same++;
}
console.log('  除新增 audit 外，逐字段 JSON 完全相同的案：' + same + '/30');
console.log('  有变化的案：' + (diffs.length ? diffs.join('；') : '（无）'));
console.log('  新增键 audit 的案：' + B.filter((r) => 'audit' in r).length + '/30（改前 0/30）');

console.log('\n=== [4] 机制句走的是哪条路（任务 2）===');
const PJ = JSON.parse(readFileSync('prototypes/_selection/prompts.js', 'utf8').replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/, '').replace(/;\s*$/, ''));
console.log('  data.js 里有 mechanism 字段的案：' + B.filter((r) => r.mechanism !== undefined).length + '/30');
console.log('  prompts.js 里有机制句的案：' + PJ.schemes.filter((s) => s.dna.mechanism && s.dna.mechanism.length).length + '/30');
console.log('  prompts.js 机制句总字数：' + PJ.schemes.reduce((a, s) => a + (s.dna.mechanism || '').length, 0));
let mechSame = 0;
for (const s of PJ.schemes) {
  const m = /^1-附（去掉名字之后的机制）[：:]\s*(.*)$/m.exec(readFileSync('prototypes/_specs/' + s.id + '.md', 'utf8'));
  if (m && m[1].trim() === (s.dna.mechanism || '').trim()) mechSame++;
}
console.log('  S01–S10：prompts.js 机制句与 md 的 1-附 逐字相同 ' + mechSame + '/10');
let has1fu = 0;
for (let i = 11; i <= 30; i++) if (/1-附/.test(readFileSync('prototypes/_specs/S' + i + '.md', 'utf8'))) has1fu++;
console.log('  S11–S30 的 md 里含 1-附 的案：' + has1fu + '/20（所以这 20 条只能来自 mechanisms.mjs）');

console.log('\n=== [5] primary / buttonText / scenesNo（任务 4）===');
const rgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (h) => { const c = rgb(h); if (!c) return null; const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (x, y) => { const p = lum(x), q = lum(y); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };

console.log('  primary === palette[0]：' + B.filter((r) => r.primary === r.palette[0]).length + '/30');
console.log('  primary === palette[1]：' + B.filter((r) => r.primary === r.palette[1]).length + '/30');
console.log('  primary === bg        ：' + B.filter((r) => r.primary === r.bg).length + '/30');
console.log('  palette[0] === bg     ：' + B.filter((r) => r.palette[0] === r.bg).length + '/30');
console.log('  primary 在本案 palette 内的：' + B.filter((r) => r.palette.includes(r.primary)).length + '/30');
const btn = {}; for (const r of B) if (r.buttonText) btn[r.buttonText] = (btn[r.buttonText] || 0) + 1;
console.log('  buttonText 分布：' + JSON.stringify(btn) + '（合计 ' + B.filter((r) => r.buttonText).length + '/30）');
const der = B.filter((r) => r.buttonText).filter((r) => (ratio(r.primary, '#FFFFFF') >= ratio(r.primary, '#111111') ? '#FFFFFF' : '#111111') === r.buttonText);
console.log('  用「主色对白/黑谁对比度高」一条规则就能推出的：' + der.length + '/17');
console.log('  buttonText 出现在本案 palette 里的：' + B.filter((r) => r.buttonText && r.palette.includes(r.buttonText)).length + '/30');
console.log('  scenesNo 非空：' + B.filter((r) => r.scenesNo).length + '/30；scenes 以 scenesNo 结尾：' + B.filter((r) => r.scenes && r.scenes.endsWith(r.scenesNo)).length + '/30');
console.log('  scenes === scenesYes+"不适合："+scenesNo：' + B.filter((r) => r.scenes === r.scenesYes + '不适合：' + r.scenesNo).length + '/30');
console.log('  scenesNo 总字数 ' + B.reduce((a, r) => a + r.scenesNo.length, 0) + ' ／ scenes 总字数 ' + B.reduce((a, r) => a + r.scenes.length, 0));
console.log('  scenesNo 里仍含「不适合」字样的：' + B.filter((r) => r.scenesNo.includes('不适合')).length + '/30（「也不适合…」从句，见报告）');

console.log('\n=== [6] 全字段非空统计（改后）===');
for (const k of ['def', 'family', 'fonts', 'layout', 'visuals', 'motion', 'audit', 'risk', 'landing', 'scenes', 'quirk', 'copy', 'scenesYes', 'scenesNo']) {
  const n = B.filter((r) => typeof r[k] === 'string' && r[k].length).length;
  const c = B.reduce((a, r) => a + (typeof r[k] === 'string' ? r[k].length : 0), 0);
  console.log('  ' + k.padEnd(10) + ' 非空 ' + String(n).padStart(2) + '/30   共 ' + c + ' 字');
}
