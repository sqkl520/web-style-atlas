#!/usr/bin/env node
// Lead 独立核实 v4：修正 v3 的语境分类 bug
// v3 的错：把 hex 前后各 90 字符都参与 NEG 判定，于是后文「反的是 #6366F1」误伤了前面的正向声明。
// v4 判据：字段3 按 ；。 切段，含百分比且首色是 hex 的段 = 调色板声明（这是规格文件的固定写法）。
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

function field3(md) {
  const lines = md.split(/\r?\n/);
  const out = []; let on = false;
  for (const l of lines) {
    const t = l.trim();
    if (/^\*{0,2}3[\.．]?\s*(配色系统|\*\*\s*配色系统)/.test(t) || /^\*{0,2}3\.\s*\*{0,2}配色系统/.test(t)) { on = true; continue; }
    if (on && /^\*{0,2}4[\.．]?\s/.test(t)) break;
    if (on) out.push(l);
  }
  return out.join('\n');
}

// 调色板声明段：含 % 且首个 hex 出现在段首附近
function declaredPalette(f3) {
  const segs = f3.split(/[；。]/);
  const out = [];
  for (const s of segs) {
    if (!/\d(?:\.\d)?\s*%/.test(s)) continue;
    const m = s.match(HEXT);
    if (!m) continue;
    // 首色必须在段的第一个 hex 位置且该 hex 前不超过 40 字符
    const first = norm(m[0]);
    const pos = s.indexOf(m[0]);
    if (pos > 40) continue;
    const pm = s.match(/(\d{1,2}(?:\.\d)?)\s*%/);
    out.push({ hex: first, pct: pm ? parseFloat(pm[1]) : null });
  }
  // 去重保序
  const seen = new Set(); const res = [];
  for (const o of out) { if (seen.has(o.hex)) continue; seen.add(o.hex); res.push(o); }
  return res;
}

console.log('=== v4：字段3 声明的调色板 vs dna-clean.palette ===\n');
const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const md = existsSync(join(SPECS, id + '.md')) ? readFileSync(join(SPECS, id + '.md'), 'utf8') : '';
  const decl = declaredPalette(field3(md));
  const e = dnaById.get(id) || {};
  const palSet = new Set(hexes((e.palette || []).join(' ')));
  const declSet = new Set(decl.map((x) => x.hex));
  const missing = [...declSet].filter((h) => !palSet.has(h));
  const extra = [...palSet].filter((h) => !declSet.has(h));
  rows.push({ id, decl, declSet, palSet, missing, extra });
  const pctSum = decl.reduce((a, x) => a + (x.pct || 0), 0);
  console.log(
    `${id}  声明=${String(declSet.size).padStart(2)}(Σ${String(Math.round(pctSum)).padStart(3)}%)  palette=${String(palSet.size).padStart(2)}  ` +
    `缺=${String(missing.length).padStart(2)} 多=${String(extra.length).padStart(2)}  ${missing.length ? '缺:' + missing.join(' ') : ''}  ${extra.length ? '多:' + extra.join(' ') : ''}`
  );
}

console.log(`\n【提示词缺了规格声明的色】${rows.filter((r) => r.missing.length).length} 案 / ${rows.reduce((a, r) => a + r.missing.length, 0)} 个`);
console.log(`【提示词多了规格没有的色】${rows.filter((r) => r.extra.length).length} 案 / ${rows.reduce((a, r) => a + r.extra.length, 0)} 个`);
console.log(`【完全一致】${rows.filter((r) => !r.missing.length && !r.extra.length).map((r) => r.id).join(' ') || '无'}`);
const noDecl = rows.filter((r) => !r.decl.length).map((r) => r.id);
console.log(`【字段3 解析不出声明】${noDecl.length} 案: ${noDecl.join(' ') || '无'}`);
