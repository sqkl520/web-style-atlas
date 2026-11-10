#!/usr/bin/env node
// Lead v20：配色配比真相
// 规格字段3 写了面积占比（如"背景 62%、主色 14%"），但提示词只给色值不给占比。
// 问题：(a) 页面实际面积占比是否接近规格声称？(b) 如果差很远，那"补配比"就是在补一个原型自己都不遵守的数字
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const rendered = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/rendered-colors-30.json', 'utf8'));
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
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

const DIRS = readdirSync(ROOT + '/prototypes', { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

console.log('=== 规格声称的面积占比 vs 页面实际的元素数占比 ===\n');
console.log('（元素数占比只是粗略代理，不等于像素面积，但能看出量级是否一致）\n');

const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const md = existsSync(join(ROOT, 'prototypes/_specs', id + '.md')) ? readFileSync(join(ROOT, 'prototypes/_specs', id + '.md'), 'utf8') : '';
  const decl = declared(field3(md));
  if (!decl.length) { console.log(`${id}  规格无声明`); continue; }
  const rend = rendered[id] || [];
  const totalN = rend.filter((x) => x.hex !== '#000000').reduce((a, x) => a + x.n, 0);
  const rmap = new Map(rend.map((x) => [x.hex, x.n]));

  const lines = [];
  let maxDelta = 0, worst = null;
  for (const c of decl) {
    const n = rmap.get(c.hex) || 0;
    const actualPct = totalN ? (n / totalN) * 100 : 0;
    const delta = actualPct - (c.pct || 0);
    if (Math.abs(delta) > Math.abs(maxDelta)) { maxDelta = delta; worst = { hex: c.hex, claimed: c.pct, actual: +actualPct.toFixed(1) }; }
    lines.push(`${c.hex} 声称${String(c.pct).padStart(3)}% 实际${String(actualPct.toFixed(1)).padStart(5)}%`);
  }
  rows.push({ id, decl, maxDelta, worst });
  console.log(`${id}  ${lines.join('  |  ')}`);
}

console.log('\n\n=== 最大偏差案（声称 vs 实际）===');
for (const r of rows.slice().sort((a, b) => Math.abs(b.maxDelta) - Math.abs(a.maxDelta)).slice(0, 10)) {
  console.log(`  ${r.id}  ${r.worst.hex}: 声称 ${r.worst.claimed}% → 实际 ${r.worst.actual}%  （差 ${r.maxDelta.toFixed(1)}pp）`);
}

// 关键词：占比最大的那个色，规格声称 vs 实际
console.log('\n=== 「主色实际占多少」===');
for (const r of rows) {
  const rend = rendered[r.id] || [];
  const totalN = rend.filter((x) => x.hex !== '#000000').reduce((a, x) => a + x.n, 0);
  const top = rend.filter((x) => x.hex !== '#000000').sort((a, b) => b.n - a.n)[0];
  const declTop = r.decl.slice().sort((a, b) => (b.pct || 0) - (a.pct || 0))[0];
  console.log(`  ${r.id}  规格最大占比=${declTop.hex}(${declTop.pct}%)   实际元素最多=${top.hex}(${(top.n / totalN * 100).toFixed(1)}%, ${top.n}个)  ${declTop.hex === top.hex ? '✓同' : '✗不同'}`);
}
