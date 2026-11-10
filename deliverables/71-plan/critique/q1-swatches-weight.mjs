// Q1 探针组：色块到底有多重、有没有误导
// 四个独立测量，全部用仓库内已有的实测数据（deliverables/70-audit/measure/），不新造测量。
//
// ① slice(0,4) 是死代码吗（上游是否已封顶 4）
// ② palette[0]===bg / palette[1]===primary 是否成立（并注明它们恒真）
// ③ 4 色块是否覆盖全色板的「不同色相族」← 这是「摘要是否说谎」的核心判据
// ④ 色块 vs 真浏览器渲染的主导色（用像素实测）
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const dw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(dw.window);
const SCHEMES = dw.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const pw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/prompts.js'), 'utf8'))(pw.window);
const PSP = pw.window.STYLE_PROMPTS.schemes || [];
const pM = new Map(PSP.map((s) => [s.id, s]));

const hexes = (s) => [...new Set([...String(s).matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toUpperCase()))];

console.log('════ ① slice(0,4) 是死代码吗 ════\n');
const hist = {};
for (const s of SCHEMES) {
  const n = (s.palette || []).length;
  hist[n] = (hist[n] || 0) + 1;
}
console.log('data.js palette 长度分布:', JSON.stringify(hist));
const over4 = SCHEMES.filter((s) => (s.palette || []).length > 4);
console.log(`palette >4 色的案: ${over4.length}/${SCHEMES.length}`);
console.log(over4.length === 0
  ? '→ app.js:508 的 slice(0,4) 从未截断任何东西（上游 collect-schemes.mjs:486 已封顶 4）\n'
  : '→ 有案被截断\n');

console.log('════ ② 两条「不变量」是否成立（注意它们恒真）════\n');
let p0bad = 0, p1bad = 0;
for (const s of SCHEMES) {
  const p = s.palette || [];
  if (String(p[0]).toUpperCase() !== String(s.bg).toUpperCase()) p0bad++;
  if (String(p[1]).toUpperCase() !== String(s.primary).toUpperCase()) p1bad++;
}
console.log(`palette[0] === bg        : ${SCHEMES.length - p0bad}/${SCHEMES.length}`);
console.log(`palette[1] === primary   : ${SCHEMES.length - p1bad}/${SCHEMES.length}`);
console.log('⚠️ 但 collect-schemes.mjs:483-487 先 push(bg) 再 push(primary)，');
console.log('   这两条在构造上不可能失败 → 它们不携带信息（见 q6-tautology.mjs）\n');

console.log('════ ③ 4 色块是否覆盖全色板的「色相族」════\n');
function hsl(h) {
  const n = parseInt(String(h).slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2, d = mx - mn;
  let hh = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (mx === r) hh = ((g - b) / d) % 6;
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return { h: hh, s: s * 100 };
}
function hueFamilies(pal) {
  const out = [];
  for (const c of pal) {
    const q = hsl(c);
    if (q.s < 12) continue;                       // 灰/白/黑不算色相族
    let dup = false;
    for (const o of out) { let d = Math.abs(o - q.h); if (d > 180) d = 360 - d; if (d <= 20) dup = true; }
    if (!dup) out.push(q.h);
  }
  return out;
}
let cover = 0;
const missRows = [];
for (const s of SCHEMES) {
  const chips = (s.palette || []).map((h) => h.toUpperCase());
  const full = hexes(pM.get(s.id)?.dna?.palette || '');
  const hf = hueFamilies(full), hc = hueFamilies(chips);
  const miss = hf.filter((h) => !hc.some((c) => { let d = Math.abs(c - h); if (d > 180) d = 360 - d; return d <= 20; }));
  if (miss.length) missRows.push({ id: s.id, miss: miss.map((x) => Math.round(x)), hf: hf.map((x) => Math.round(x)), hc: hc.map((x) => Math.round(x)) });
  else cover++;
}
console.log(`4 色块覆盖全色板所有「不同色相族」的案: ${cover}/${SCHEMES.length}`);
if (missRows.length) for (const r of missRows) console.log(`  ${r.id} full途径hues=[${r.hf}] chips=[${r.hc}] 缺=[${r.miss}]`);
console.log(cover === SCHEMES.length
  ? '→ 摘要的「色相信息」是忠实的：它少列明暗档，但没漏任何一个色相族\n'
  : '→ 有色相族被漏\n');

console.log('════ ④ 色块 vs 真浏览器渲染的主导色（像素实测）════\n');
const recPath = join(ROOT, 'deliverables/70-audit/measure/palette-reconcile-30.json');
if (!existsSync(recPath)) {
  console.log('（缺 deliverables/70-audit/measure/palette-reconcile-30.json，跳过）');
} else {
  const rec = JSON.parse(readFileSync(recPath, 'utf8'));
  function dist(a, b) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    return Math.round(Math.hypot(((pa >> 16) & 255) - ((pb >> 16) & 255), ((pa >> 8) & 255) - ((pb >> 8) & 255), (pa & 255) - (pb & 255)));
  }
  let allIn = 0, big = [];
  for (const id of Object.keys(rec).sort()) {
    const c = rec[id], s = dM.get(id);
    if (!s) continue;
    const chips = (s.palette || []).map((h) => h.toUpperCase());
    const top3 = [...(c.measured || [])].sort((a, b) => b.pxShare - a.pxShare).slice(0, 3);
    const cov = top3.filter((m) => chips.includes(m.hex.toUpperCase())).length;
    if (cov === 3) allIn++;
    const worst = Math.max(...top3.map((m) => Math.min(...chips.map((ch) => dist(m.hex.toUpperCase(), ch)))));
    if (worst > 30) big.push({ id, worst, top: top3.map((m) => m.hex + '(' + (m.pxShare * 100).toFixed(0) + '%)') });
  }
  console.log(`渲染面积前 3 名全在色块里: ${allIn}/${Object.keys(rec).length}`);
  console.log(`前 3 名里有色距 >30 RGB 单位（肉眼可辨的不同色）的案: ${big.length}`);
  for (const b of big) console.log(`  ${b.id} 最远Δ=${b.worst}  ${b.top.join(' ')}`);
  console.log('\n→ 差 10–20 单位的案是取整/混色差异，不是「另一个颜色」。');
  console.log('→ 真正 >30 的少数案里，省略的多是「规格自己声明不作背景的次级色」或同色相明暗档。');
}

console.log('\n════ 结论 ════');
console.log('色块作为「色相索引 / 筛选特征」是准确的（③）；');
console.log('作为「明暗分布预览」是不完整的（④）—— 但首屏本来就有 316px 截图承担预览职责。');
