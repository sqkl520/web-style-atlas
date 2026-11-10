#!/usr/bin/env node
// Lead 独立核实 v3：palette 里每个色在规格文件中的上下文分类
// 关键：区分「正向声明」与「负向示例」（反的是 / 修正前 / 不采用 / 只有...:1 对比度不够）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SPECS = join(ROOT, 'prototypes/_specs');
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const dnaArr = Array.isArray(dna) ? dna : Object.values(dna);
const dnaById = new Map(dnaArr.map((e) => [e.id, e]));

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

// 负向语境关键词：这些词出现在 hex 附近 → 不是调色板成员
const NEG = /(反的?是|反\s*`?$|修正前|不采用|不采|硬失败|不是|禁止|不要|不用|只有|仅|相差|距|避免|规避|反「|反\"|不参与|不作|不再|已换掉|旧值|替代)/;

function classify(md, hex) {
  const idxs = [];
  let i = -1;
  const low = md.toLowerCase();
  while ((i = low.indexOf(hex, i + 1)) >= 0) idxs.push(i);
  if (!idxs.length) return { n: 0, verdict: 'ABSENT' };
  const ctxs = idxs.map((p) => {
    const before = md.slice(Math.max(0, p - 90), p);
    const after = md.slice(p + hex.length, p + hex.length + 90);
    return { before, after, neg: NEG.test(before) || NEG.test(after) };
  });
  const posN = ctxs.filter((c) => !c.neg).length, negN = ctxs.filter((c) => c.neg).length;
  return { n: idxs.length, posN, negN, verdict: posN > 0 ? 'POSITIVE' : 'NEGATIVE-ONLY', ctxs };
}

// 面积占比：字段3 里 "#XXXXXX ... 22%" 这种
function pctOf(md, hex) {
  const low = md.toLowerCase();
  const i = low.indexOf(hex);
  if (i < 0) return null;
  const around = md.slice(Math.max(0, i - 100), i + 160);
  const m = around.match(/(\d{1,2}(?:\.\d)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

console.log('=== palette 每个色的语境判定（POSITIVE / NEGATIVE-ONLY / ABSENT）===\n');
const badPal = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const p = join(SPECS, id + '.md');
  const md = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const e = dnaById.get(id) || {};
  const palHexes = hexes((e.palette || []).join(' '));
  const lines = [];
  for (const h of palHexes) {
    const c = classify(md, h);
    lines.push(`${h}:${c.verdict === 'POSITIVE' ? 'P' : c.verdict === 'NEGATIVE-ONLY' ? 'N!' : 'X'}`);
    if (c.verdict === 'NEGATIVE-ONLY') badPal.push({ id, hex: h, ctx: c.ctxs.find((x) => x.neg) });
  }
  console.log(`${id} (${palHexes.length}) ${lines.join(' ')}`);
}

console.log('\n=== 【重要】palette 里只出现在负向语境的色 ===');
if (!badPal.length) console.log('  无');
for (const b of badPal) {
  console.log(`  ${b.id} ${b.hex}`);
  console.log(`      ...${b.ctx.before.replace(/\s+/g, ' ')}【${b.hex}】${b.ctx.after.replace(/\s+/g, ' ')}...`);
}
