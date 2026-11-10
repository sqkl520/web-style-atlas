/* 共享字段矩阵（HEAD 锚定）—— 同时检查「这个字段在两边都存在吗」。
 *
 * 这一步是必要的自我纠错：Lead 的表格把 bg 记成「0 案不一致 ✓」，
 * 但如果 prompts.js 根本没有 bg 字段，那个 ✓ 不是「两边一致」，是**没法比**。
 * 空对空不能算一致。
 *
 *   node deliverables/71-plan/redteam/rt-fields.mjs
 */
import { execFileSync } from 'node:child_process';
import { h1, h2, ROOT } from './rt-lib.mjs';

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const HEAD = git(['rev-parse', 'HEAD']).trim();
const show = (p) => git(['show', `${HEAD}:${p}`]);
const evalWin = (src) => { const w = {}; new Function('window', src)(w); return w; };

const data = evalWin(show('prototypes/_selection/data.js')).SCHEMES;
const prompts = evalWin(show('prototypes/_selection/prompts.js')).STYLE_PROMPTS.schemes;
const dnaClean = JSON.parse(show('prototypes/_prompts/dna-clean.json'));
const dnaRaw = JSON.parse(show('prototypes/_prompts/dna-raw.json'));

const dataKeys = new Set(data.flatMap((s) => Object.keys(s)));
const promTopKeys = new Set(prompts.flatMap((s) => Object.keys(s)));
const dnaKeys = new Set(prompts.flatMap((s) => Object.keys(s.dna || {})));
const cleanKeys = new Set(dnaClean.flatMap((s) => Object.keys(s)));

h1('四层数据各自的键');
console.log('data.js 顶层     :', [...dataKeys].sort().join(' '));
console.log('prompts.js 顶层  :', [...promTopKeys].sort().join(' '));
console.log('prompts.dna      :', [...dnaKeys].sort().join(' '));
console.log('dna-clean.json   :', [...cleanKeys].sort().join(' '));

h1('Lead 表格里的 5 个「共享字段」逐个核验');
const probe = [
  { f: 'palette', inData: 'palette', inProm: 'dna.palette' },
  { f: 'primary', inData: 'primary', inProm: 'dna.primary' },
  { f: 'fonts', inData: 'fonts', inProm: 'dna.fonts' },
  { f: 'bg', inData: 'bg', inProm: 'dna.bg' },
  { f: 'minItems', inData: 'minItems', inProm: 'minItems' },
];
for (const p of probe) {
  const dHas = dataKeys.has(p.inData);
  const pHas = dnaKeys.has(p.inProm.replace('dna.', '')) || promTopKeys.has(p.inProm);
  console.log(`\n${p.f}`);
  console.log(`  data.js 有 ${p.inData}?        ${dHas ? 'YES' : 'NO'}`);
  console.log(`  prompts 有 ${p.inProm}?   ${pHas ? 'YES' : 'NO'}`);
  if (!dHas || !pHas) console.log('  ⇒ 这一行**无法比较**：一边不存在该字段。"0 案不一致"不等于"两边一致"。');
}

/* dna-clean 的 primary 是数组；data.js 的 primary 是单值 */
h2('primary 的真实关系：data.primary vs dna-clean.primary[0]');
let eq = 0, ne = 0; const ex = [];
for (const d of data) {
  const c = dnaClean.find((x) => x.id === d.id) || {};
  const pv = c.primary || [];
  const p0 = (Array.isArray(pv) ? pv[0] : pv) || '';
  if (String(d.primary || '').toUpperCase() === String(p0).toUpperCase()) eq++;
  else { ne++; if (ex.length < 8) ex.push(`${d.id}  data=${d.primary}  dna-clean.primary[0]=${p0 || '(空)'}`); }
}
console.log(`一致 ${eq}/30，不一致 ${ne}/30`);
for (const e of ex) console.log('   ' + e);

h2('minItems：两边都有，实测比较');
let miDiff = 0; const miEx = [];
for (const d of data) {
  const p = prompts.find((x) => x.id === d.id) || {};
  if (Number(d.minItems) !== Number(p.minItems)) { miDiff++; if (miEx.length < 6) miEx.push(`${d.id} data=${d.minItems} prom=${p.minItems}`); }
}
console.log(`不一致 ${miDiff}/30`);
for (const e of miEx) console.log('   ' + e);

h1('判定：Lead 表格的可靠性');
console.log('真正「两边都存在、且可比」的字段只有：palette / fonts / minItems（3 个）。');
console.log('primary：data.js 有、prompts.js 没有 ⇒ Lead 说的「9/30 分歧」需要说明是跟 dna-clean 比。');
console.log('bg    ：只有 data.js 有 ⇒ Lead 的「0 ✓ 因为两边同一条正则」是**错的归因**，实际是空对空。');
