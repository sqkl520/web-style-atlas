#!/usr/bin/env node
// Lead 独立核实 v2：修掉 v1 的 \b# 正则 bug（# 前是反引号/空格时不构成 word boundary）
// 判定：集合外色在规格里有 → 提示词抽漏（改抽取逻辑）；规格里没有 → 原型超纲
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

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => {
  h = h.toLowerCase();
  return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
};
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

// 规格字段 3（配色系统）单独取：那才是色板的权威来源
function field3(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let on = false;
  for (const l of lines) {
    if (/^\*\*3[\.．]?\s*配色系统/.test(l.trim())) { on = true; continue; }
    if (on && /^\*\*\d+[\.．]?\s/.test(l.trim())) break;
    if (on) out.push(l);
  }
  return out.join('\n');
}

console.log('=== v2：每案 规格字段3 的 hex vs dna-clean.palette ===\n');
const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const p = join(SPECS, id + '.md');
  const md = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const f3 = hexes(field3(md));
  const allSpec = hexes(md);

  const e = dnaById.get(id) || {};
  const palSet = new Set([
    ...(e.palette || []).flatMap((x) => hexes(x)),
    ...(e.primary || []).flatMap((x) => hexes(x)),
  ]);

  const missF3 = f3.filter((h) => !palSet.has(h));
  rows.push({ id, f3, allSpec, palSet, missF3 });
  console.log(
    `${id}  字段3 hex=${String(f3.length).padStart(2)}  palette=${String(palSet.size).padStart(2)}  ` +
    `字段3有但缺=${String(missF3.length).padStart(2)} ${missF3.slice(0, 8).join(' ')}`
  );
}

const n = rows.filter((r) => r.missF3.length).length;
const tot = rows.reduce((a, r) => a + r.missF3.length, 0);
console.log(`\n【字段3 有但 palette 缺】${n} 案 / ${tot} 个色值`);
console.log(`字段3 完全没 hex 的案: ${rows.filter((r) => r.f3.length === 0).map((r) => r.id).join(' ') || '无'}`);

// 反向
const rev = rows.map((r) => ({ id: r.id, list: [...r.palSet].filter((h) => !r.f3.includes(h)) }));
console.log(`\n【palette 有但字段3 没有】${rev.filter((r) => r.list.length).length} 案 / ${rev.reduce((a, r) => a + r.list.length, 0)} 个`);
for (const r of rev) if (r.list.length) console.log(`  ${r.id}: ${r.list.join(' ')}`);

// 关键：palette 在宣称「面积和 100」时是否覆盖了字段3 的全部色
console.log('\n=== 判定（字段3 是色板权威来源时）===');
for (const r of rows) {
  if (!r.missF3.length) continue;
  console.log(`  ${r.id} 缺 ${r.missF3.length}: ${r.missF3.join(' ')}`);
}
