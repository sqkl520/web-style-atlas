#!/usr/bin/env node
// Lead v12：把渲染出的超纲色分成两类
//   A. 灰阶/近灰（r≈g≈b 或饱和极低）→ 提示词说的是「不新增更多彩色」，灰阶深浅不算彩色
//   B. 真正的彩色（饱和度高）→ 这才是真违规
// 这是本轮最重要的裁决依据。
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const rendered = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/rendered-colors-30.json', 'utf8'));
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

function hsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// 色相距离
function hueDist(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

const DIRS = readdirSync(ROOT + '/prototypes', { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const SKIP = new Set(['#000000']);
console.log('=== 超纲色分类：灰阶派生 vs 真彩色 ===\n');
const summary = { gray: 0, chroma: 0, casesGray: new Set(), casesChroma: new Set() };
const detail = [];

for (const d of DIRS) {
  const id = d.slice(0, 3);
  const pal = new Set(hexes((byId.get(id)?.palette || []).join(' ')));
  const palHsl = [...pal].map((h) => ({ hex: h, ...hsl(h) }));
  const off = (rendered[id] || []).filter((x) => !SKIP.has(x.hex) && !pal.has(x.hex) && x.n >= 3);
  if (!off.length) continue;

  console.log(`\n${id}  (palette ${pal.size} 色)`);
  for (const o of off.sort((a, b) => b.n - a.n)) {
    const c = hsl(o.hex);
    // 灰阶判据：饱和 ≤ 12% → 近中性灰；或与某个 palette 色色相距离 ≤ 8° 且只是明度不同 → 同族派生
    let sameHue = null;
    for (const p of palHsl) { if (hueDist(c.h, p.h) <= 10 && Math.abs(c.s - p.s) <= 22) { sameHue = p; break; } }
    let kind, note;
    if (c.s <= 12) { kind = 'GRAY'; note = '近中性灰（S≤12%）'; summary.gray++; summary.casesGray.add(id); }
    else if (sameHue) { kind = 'DERIVED'; note = `同族派生自 ${sameHue.hex}（色相差 ${hueDist(c.h, sameHue.h)}°）`; summary.gray++; summary.casesGray.add(id); }
    else { kind = 'CHROMA'; note = '新彩色（无同族来源）'; summary.chroma++; summary.casesChroma.add(id); }
    detail.push({ id, hex: o.hex, n: o.n, kinds: o.kinds, hsl: c, kind, note });
    console.log(`  ${o.hex}  元素=${String(o.n).padStart(4)}  H=${String(c.h).padStart(3)} S=${String(c.s).padStart(3)} L=${String(c.l).padStart(3)}  ${kind.padEnd(8)} ${note}  [${o.kinds.join(',')}]`);
  }
}

console.log('\n' + '='.repeat(70));
console.log(`灰阶/同族派生（不算「新增彩色」）: ${summary.gray} 个，涉及 ${summary.casesGray.size} 案`);
console.log(`真正的新彩色（无同族来源）      : ${summary.chroma} 个，涉及 ${summary.casesChroma.size} 案`);
console.log(`后者分布: ${[...summary.casesChroma].join(' ') || '无'}`);

console.log('\n=== 真彩色清单（这是必须处理的）===');
for (const x of detail.filter((d) => d.kind === 'CHROMA').sort((a, b) => b.n - a.n)) {
  console.log(`  ${x.id}  ${x.hex}  元素=${String(x.n).padStart(4)}  H=${x.hsl.h} S=${x.hsl.s} L=${x.hsl.l}  [${x.kinds.join(',')}]`);
}

import { writeFileSync } from 'node:fs';
writeFileSync(ROOT + '/deliverables/70-plan/offpalette-classified.json', JSON.stringify(detail, null, 1));
console.log('\n已写 deliverables/70-plan/offpalette-classified.json');
