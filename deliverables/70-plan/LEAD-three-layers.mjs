#!/usr/bin/env node
// Lead v9：三层颜色数据的量化对比
//   层1 规格字段3 声明：通常 4 个，Σ=100%（设计决策）
//   层2 :root CSS 变量 → dna-clean.palette：4-7 个（含派生）
//   层3 style.css + index.html 里出现的全部 hex（实际可能被用到）
// 这决定了"20/30 案超纲"到底该改哪一层。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SPECS = join(ROOT, 'prototypes/_specs');
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

function field3(md) {
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return '';
  const out = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    out.push(lines[j]);
  }
  return out.join('\n');
}
function declared(f3) {
  const segs = f3.split(/[；。]/); const out = [];
  for (const s of segs) {
    if (!/\d(?:\.\d)?\s*%/.test(s)) continue;
    const m = s.match(HEXT); if (!m) continue;
    if (s.indexOf(m[0]) > 40) continue;
    const pm = s.match(/(\d{1,2}(?:\.\d)?)\s*%/);
    out.push({ hex: norm(m[0]), pct: pm ? parseFloat(pm[1]) : null });
  }
  const seen = new Set(); return out.filter((o) => (seen.has(o.hex) ? false : seen.add(o.hex)));
}

// 剥掉 CSS 注释：只保留真实生效的声明
function stripCssComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

console.log('层1=规格声明  层2=:root变量(palette)  层3=CSS/HTML实际出现的hex\n');
console.log('案   L1  L2  L3   L3-L2(未进调色板的实际色)   L3-L1');
console.log('-'.repeat(96));
const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const md = existsSync(join(SPECS, id + '.md')) ? readFileSync(join(SPECS, id + '.md'), 'utf8') : '';
  const L1 = declared(field3(md));
  const L1set = new Set(L1.map((x) => x.hex));
  const e = byId.get(id) || {};
  const L2set = new Set(hexes((e.palette || []).join(' ')));

  const css = stripCssComments(readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8'));
  const html = readFileSync(join(ROOT, 'prototypes', d, 'index.html'), 'utf8');
  const L3set = new Set([...hexes(css), ...hexes(html)]);

  const beyondL2 = [...L3set].filter((h) => !L2set.has(h));
  const beyondL1 = [...L3set].filter((h) => !L1set.has(h));
  rows.push({ id, L1: [...L1set], L2: [...L2set], L3: [...L3set], beyondL2, beyondL1 });
  console.log(
    `${id}  ${String(L1set.size).padStart(2)}  ${String(L2set.size).padStart(2)}  ${String(L3set.size).padStart(2)}   ` +
    `${String(beyondL2.length).padStart(2)}  ${beyondL2.slice(0, 6).join(' ')}`
  );
}

const t = (k) => rows.reduce((a, r) => a + r[k].length, 0);
console.log('-'.repeat(96));
console.log(`合计: L1=${t('L1')}  L2=${t('L2')}  L3=${t('L3')}  L3-L2=${t('beyondL2')}  L3-L1=${t('beyondL1')}`);
console.log(`超出层2的案: ${rows.filter((r) => r.beyondL2.length).length}/30`);
console.log(`L3 最多的 5 案: ${rows.slice().sort((a, b) => b.L3.length - a.L3.length).slice(0, 5).map((r) => r.id + '=' + r.L3.length).join(' ')}`);

// 关键统计：所有 beyondL2 是否都作为 :root 变量出现过（只是 palette 没收录），还是完全没声明
console.log('\n=== L3 超出 L2 的色，是否在 :root 里声明过？===');
let declaredVar = 0, notVar = 0;
const notVarList = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const css = stripCssComments(readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8'));
  const rootBlock = css.match(/:root\s*\{[\s\S]*?\}/)?.[0] || '';
  const rootHex = new Set(hexes(rootBlock));
  const r = rows.find((x) => x.id === id);
  for (const h of r.beyondL2) {
    if (rootHex.has(h)) declaredVar++;
    else { notVar++; notVarList.push({ id, hex: h }); }
  }
}
console.log(`  在 :root 声明过但没进 palette: ${declaredVar} 个（palette 抽取漏）`);
console.log(`  完全没在 :root 声明（散落在规则里）: ${notVar} 个`);
console.log(`  后者按案分布:`);
const byCase = notVarList.reduce((a, x) => { (a[x.id] = a[x.id] || []).push(x.hex); return a; }, {});
for (const [k, v] of Object.entries(byCase).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`    ${k}: ${v.length}  ${v.slice(0, 8).join(' ')}`);
}
