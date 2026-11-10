import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';

const MISSING = {
  S06: ['#5A3A1C'],
  S14: ['#9A968C', '#3A3630'],
  S15: ['#4C5257'],
  S19: ['#5E5443'],
  S24: ['#6E8B7A', '#1B1136', '#2A1B50'],
  S25: ['#4A423A'],
  S30: ['#2B2B2B', '#4A4A4A'],
};

const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
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
  return { h, s: s * 100, l: l * 100 };
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/** sRGB → Lab（D65） */
function toLab(hex) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const xr = f(X / 0.95047), yr = f(Y), zr = f(Z / 1.08883);
  return [116 * yr - 16, 500 * (xr - yr), 200 * (yr - zr)];
}
function ciede2000(L1, L2) {
  // 简化：用 CIE76 近似（排序用途足够）
  return Math.sqrt((L1[0] - L2[0]) ** 2 + (L1[1] - L2[1]) ** 2 + (L1[2] - L2[2]) ** 2);
}

console.log('=== 规划 Agent 的 11 个 MISSING 色：同色相派生 还是 真新色相？===\n');
console.log('案    色        HSL(h/s/l)        最接近的调色板色      色相差  ΔE(CIE76)  判定');
console.log('-'.repeat(112));

const results = [];
for (const [id, colors] of Object.entries(MISSING)) {
  const dir = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter((x) => x.isDirectory() && x.name.startsWith(id + '-')).map((x) => x.name)[0];
  const pal = hexes((byId.get(id)?.palette || []).join(' '));
  for (const c of colors) {
    const cs = hsl(c);
    let best = null, bestHue = 999, bestDE = 999;
    for (const p of pal) {
      const ps = hsl(p);
      const hd = (cs.s < 12 || ps.s < 12) ? 0 : hueDist(cs.h, ps.h);
      const de = ciede2000(toLab(c), toLab(p));
      if (hd < bestHue || (hd === bestHue && de < bestDE)) { if (hd <= bestHue) { bestHue = hd; bestDE = de; best = p; } }
    }
    const verdict = cs.s < 12 ? 'GRAY（近中性）' : (bestHue <= 12 ? 'DERIVED（同色相派生）' : 'CHROMA（真新色相）');
    results.push({ id, hex: c, hsl: cs, best, bestHue, bestDE, verdict });
    console.log(
      `${id}  ${c}  ${String(Math.round(cs.h)).padStart(3)}°/${String(Math.round(cs.s)).padStart(3)}%/${String(Math.round(cs.l)).padStart(3)}%  ` +
      `${String(best).padEnd(20)} ${String(Math.round(bestHue)).padStart(4)}°  ${String(bestDE.toFixed(1)).padStart(7)}  ${verdict}`
    );
  }
}

console.log('\n=== 汇总 ===');
const sum = {};
for (const r of results) sum[r.verdict] = (sum[r.verdict] || 0) + 1;
for (const [k, v] of Object.entries(sum)) console.log(`  ${k}: ${v} 个`);
console.log(`\n真新色相（必须补）: ${results.filter((r) => r.verdict.startsWith('CHROMA')).map((r) => r.id + ':' + r.hex).join(' ') || '无'}`);

// 再查：这 11 个色在 CSS 里有没有对比度理由
console.log('\n=== 逐个查 CSS 里的理由 ===\n');
for (const r of results) {
  const dir = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter((x) => x.isDirectory() && x.name.startsWith(r.id + '-')).map((x) => x.name)[0];
  const css = readFileSync(join(ROOT, 'prototypes', dir, 'style.css'), 'utf8');
  const lines = css.split(/\r?\n/);
  const hits = lines.map((l, i) => ({ l, n: i + 1 })).filter((x) => x.l.toLowerCase().includes(r.hex.toLowerCase()));
  const ctx = hits.map((h) => h.l).join(' ');
  const hasContrast = /对比度|:1\b|\d\.\d+:1|AA\b|AAA\b/.test(ctx);
  const varName = hits.length ? (hits[0].l.match(/--[\w-]+/) || [])[0] : null;
  console.log(`${r.id} ${r.hex}  ${varName || '(无变量名)'}  CSS出现${hits.length}处  对比度理由=${hasContrast ? '有' : '无'}  ${r.verdict}`);
  if (hasContrast) {
    const m = ctx.match(/[^;。\n]{0,80}\d\.\d+:1[^;。\n]{0,40}/);
    if (m) console.log(`      证据: ${m[0].trim().slice(0, 130)}`);
  }
}
