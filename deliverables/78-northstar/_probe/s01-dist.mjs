#!/usr/bin/env node
/* s01 —— 全库分布：35 案在每个可测维度上到底长什么样。
 *
 * 只读三个文件，不读任何已有报告：
 *   prototypes/_selection/data.js            window.SCHEMES       （设计侧）
 *   prototypes/_selection/prompts.js         window.STYLE_PROMPTS （提示词侧）
 *   prototypes/_prompts/minitems-parsed.json 每案最少图片数
 *
 * 两条数据链刻意分开，本脚本**不合并**它们，只做交叉校验并记录不一致处。
 * 产物：s01-dataset.json（后续脚本复用，避免各脚本各算一遍）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');

function loadWindowVar(rel, name) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, rel), 'utf8'), ctx);
  if (!ctx.window[name]) throw new Error(`${rel} 没有定义 window.${name}`);
  return ctx.window[name];
}

const SCHEMES = loadWindowVar('prototypes/_selection/data.js', 'SCHEMES');
const PROMPTS = loadWindowVar('prototypes/_selection/prompts.js', 'STYLE_PROMPTS');
const PARSED = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/minitems-parsed.json'), 'utf8'));

const byId = (a) => Object.fromEntries(a.map((x) => [x.id, x]));
const D = byId(SCHEMES);
const P = byId(PROMPTS.schemes);
const Q = byId(PARSED);

/* ---- 拼一行：只放可测字段，不加任何诠释 ---- */
const rows = SCHEMES.map((s) => {
  const p = P[s.id] || {};
  const q = Q[s.id] || {};
  return {
    id: s.id,
    dir: s.dir,
    structure: s.structure,
    tone: s.tone,
    threshold: s.threshold,          // 设计侧自报门槛：低/中/高
    ground: s.axes.ground,
    band: s.axes.band,
    load: s.axes.load,
    loud: s.axes.loud,
    chroma: s.axes.chroma,           // 0–100 实测彩度
    words: s.axes.words,             // 正文实测字数
    groundL: s.axes.groundL,
    bandL: s.axes.bandL,
    bandSat: s.axes.bandSat,
    minPics: q.minPics,              // 最少图片数（minitems-parsed 口径）
    minPicsPrompt: p.minPics,        // 提示词里真正写给用户的那个数（prompt-copy 读它）
    minPicsCapacity: p.capacity ? p.capacity.minPics : undefined,
    minItems: q.minItems,
    degrades: q.degrades,
    hard: p.hard === true,           // 提示词侧 hardIds 标注
    gateFail: s.gate.fail,
    gateWarn: s.gate.warn,
    gateFailIds: s.gate.failIds,
    screens: s.gate.screens,
    realPictures: s.gate.realPictures,
    built: s.built,
    scenes: p.scenes || [],
  };
});

const ids = rows.map((r) => r.id);

/* ---- 通用计数表 ---- */
function tally(keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r.id);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0])));
}
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - [...String(s)].length * (String(s).match(/[^\x00-\xff]/) ? 0 : 0)));
function table(title, entries, total) {
  console.log(`\n## ${title}`);
  for (const [k, v] of entries) {
    const pct = ((v.length / total) * 100).toFixed(1).padStart(5);
    console.log(`  ${String(k).padEnd(14)} ${String(v.length).padStart(2)}  ${pct}%  ${v.join(' ')}`);
  }
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

console.log('s01 —— 全库分布（35 案的实测形状）');
console.log('='.repeat(78));
console.log(`data.js SCHEMES        : ${SCHEMES.length} 案   built=true ${rows.filter((r) => r.built).length} 案`);
console.log(`prompts.js schemes     : ${PROMPTS.schemes.length} 案   hardIds ${JSON.stringify(PROMPTS.hardIds)}`);
console.log(`minitems-parsed        : ${PARSED.length} 条`);
console.log(`data.js 独有字段       : ${Object.keys(SCHEMES[0]).join(', ')}`);

table('structure 骨架标签（去重后 ' + new Set(rows.map((r) => r.structure)).size + ' 个）', tally((r) => r.structure), rows.length);
table('tone 调性（去重后 ' + new Set(rows.map((r) => r.tone)).size + ' 个）', tally((r) => r.tone), rows.length);
table('threshold 设计侧自报门槛', tally((r) => r.threshold), rows.length);
table('ground 底色', tally((r) => r.ground), rows.length);
table('band 色带', tally((r) => r.band), rows.length);
table('load 信息负荷', tally((r) => r.load), rows.length);
table('loud 听觉转译', tally((r) => r.loud), rows.length);

const chroma = rows.map((r) => r.chroma);
console.log('\n## chroma（实测彩度 0–100）');
console.log(`   min ${Math.min(...chroma)}  max ${Math.max(...chroma)}  mean ${mean(chroma).toFixed(2)}  median ${median(chroma)}`);
const bins = [[0, 19], [20, 39], [40, 59], [60, 79], [80, 100]];
for (const [lo, hi] of bins) {
  const v = rows.filter((r) => r.chroma >= lo && r.chroma <= hi);
  console.log(`   ${String(lo).padStart(3)}–${String(hi).padEnd(3)}  ${String(v.length).padStart(2)}  ${v.map((r) => r.id + ':' + r.chroma).join(' ')}`);
}
const sortedChroma = [...rows].sort((a, b) => a.chroma - b.chroma);
console.log('   升序全列: ' + sortedChroma.map((r) => `${r.id}=${r.chroma}`).join(' '));
console.log('   相邻差值（找自然断点）:');
const gaps = [];
for (let i = 1; i < sortedChroma.length; i++) gaps.push({ lo: sortedChroma[i - 1], hi: sortedChroma[i], gap: sortedChroma[i].chroma - sortedChroma[i - 1].chroma });
for (const g of [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 6)) {
  console.log(`     ${g.gap.toString().padStart(3)} : ${g.lo.id}(${g.lo.chroma}) → ${g.hi.id}(${g.hi.chroma})`);
}

console.log('\n## words（正文实测字数）');
const words = rows.map((r) => r.words);
console.log(`   min ${Math.min(...words)}  max ${Math.max(...words)}  mean ${mean(words).toFixed(1)}  median ${median(words)}`);
for (const [lo, hi] of [[0, 199], [200, 399], [400, 599], [600, 799], [800, 1199]]) {
  const v = rows.filter((r) => r.words >= lo && r.words <= hi);
  console.log(`   ${String(lo).padStart(4)}–${String(hi).padEnd(4)}  ${String(v.length).padStart(2)}  ${v.map((r) => r.id + ':' + r.words).join(' ')}`);
}

console.log('\n## minPics（最少图片数，minitems-parsed 口径）');
for (const n of [...new Set(rows.map((r) => r.minPics))].sort((a, b) => a - b)) {
  const v = rows.filter((r) => r.minPics === n);
  console.log(`   ${String(n).padStart(2)} 张  ${String(v.length).padStart(2)}  ${v.map((r) => r.id).join(' ')}`);
}
console.log(`   min ${Math.min(...rows.map((r) => r.minPics))} max ${Math.max(...rows.map((r) => r.minPics))}`);

console.log('\n## gate（闸门）');
const fails = rows.filter((r) => r.gateFail > 0);
console.log(`   gate.fail > 0 的案：${fails.length} / ${rows.length}`);
for (const r of fails) console.log(`     ${r.id}  fail=${r.gateFail}  warn=${r.gateWarn}  ${r.gateFailIds.join(',')}`);
console.log(`   gate.fail = 0 的案：${rows.length - fails.length}`);
for (const r of rows.filter((r) => r.gateFail > 0)) {
  console.log(`     ${r.id} warnIds 未在 data.js 落盘（只存 warn 计数 ${r.gateWarn}），failIds 已落盘`);
}
const warnSum = rows.reduce((a, r) => a + r.gateWarn, 0);
console.log(`   gate.warn 合计 ${warnSum}，单案 min ${Math.min(...rows.map((r) => r.gateWarn))} max ${Math.max(...rows.map((r) => r.gateWarn))}`);

console.log('\n## Q2 新建（S31–S35）');
const q2 = rows.filter((r) => Number(r.id.slice(1)) >= 31);
for (const r of q2) console.log(`   ${r.id}  ${r.structure.padEnd(13)} chroma=${String(r.chroma).padStart(3)}  minPics=${r.minPics}  fail=${r.gateFail}  screens=${r.screens}  realPictures=${r.realPictures}`);
console.log(`   新旧对比：老 30 案 gate.fail>0 = ${rows.filter((r) => Number(r.id.slice(1)) < 31 && r.gateFail > 0).length} 案；新 5 案 = ${q2.filter((r) => r.gateFail > 0).length} 案`);
console.log(`   老 30 案 minPics 最小 ${Math.min(...rows.filter((r) => Number(r.id.slice(1)) < 31).map((r) => r.minPics))}；新 5 案最大 ${Math.max(...q2.map((r) => r.minPics))}`);

console.log('\n## 两条链的交叉校验（不合并，只记录差异）');
let mism = 0;
for (const r of rows) {
  if (r.minPics !== r.minPicsCapacity) {
    console.log(`   !! ${r.id} minitems-parsed.minPics=${r.minPics}  但 prompts.capacity.minPics=${r.minPicsCapacity}`);
    mism++;
  }
  if (r.minPicsPrompt !== r.minPics) {
    console.log(`   !! ${r.id} 提示词实际写给用户的 minPics=${r.minPicsPrompt}  而 parsed=${r.minPics}  capacity=${r.minPicsCapacity}`);
  }
}
console.log(`   parsed 与 capacity 不一致：${mism} 案`);
console.log(`   新 5 案 scenes 为空：${q2.filter((r) => r.scenes.length === 0).length} / 5  —— 提示词侧没有场景映射`);

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), JSON.stringify(rows, null, 1));
console.log('\n→ s01-dataset.json 已写');
