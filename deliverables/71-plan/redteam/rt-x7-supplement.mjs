/* 独立复核 ad69f20 的核心声称：「prompts 补的 53 个色里 52 个不在规格」。
 * 以及：这些补色在 style.css 里到底有没有角色注释（R5 只到 33/52）。
 *
 *   node deliverables/71-plan/redteam/rt-x7-supplement.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, ROOT, h1, h2 } from './rt-lib.mjs';

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const HEAD = git(['rev-parse', 'HEAD']).trim();
const show = (p) => git(['show', `${HEAD}:${p}`]);
const evalWin = (src) => { const w = {}; new Function('window', src)(w); return w; };

const data = evalWin(show('prototypes/_selection/data.js')).SCHEMES;
const prompts = evalWin(show('prototypes/_selection/prompts.js')).STYLE_PROMPTS.schemes;
const HEX = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEX)].map((m) => m[0].toUpperCase()))];

const dMap = new Map(data.map((s) => [s.id, (s.palette || []).map((h) => String(h).toUpperCase())]));
let supp = 0, notInSpec = 0, inSpec = 0;
const detail = [];
for (const s of prompts) {
  const pal = hexes((s.dna || {}).palette);
  const d = dMap.get(s.id) || [];
  const extra = pal.filter((h) => !d.includes(h));
  let spec = '';
  try { spec = readFileSync(join(P, '_specs', s.id + '.md'), 'utf8').toUpperCase(); } catch { spec = ''; }
  for (const h of extra) {
    supp++;
    const isIn = spec.includes(h);
    if (isIn) inSpec++; else notInSpec++;
    detail.push({ id: s.id, hex: h, inSpec: isIn });
  }
}

h1('独立复核：prompts 比 data.js 多的色，有多少在规格原文里出现过？');
console.log(`补色总数                     : ${supp}`);
console.log(`规格原文里出现过             : ${inSpec}`);
console.log(`规格原文里完全没出现         : ${notInSpec}`);
console.log(`⇒ ad69f20 声称「53 个里 52 个不在规格」；我实测 ${supp} 个里 ${notInSpec} 个不在规格。`);
if (inSpec) {
  console.log('在规格里出现过的补色：');
  for (const x of detail.filter((y) => y.inSpec)) console.log(`  ${x.id} ${x.hex}`);
}

/* 这些补色在 style.css 里有没有同行注释 */
h2('补色在 style.css 的 :root 声明行上有没有注释（R5 的口径）');
let withNote = 0, noNote = 0;
for (const x of detail) {
  const s = prompts.find((p) => p.id === x.id);
  let css = '';
  try { css = readFileSync(join(P, s.dir, 'style.css'), 'utf8'); } catch { continue; }
  const re = new RegExp('(--[\\w-]+)\\s*:\\s*' + x.hex + '\\s*;?\\s*(/\\*([^*]*)\\*/)?', 'i');
  const m = css.match(re);
  const note = m && m[3] ? m[3].trim() : '';
  if (note) withNote++; else noNote++;
}
console.log(`有同行注释 : ${withNote}`);
console.log(`无同行注释 : ${noNote}`);

h2('判定');
console.log(`补色里 ${notInSpec}/${supp} 不在规格 —— 支持「提示词补的是施工派生色，不是规格扩张」的叙事。`);
console.log(`但仍有 ${noNote} 个补色在 CSS 里没有任何角色注释 —— 这些无法从注释证明"必需"，`);
console.log('只能从"它在 :root 里"推断。这是 R5 只给 WARN 而不给 FAIL 的原因，也是这条闸门的天花板。');
