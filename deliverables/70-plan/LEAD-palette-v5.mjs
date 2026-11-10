#!/usr/bin/env node
// Lead 独立核实 v5：修正 v4 的行内/换行两种格式
// 规格字段3 有两种写法：
//   A) "3. 配色系统：`#XXXXXX` 名称＝角色，NN%（...）；..."   同行
//   B) "**3. 配色系统**" 换行后接正文
// v4 只处理了 A，所以 20 案解析失败。
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
  let i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return '';
  const out = [lines[i].replace(/^[\s*]*3[\.．]?\s*配色系统\**\s*[：:]?\s*/, '')];
  for (let j = i + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (/^\*{0,2}4[\.．]?\s/.test(t) || /^4\.\s*\*{0,2}字体策略/.test(t)) break;
    out.push(lines[j]);
  }
  return out.join('\n');
}

// 声明段：含 % 的段落里，段首（前 40 字符内）出现的 hex
function declared(f3) {
  const segs = f3.split(/[；。]/);
  const out = [];
  for (const s of segs) {
    if (!/\d(?:\.\d)?\s*%/.test(s)) continue;
    const m = s.match(HEXT);
    if (!m) continue;
    const pos = s.indexOf(m[0]);
    if (pos > 40) continue;
    const pm = s.match(/(\d{1,2}(?:\.\d)?)\s*%/);
    out.push({ hex: norm(m[0]), pct: pm ? parseFloat(pm[1]) : null });
  }
  const seen = new Set(); const res = [];
  for (const o of out) { if (!seen.has(o.hex)) { seen.add(o.hex); res.push(o); } }
  return res;
}

console.log('=== v5：字段3 声明的调色板 vs dna-clean.palette ===\n');
const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const md = existsSync(join(SPECS, id + '.md')) ? readFileSync(join(SPECS, id + '.md'), 'utf8') : '';
  const decl = declared(field3(md));
  const e = dnaById.get(id) || {};
  const palSet = new Set(hexes((e.palette || []).join(' ')));
  const declSet = new Set(decl.map((x) => x.hex));
  const missing = [...declSet].filter((h) => !palSet.has(h));
  const extra = [...palSet].filter((h) => !declSet.has(h));
  rows.push({ id, decl, declSet, palSet, missing, extra });
  const pctSum = decl.reduce((a, x) => a + (x.pct || 0), 0);
  console.log(
    `${id}  声明=${String(declSet.size).padStart(2)}(Σ${String(Math.round(pctSum)).padStart(3)}%)  pal=${String(palSet.size).padStart(2)}  ` +
    `缺=${String(missing.length).padStart(2)} 多=${String(extra.length).padStart(2)}  ${missing.length ? '缺:' + missing.join(' ') : ''} ${extra.length ? '多:' + extra.join(' ') : ''}`
  );
}

const missCases = rows.filter((r) => r.missing.length);
console.log(`\n【提示词缺了规格声明的色】${missCases.length} 案 / ${rows.reduce((a, r) => a + r.missing.length, 0)} 个`);
for (const r of missCases) console.log(`  ${r.id}: ${r.missing.join(' ')}`);
console.log(`【提示词多了规格没声明的色】${rows.filter((r) => r.extra.length).length} 案 / ${rows.reduce((a, r) => a + r.extra.length, 0)} 个`);
console.log(`【色板与规格声明完全一致】${rows.filter((r) => !r.missing.length && !r.extra.length).map((r) => r.id).join(' ') || '无'}`);
console.log(`【字段3 解析不出声明】${rows.filter((r) => !r.decl.length).map((r) => r.id).join(' ') || '无'}`);

// 面积和是否 100
console.log('\n=== 规格声明的面积和是否 = 100（异常案）===');
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const md = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const decl = declared(field3(md));
  const s = decl.reduce((a, x) => a + (x.pct || 0), 0);
  if (decl.length && Math.abs(s - 100) > 3) console.log(`  ${id}: Σ=${s}%  各段: ${decl.map((x) => x.hex + '=' + x.pct + '%').join(' ')}`);
}
