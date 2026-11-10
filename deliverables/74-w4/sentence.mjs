#!/usr/bin/env node
/* 74-w4 needsJS classifier — Step 2: does the MECHANISM SENTENCE need JS?
 * Machine test on the shipped dna.mechanism string (the thing the prompt copies).
 *
 * Three word classes, because "needs JS" and "describes motion" are not the
 * same question:
 *   MOTION   — a change over time or under the pointer. Static CSS cannot honour
 *              the sentence; it needs a driver (scroll/pointer/timer).
 *   MEASURE  — a dimension resolved against the viewport at runtime. CSS has
 *              100vh/100dvh for the common cases, so this is only *probably* JS.
 *              Kept separate so it can be promoted or demoted per scheme.
 *   STATIC   — a fixed arrangement. Pure CSS/SVG expresses it exactly.
 *
 * Ambiguous words are listed in AMBIG with the reason, and are reported rather
 * than silently counted either way.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';

// --- extract dna.mechanism out of the generated prompts.js -------------------
const src = fs.readFileSync(path.join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');
const mechanisms = {};
{
  const re = /"id":\s*"(S\d\d)"[\s\S]*?"mechanism":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    if (!mechanisms[m[1]]) mechanisms[m[1]] = JSON.parse('"' + m[2] + '"');
  }
}

/* MOTION: verb or temporal/state clause. Substring match on the raw sentence. */
const MOTION = [
  ['滚动', 'scroll-coupled'], ['滚程', 'scroll-coupled'],
  ['漂移', 'drift'], ['平漂', 'drift'],
  ['按下', 'press-state'], ['跟随', 'follow'], ['随焦距比移动', 'follow'],
  ['进视口', 'viewport-sequence'], ['视差', 'parallax'],
  ['时序', 'timing'], ['滑入', 'slide'], ['推挤', 'push'],
  ['移动', 'move'],
];
/* MEASURE: resolved against the live viewport. */
const MEASURE = [
  ['视口高', 'vh'], ['视口宽', 'vw'], ['视口', 'viewport-relative'],
];
/* STATIC: a fixed arrangement expressible exactly in CSS/SVG. */
const STATIC = [
  ['栏', 'column'], ['基线', 'baseline'], ['网格', 'grid'], ['坐标格', 'grid'],
  ['偏移', 'offset'], ['错位', 'misalign'], ['裁切', 'crop'], ['对齐', 'align'],
  ['间距', 'gap'], ['栏距', 'gutter'], ['出血', 'bleed'], ['线宽', 'stroke'],
  ['走线', 'stroke'], ['不透明', 'opacity'], ['斜', 'slant'], ['错开', 'stagger'],
  ['切角', 'cut'], ['相扣', 'interlock'], ['钉', 'bind'], ['折痕', 'crease'],
  ['中缝', 'seam'], ['分栏', 'columns'], ['行高', 'line-height'], ['字距', 'tracking'],
];
/* AMBIG: words that read as motion in isolation but are used as a static noun. */
const AMBIG = [
  { word: '相位', why: '相位 can mean a mirror/rotation phase computed once (static, CSS scaleX(-1)) or a scroll-mapped phase (motion). Resolve per scheme by reading the script.' },
  { word: '旋转', why: '旋转限 ±1.2° / 绕质心平漂 — a bounded static tilt vs an orbit. 平漂 in the same sentence decides it.' },
  { word: '绕', why: '绕中缝 = static 3D fold axis; 绕质心 = orbit. Needs the verb.' },
  { word: '转', why: 'character-level 转场/转向 vs 旋转. Too short to match safely.' },
  { word: '随', why: '随滚动 = motion; 随字号 = static. Needs the object.' },
];

const rows = [];
for (const id of Object.keys(mechanisms).sort()) {
  const t = mechanisms[id];
  const hit = (list) => [...new Set(list.filter(([w]) => t.includes(w)).map(([, tag]) => tag))];
  const motion = hit(MOTION), measure = hit(MEASURE), stat = hit(STATIC);
  const ambig = AMBIG.filter((a) => t.includes(a.word)).map((a) => a.word);
  rows.push({
    id, text: t, len: t.length,
    motion, measure, stat, ambig,
    // Literal verdict on the sentence alone. FINAL_LITERAL is resolved by hand
    // for the ambiguous ones and written back in resolve.mjs.
    literal: motion.length ? 'needs-JS' : 'static',
  });
}

fs.writeFileSync(path.join(ROOT, 'deliverables/74-w4/sentence.json'), JSON.stringify(rows, null, 2));
console.log('id   len  motion            measure        ambig     static');
for (const r of rows) {
  console.log(
    `${r.id} ${String(r.len).padStart(4)}  ${(r.motion.join(',') || '-').padEnd(17)} ` +
    `${(r.measure.join(',') || '-').padEnd(14)} ${(r.ambig.join(',') || '-').padEnd(9)} ${r.stat.join(',') || '-'}`);
}
