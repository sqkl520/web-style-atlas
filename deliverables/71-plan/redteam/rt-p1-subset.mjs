/* P1 攻击：data.js 的 palette 集合是不是 prompts.js 的子集？
 *
 * 判定意义（Lead 的预设）：
 *   若 30/30 都是子集 → 两条链是「同一件事，只是截断」 → 「合并」在语义上可成立
 *   若存在 data.js 有、prompts.js 没有的色 → 两条链不是同一件事，方案的前提要改
 *
 * 另外一个必须先证的事：prompts.js 的 palette 来源是 dna-clean.json（经 build-prompts），
 * 而 dna-clean.json 由 clean-dna.mjs 无条件覆写。为了只读复算，本探针**复刻** pickPalette，
 * 并逐案比对 dna-clean.json 里已 tracked 的 palette —— 复刻不忠实则下面的数字全部作废。
 *
 *   node deliverables/71-plan/redteam/rt-p1-subset.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, P, loadData, loadPrompts, loadDnaClean, loadDnaRaw,
  hexes6, sub, jaccard, h1, h2, setOf,
} from './rt-lib.mjs';

const data = loadData();
const prompts = loadPrompts();
const dnaClean = loadDnaClean();
const dnaRaw = loadDnaRaw();

/* ───────────── 0. 三条产物的规模 ───────────── */
h1('0. 产物规模');
console.log(`data.js SCHEMES        ${data.length}`);
console.log(`prompts.js schemes     ${prompts.length}`);
console.log(`dna-clean.json rows    ${dnaClean.length}`);
console.log(`dna-raw.json rows      ${dnaRaw.rows.length}`);

/* ───────────── 1. 复刻 pickPalette（clean-dna.mjs:996-1051） ───────────── */
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

function rootDecls(rawCss) {
  const out = [];
  const blocks = [...rawCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
  for (const block of blocks) {
    const re = /\/\*([\s\S]*?)\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;
    let m; let pending = '';
    while ((m = re.exec(block))) {
      if (m[1] !== undefined) { pending = m[1]; continue; }
      const name = m[2]; const value = String(m[3]).trim();
      const hex = (value.match(/#[0-9A-Fa-f]{6}\b/) || [null])[0];
      out.push({ name, value, note: pending, hex: hex ? hex.toUpperCase() : null });
      pending = '';
    }
  }
  return out;
}
const HEX_IN = /#([0-9A-Fa-f]{6})\b/g;
function prosePrimaries(rawCss) {
  // 文件头注释里「主色 #XXXXXX」/「#XXXXXX 主色」
  const res = [];
  for (const m of stripComments('#').matchAll(/x/g)) { /* noop 保持形状 */ break; }
  const comments = [...rawCss.matchAll(/\/\*([\s\S]*?)\*\//g)].map((x) => x[1]);
  for (const c of comments) {
    for (const h of c.matchAll(HEX_IN)) {
      const around = c.slice(Math.max(0, h.index - 12), h.index + 7 + 12);
      if (/主色|强调/.test(around)) res.push(h[0].toUpperCase());
    }
  }
  return res;
}

function pickPalette(decls, rowColors, rawCss) {
  const MAX = 7;
  const rootHexes = rowColors.map((c) => c.hex.toUpperCase());
  const primary = [];
  const addPrimary = (hex) => {
    const h = (hex || '').toUpperCase();
    if (h && primary.indexOf(h) < 0 && rootHexes.indexOf(h) >= 0) primary.push(h);
  };
  const NON_PRIMARY_NOTE = /字色|底色|地面色|白字|压到|压深|次级/;
  for (const d of decls) {
    if (!d.hex) continue;
    if (!/主色|强调|primary|accent/i.test(d.note)) continue;
    if (NON_PRIMARY_NOTE.test(d.note)) continue;
    addPrimary(d.hex);
  }
  for (const d of decls) {
    if (d.hex && /(primary|accent)/i.test(d.name)) addPrimary(d.hex);
    if (d.hex && /^--(green|grape)$/i.test(d.name)) addPrimary(d.hex);
  }
  for (const hex of prosePrimaries(rawCss)) addPrimary(hex);

  const chosen = []; const seen = new Set();
  const push = (c) => {
    const hex = c.hex.toUpperCase();
    if (seen.has(hex)) return;
    seen.add(hex); chosen.push({ hex, name: String(c.name || '').replace(/^--/, '') });
  };
  for (const hex of primary) {
    const c = rowColors.find((x) => x.hex.toUpperCase() === hex);
    if (c) push(c);
  }
  for (const c of rowColors) { if (chosen.length >= MAX) break; push(c); }
  return { list: chosen, primary };
}

/* ───────────── 2. 复刻保真度：与 tracked dna-clean.json 逐案比 ───────────── */
h1('2. pickPalette 复刻保真度（否则下面所有数字作废）');
const rawById = new Map(dnaRaw.rows.map((r) => [r.id, r]));
const cleanById = new Map(dnaClean.map((r) => [r.id, r]));
let fidBad = 0;
const fidRows = [];
for (const r of dnaRaw.rows) {
  const rawCss = readFileSync(join(P, r.dir, 'style.css'), 'utf8');
  const decls = rootDecls(rawCss);
  const mine = pickPalette(decls, r.colors || [], rawCss).list.map((c) => c.hex);
  const theirsStr = (cleanById.get(r.id) || {}).palette || [];
  const theirs = theirsStr.map((s) => String(s).split(/\s+/)[0].toUpperCase());
  const same = JSON.stringify(mine) === JSON.stringify(theirs);
  if (!same) { fidBad++; fidRows.push({ id: r.id, mine, theirs }); }
}
console.log(`逐案完全一致（含顺序）：${30 - fidBad}/30`);
if (fidBad) {
  console.log('复刻不忠实的案（本探针的后续数字需打折）：');
  for (const r of fidRows) {
    console.log(`  ${r.id}\n    mine  : ${r.mine.join(' ')}\n    theirs: ${r.theirs.join(' ')}`);
  }
} else {
  console.log('✓ 复刻与 tracked dna-clean.json 逐案逐序一致 —— 后续推论可复算');
}

/* ───────────── 3. 主体：palette 子集关系 ───────────── */
h1('3. data.js palette ⊆ prompts.js palette ?');
const dMap = new Map(data.map((s) => [s.id, setOf(s.palette || [])]));
const pMap = new Map();
for (const s of prompts) {
  const raw = s.dna?.palette;
  const arr = Array.isArray(raw) ? raw : String(raw || '').split(/[\n,]/);
  pMap.set(s.id, setOf(arr.flatMap((x) => hexes6(x))));
}

const rows = [];
for (const s of data) {
  const d = dMap.get(s.id) || [];
  const p = pMap.get(s.id) || [];
  const onlyD = sub(d, p);   // data.js 有、prompts 没有
  const onlyP = sub(p, d);
  rows.push({ id: s.id, d, p, onlyD, onlyP, sameSet: onlyD.length === 0 && onlyP.length === 0, sameOrder: JSON.stringify(d) === JSON.stringify(p) });
}

console.log('案    |d| |p|  data.js 有/提示词无     提示词有/data.js 无      集合同  顺序同');
console.log('─'.repeat(100));
for (const r of rows) {
  console.log(
    r.id + '  ' + String(r.d.length).padStart(2) + '  ' + String(r.p.length).padStart(2) + '  ' +
    (r.onlyD.join(',') || '—').padEnd(24) + ' ' +
    (r.onlyP.join(',') || '—').padEnd(24) + ' ' +
    (r.sameSet ? ' ✓ ' : ' ✗ ') + '   ' + (r.sameOrder ? '✓' : '✗')
  );
}

const notSubset = rows.filter((r) => r.onlyD.length > 0);
const setDiff = rows.filter((r) => !r.sameSet);
const orderDiff = rows.filter((r) => !r.sameOrder);
const totalOnlyD = rows.reduce((a, r) => a + r.onlyD.length, 0);
const totalOnlyP = rows.reduce((a, r) => a + r.onlyP.length, 0);

h2('汇总');
console.log(`集合不一致的案            : ${setDiff.length}/30`);
console.log(`顺序不一致的案            : ${orderDiff.length}/30`);
console.log(`data.js ⊄ prompts.js 的案  : ${notSubset.length}/30   ← P1 的判决点`);
console.log(`  data.js 独有 hex 总数    : ${totalOnlyD}`);
console.log(`  prompts.js 独有 hex 总数 : ${totalOnlyP}`);
const avgJ = rows.reduce((a, r) => a + jaccard(r.d, r.p), 0) / rows.length;
console.log(`平均 Jaccard              : ${avgJ.toFixed(3)}`);

h2('长度分布');
const dist = (arr) => arr.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
console.log('data.js  palette 长度 : ' + JSON.stringify(dist(rows.map((r) => r.d.length))));
console.log('prompts  palette 长度 : ' + JSON.stringify(dist(rows.map((r) => r.p.length))));
console.log('data.js 最大长度      : ' + Math.max(...rows.map((r) => r.d.length)));
console.log('prompts 最大长度      : ' + Math.max(...rows.map((r) => r.p.length)));
console.log(`data.js 长度 >4 的案  : ${rows.filter((r) => r.d.length > 4).length}/30`);

h2('P1 判定');
if (notSubset.length === 0) {
  console.log('data.js ⊆ prompts.js 在 30/30 成立 → 「同一件事，只是截断」可成立。');
} else {
  console.log(`data.js 有 ${notSubset.length} 个案含 prompts.js 没有的色 → 两条链不是「同一事实的两种截断」。`);
  console.log('这不是"少画几个色"，而是"画了提示词里根本不存在的色"。逐条列证据：');
  for (const r of notSubset) console.log(`  ${r.id}: data.js=[${r.d.join(' ')}]  提示词=[${r.p.join(' ')}]`);
}
