/* 基线探针：所有数字都从 **HEAD 的 blob** 读，不从工作区读。
 *
 * 为什么必须这样：本报告写作期间（2026-10-30 03:10–03:16）有另一个 Agent 正在并发改写
 * prototypes/_prompts/clean-dna.mjs 、prototypes/_selection/prompts.js 、prototypes/_build/check-stale.mjs。
 * 工作区读数会随它每几秒变一次，不能当证据。
 * HEAD = dc71c32 是**不可变**的，所以「Lead 立项那一刻的事实」只能从 HEAD 复算。
 *
 *   node deliverables/71-plan/redteam/rt-head-baseline.mjs
 */
import { execFileSync } from 'node:child_process';
import { h1, h2, ROOT, sub, jaccard } from './rt-lib.mjs';

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const HEAD = git(['rev-parse', 'HEAD']).trim();
const show = (p) => git(['show', `${HEAD}:${p}`]);

function evalWin(src) { const w = {}; new Function('window', src)(w); return w; }

const data = evalWin(show('prototypes/_selection/data.js')).SCHEMES;
const prompts = evalWin(show('prototypes/_selection/prompts.js')).STYLE_PROMPTS.schemes;
const dnaClean = JSON.parse(show('prototypes/_prompts/dna-clean.json'));

const HEX = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEX)].map((m) => m[0].toUpperCase()))];

h1(`HEAD 基线（${HEAD.slice(0, 7)}）—— 不受并发写入影响`);
console.log(`data.js      ${data.length} 案`);
console.log(`prompts.js   ${prompts.length} 案`);
console.log(`dna-clean    ${dnaClean.length} 案`);

const dMap = new Map(data.map((s) => [s.id, (s.palette || []).map((h) => String(h).toUpperCase())]));
const pMap = new Map(prompts.map((s) => [s.id, hexes((s.dna || {}).palette)]));
const cMap = new Map(dnaClean.map((r) => [r.id, (r.palette || []).map((x) => String(x).split(/\s+/)[0].toUpperCase())]));

/* 链 B 内部一致性 */
let inner = 0;
for (const [id, p] of pMap) if (JSON.stringify(p) !== JSON.stringify(cMap.get(id))) inner++;
h2('链 B 内部：prompts.js === dna-clean.json');
console.log(`一致 ${30 - inner}/30`);

/* P1 主体 */
h1('P1 · palette 子集关系（HEAD）');
let notSubset = 0, setDiff = 0, orderDiff = 0, onlyD = 0, onlyP = 0;
const bad = [];
for (const s of data) {
  const d = dMap.get(s.id) || [];
  const p = pMap.get(s.id) || [];
  const od = sub(d, p); const op = sub(p, d);
  onlyD += od.length; onlyP += op.length;
  if (od.length) { notSubset++; bad.push({ id: s.id, d, p, od }); }
  if (od.length || op.length) setDiff++;
  if (JSON.stringify(d) !== JSON.stringify(p)) orderDiff++;
}
console.log(`集合不一致              ${setDiff}/30`);
console.log(`顺序不一致              ${orderDiff}/30`);
console.log(`data.js ⊄ prompts.js     ${notSubset}/30   ← P1 判决点`);
console.log(`data.js 独有 hex 合计    ${onlyD}`);
console.log(`prompts 独有 hex 合计    ${onlyP}`);
if (bad.length) for (const x of bad) console.log(`  ${x.id}  独有: ${x.od.join(' ')}\n     data=[${x.d.join(' ')}]\n     prom=[${x.p.join(' ')}]`);
const avgJ = data.reduce((a, s) => a + jaccard(dMap.get(s.id) || [], pMap.get(s.id) || []), 0) / data.length;
console.log(`平均 Jaccard            ${avgJ.toFixed(3)}`);

h2('长度与顺序语义');
const dist = (a) => a.reduce((x, c) => (x[c] = (x[c] || 0) + 1, x), {});
console.log('data.js 长度分布 ' + JSON.stringify(dist([...dMap.values()].map((v) => v.length))));
console.log('prompts 长度分布 ' + JSON.stringify(dist([...pMap.values()].map((v) => v.length))));
console.log(`data.js palette[0] === bg : ${data.filter((s) => String((s.palette || [])[0] || '').toUpperCase() === String(s.bg || '').toUpperCase()).length}/30`);
let p0bg = 0;
for (const s of data) { const p0 = (pMap.get(s.id) || [])[0]; if (p0 && p0 === String(s.bg || '').toUpperCase()) p0bg++; }
console.log(`prompts palette[0] === bg : ${p0bg}/30`);
let p0same = 0;
for (const s of data) if ((dMap.get(s.id) || [])[0] === (pMap.get(s.id) || [])[0]) p0same++;
console.log(`两链 palette[0] 相同      : ${p0same}/30`);

/* 其余共享字段 */
h1('其他共享字段（HEAD）');
let primDiff = 0; const primEx = [];
for (const s of prompts) {
  const d = data.find((x) => x.id === s.id) || {};
  const pv = (s.dna && s.dna.primary) || [];
  const pArr = Array.isArray(pv) ? pv : [pv];
  const pStr = pArr.join(',');
  const dStr = String(d.primary || '');
  if (pStr && dStr && pStr.toUpperCase() !== dStr.toUpperCase()) { primDiff++; if (primEx.length < 6) primEx.push(`${s.id} data=${dStr} prom=${pStr}`); }
}
console.log(`primary 不一致        ${primDiff}/30`);
for (const e of primEx) console.log('   ' + e);

let fontsShape = 0;
for (const s of prompts) {
  const d = data.find((x) => x.id === s.id) || {};
  if (typeof (s.dna || {}).fonts === 'object' && typeof d.fonts === 'string') fontsShape++;
}
console.log(`fonts 类型不同        ${fontsShape}/30（data.js=字符串，prompts=对象）`);

const bgDiff = data.filter((s) => {
  const p = prompts.find((x) => x.id === s.id) || {};
  return String(s.bg || '').toUpperCase() !== String((p.dna || {}).bg || '').toUpperCase();
}).length;
console.log(`bg 不一致             ${bgDiff}/30`);

h2('结论锚点');
console.log(`本文件所有数字都可由一条命令重跑：node deliverables/71-plan/redteam/rt-head-baseline.mjs`);
console.log(`它读 git show ${HEAD.slice(0, 7)}:<path>，与工作区当前状态无关。`);
