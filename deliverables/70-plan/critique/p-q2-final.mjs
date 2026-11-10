// 探针 v3：Q2 最终的「页面超纲色」性质判定。
// v2 把 #FFFFFF 判成"新色相"——那是色相判据的假象：白色/近灰的饱和度接近 0，
// 色相在数值上是噪声。这里加一条：s < 8% 或 l > 95% / l < 5% 的色不计入"新色相"，
// 单独归为「无彩色」。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P0 = join(ROOT, 'prototypes');
const dna = JSON.parse(readFileSync(join(P0, '_prompts/dna-clean.json'), 'utf8'));
const dnaById = new Map(dna.map((e) => [e.id, e]));

const DIRS = readdirSync(P0, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const hexes = (s) => [...new Set([...String(s).matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => '#' + m[1].toUpperCase()))];

function field3(md) {
  const out = [];
  let on = false;
  for (const l of md.split(/\r?\n/)) {
    const s = l.trim().replace(/\*\*/g, '');
    if (!on && /^3[.．]\s*配色系统/.test(s)) { on = true; out.push(s); continue; }
    if (on) { if (/^\d+[.．]\s*\S/.test(s)) break; out.push(l); }
  }
  return out.join('\n');
}
const NEG = /反的是|反 |反对|禁|不要|不用|避免|不得|旧值|旧 |替换|不再|不准|别用|不是/;
function splitDA(f3) {
  const declared = [], anti = [];
  for (const c of f3.split(/[；;。\n]/)) {
    const hs = hexes(c);
    if (!hs.length) continue;
    const idx = c.search(/#[0-9a-fA-F]{6}/);
    const before = c.slice(0, idx);
    const isAnti = NEG.test(before) && !/必须用|一律用|就用|务必用|要用/.test(before);
    for (const h of hs) (isAnti ? anti : declared).push(h);
  }
  return { declared, anti };
}
function hsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const rows = [];
for (const dir of DIRS) {
  const id = dir.slice(0, 3);
  const { declared, anti } = splitDA(field3(readFileSync(join(P0, '_specs', id + '.md'), 'utf8')));
  const S = [...new Set(declared)];
  const Pm = hexes(((dnaById.get(id) || {}).palette || []).join(' '));
  const C = hexes(readFileSync(join(P0, dir, 'style.css'), 'utf8'));

  const Sset = new Set(S), Pset = new Set(Pm);
  const refs = [...new Set([...S, ...Pm])].map((h) => ({ hex: h, ...hsl(h) }));
  const extra = C.filter((h) => !Sset.has(h) && !Pset.has(h));

  const derived = [], achromatic = [], newHue = [];
  for (const h of extra) {
    const x = hsl(h);
    if (x.s < 8 || x.l > 95 || x.l < 5) { achromatic.push(h); continue; }
    (refs.some((r) => gap(x.h, r.h) <= 12 && Math.abs(x.l - r.l) <= 22) ? derived : newHue).push(h);
  }
  rows.push({ id, extra, derived, achromatic, newHue, S: S.length, Pm: Pm.length, C: C.length });
  if (newHue.length) {
    console.log(`${id}  页面新增色相 ${newHue.length}: ${newHue.join(' ')}`);
  }
}
const sum = (k) => rows.reduce((a, r) => a + r[k].length, 0);
const n = (k) => rows.filter((r) => r[k].length).length;
console.log('\n=== 30/30：页面里既不属规格字段3、也不属提示词 palette 的色 ===');
console.log(`总数 ${sum('extra')} 个 / ${n('extra')} 案`);
console.log(`  同色相派生（明暗微调）  ${sum('derived')} 个  ← 设计上正常，不该补进提示词`);
console.log(`  无彩色（白/黑/近灰）    ${sum('achromatic')} 个  ← 多为浏览器默认或纸白`);
console.log(`  真正的新色相            ${sum('newHue')} 个 / ${n('newHue')} 案  ← 只有这批是"页面超纲"`);
console.log(`  分布：${rows.filter((r) => r.newHue.length).map((r) => `${r.id}(${r.newHue.length})`).join(' ') || '无'}`);
