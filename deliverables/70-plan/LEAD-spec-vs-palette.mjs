#!/usr/bin/env node
// Lead 独立核实：规格文件 Sxx.md 里写了几种颜色？vs dna-clean.json 的 palette
// 判定：集合外色在规格里有 → 提示词抽漏（改抽取逻辑）；规格里没有 → 原型超纲（改原型）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SPECS = join(ROOT, 'prototypes/_specs');
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const dnaArr = Array.isArray(dna) ? dna : Object.values(dna);
const dnaById = new Map(dnaArr.map((e) => [e.id, e]));

const HEXT = /\b#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const norm = (h) => {
  h = h.toLowerCase();
  if (h.length === 4) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h;
};

console.log('=== 每案：规格里的 hex 数 vs dna-clean.palette 的 hex 数 ===\n');
const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const specPath = join(SPECS, id + '.md');
  const spec = existsSync(specPath) ? readFileSync(specPath, 'utf8') : '';
  const specHex = new Set();
  for (const m of spec.matchAll(HEXT)) specHex.add(norm(m[0]));

  const e = dnaById.get(id) || {};
  const pal = (e.palette || []).map((p) => {
    const mm = String(p).match(HEXT);
    return mm ? norm(mm[0]) : null;
  }).filter(Boolean);
  const primary = (e.primary || []).map((p) => {
    const mm = String(p).match(HEXT);
    return mm ? norm(mm[0]) : null;
  }).filter(Boolean);
  const palSet = new Set([...pal, ...primary]);

  const missing = [...specHex].filter((h) => !palSet.has(h));
  rows.push({ id, spec: specHex.size, pal: palSet.size, missing: missing.length, missingList: missing, specHex: [...specHex], palList: [...palSet] });
  console.log(
    `${id}  规格 hex=${String(specHex.size).padStart(2)}  palette=${String(palSet.size).padStart(2)}  ` +
    `规格有但调色板缺=${String(missing.length).padStart(2)}  ${missing.slice(0, 8).join(' ')}`
  );
}

const totalMissing = rows.reduce((a, r) => a + r.missing, 0);
const withMissing = rows.filter((r) => r.missing > 0).length;
console.log(`\n规格有但 palette 缺：${withMissing} 案 / 共 ${totalMissing} 个色值`);
console.log(`规格里完全没有任何 hex 的案：${rows.filter((r) => r.spec === 0).map((r) => r.id).join(' ') || '无'}`);

// 反向：palette 有但规格没有
console.log('\n=== 反向：palette 有、规格里没有的色（说明规格不是色板来源）===');
let revTotal = 0, revCases = 0;
for (const r of rows) {
  const rev = r.palList.filter((h) => !r.specHex.includes(h));
  if (rev.length) { revCases++; revTotal += rev.length; }
  if (rev.length >= 3) console.log(`  ${r.id}: ${rev.length} 个  ${rev.slice(0, 8).join(' ')}`);
}
console.log(`palette 有但规格没有：${revCases} 案 / ${revTotal} 个`);
