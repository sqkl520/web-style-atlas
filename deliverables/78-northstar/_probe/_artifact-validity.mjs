// 逐案判定：产物是否用上了该案 task.txt 里的具体数值
// 用法: node _artifact-validity.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(HERE, '_staged');

const CASES = ['S04','S08','S13','S15','S18','S21','S22','S29','S31','S32','S35','S97','S98','S99'];

function pickArtifact(id) {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`]) {
    const p = join(STAGED, n);
    if (existsSync(p)) return p;
  }
  return null;
}

function hexesOf(text) {
  const m = text.match(/^1\. 配色[^\n]*/m);
  if (!m) return [];
  return [...m[0].matchAll(/#[0-9A-Fa-f]{6}/g)].map(x => x[0].toUpperCase());
}

function ratioLine(text) {
  const m = text.match(/^6\. 字号[^\n]*/m);
  if (!m) return null;
  const line = m[0];
  const body = line.match(/正文(?:约|是)?\s*([0-9.]+)\s*px/);
  const ratio = line.match(/([0-9.]+)\s*倍/);
  const maxAbs = line.match(/约\s*([0-9.]+)\s*px/);
  return { line: line.slice(0, 120), body: body ? +body[1] : null, ratio: ratio ? +ratio[1] : null, maxAbs: maxAbs ? +maxAbs[1] : null };
}

function mechLine(text) {
  const m = text.match(/^这个风格的签名动作：[^\n]*/m);
  return m ? m[0] : null;
}

// 从机制句里抽出「数字+单位」的记号，作为该案可测值清单
function mechTokens(line) {
  if (!line) return [];
  const out = [];
  for (const m of line.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(px|%|°|倍|mm)/g)) out.push(m[1] + m[2]);
  // 裸数字（如 60/34/3 里没有单位的）单独收
  for (const m of line.matchAll(/每\s*([0-9]+)\s*px/g)) out.push(m[1] + 'px');
  return [...new Set(out)];
}

function fontSizes(html) {
  const sizes = [];
  for (const m of html.matchAll(/font-size\s*:\s*([^;}"'`]+)/g)) {
    const v = m[1].trim();
    for (const n of v.matchAll(/([0-9.]+)\s*(px|rem|em|vw|vh)/g)) sizes.push({ v: +n[1], u: n[2] });
    for (const n of v.matchAll(/clamp\(\s*([0-9.]+)(?:px|rem|em)?\s*,\s*([0-9.]+)(?:vw|vh|%)?\s*,\s*([0-9.]+)(px|rem|em)/g)) {
      sizes.push({ v: +n[1], u: n[4], clamp: 'min' }, { v: +n[3], u: n[4], clamp: 'max' });
    }
  }
  return sizes;
}

const rows = [];
for (const id of CASES) {
  const tf = join(BLIND, id, 'task.txt');
  const art = pickArtifact(id);
  const row = { id, artifact: art ? art.split(/[\\/]/).pop() : null };
  if (!existsSync(tf)) { row.note = 'no task.txt'; rows.push(row); continue; }
  const task = readFileSync(tf, 'utf8');
  row.palette = hexesOf(task);
  row.ratio = ratioLine(task);
  row.mech = mechTokens(mechLine(task));

  if (!art) { row.note = 'NO ARTIFACT'; rows.push(row); continue; }
  const html = readFileSync(art, 'utf8');
  row.bytes = Buffer.byteLength(html);
  row.closed = /<\/html>\s*$/i.test(html.trim());

  // 配色命中（大小写不敏感）
  const up = html.toUpperCase();
  row.paletteHits = row.palette.filter(h => up.includes(h));
  row.paletteMissing = row.palette.filter(h => !up.includes(h));

  // 字号
  const sizes = fontSizes(html);
  const base = sizes.filter(s => !s.clamp && s.u === 'px' && s.v >= 12 && s.v <= 24).map(s => s.v);
  const allPx = sizes.filter(s => s.u === 'px').map(s => s.v);
  const maxPx = allPx.length ? Math.max(...allPx) : null;
  row.baseCandidates = [...new Set(base)].sort((a,b)=>a-b);
  row.maxPx = maxPx;
  row.actualRatio = (maxPx && row.ratio && row.ratio.body) ? +(maxPx / row.ratio.body).toFixed(2) : null;

  // 机制值命中：机制句里的每个记号是否在产物里出现（带单位的原样）
  row.mechHits = row.mech.filter(t => html.includes(t));
  row.mechMissing = row.mech.filter(t => !html.includes(t));

  rows.push(row);
}

for (const r of rows) {
  console.log('\n========== ' + r.id + ' ==========');
  if (r.note) { console.log('  ' + r.note); continue; }
  console.log(`  产物: ${r.artifact}  ${r.bytes} B  闭合=${r.closed}`);
  console.log(`  配色: ${r.palette.length} 个 -> 命中 ${r.paletteHits.length}/${r.palette.length}` +
    (r.paletteMissing.length ? `  缺 [${r.paletteMissing.join(' ')}]` : ''));
  console.log(`  字号: 提示正文 ${r.ratio?.body}px 倍率 ${r.ratio?.ratio} (约${r.ratio?.maxAbs}px)` +
    ` | 产物最大 ${r.maxPx}px 实测比 ${r.actualRatio}`);
  console.log(`  正文候选: [${r.baseCandidates.join(', ')}]`);
  console.log(`  机制值: ${r.mech.length} 个 ${JSON.stringify(r.mech)}`);
  console.log(`    命中 ${r.mechHits.length}/${r.mech.length} ${JSON.stringify(r.mechHits)}` +
    (r.mechMissing.length ? `  缺 ${JSON.stringify(r.mechMissing)}` : ''));
}
