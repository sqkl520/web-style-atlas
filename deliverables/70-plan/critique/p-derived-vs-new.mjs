// 探针：30/30 全量判定 Q2 —— 每案的「页面实画色」里，有多少是**已声明色的派生色**
// （明暗微调/中点/抗锯齿），有多少是**真正的新色相**。
// 判据（明确写死，允许被推翻）：
//   derived = 该色的色相与该案任一已声明色的色相差 ≤ 12° 且 明度差 ≤ 22
//   newHue  = 色相差 > 12°  → 才是「真·新增色相」
// 数据源用仓库自己的 dna-clean.json + style.css 的 :root 声明（不重跑浏览器，成本可控）。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');
const dna = JSON.parse(readFileSync(join(P, '_prompts/dna-clean.json'), 'utf8'));
const dnaById = new Map(dna.map((e) => [e.id, e]));

const DIRS = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
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
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

console.log('id   声明色  页面全部hex  派生色  新色相  新色相清单');
const rows = [];
for (const dir of DIRS) {
  const id = dir.slice(0, 3);
  const css = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const all = [...new Set([...css.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => '#' + m[1].toUpperCase()))];
  const e = dnaById.get(id) || {};
  const claimed = [...new Set((e.palette || []).flatMap((x) =>
    [...String(x).matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => '#' + m[1].toUpperCase())))];
  const claimedHsl = claimed.map((h) => ({ hex: h, ...hexToHsl(h) }));

  const newHue = [];
  let derived = 0;
  for (const h of all) {
    if (claimed.includes(h)) continue;
    const x = hexToHsl(h);
    const isDerived = claimedHsl.some((c) => hueGap(x.h, c.h) <= 12 && Math.abs(x.l - c.l) <= 22);
    if (isDerived) derived++;
    else newHue.push(h);
  }
  rows.push({ id, claimed: claimed.length, all: all.length, derived, newHue });
  console.log(
    `${id}  ${String(claimed.length).padStart(6)}  ${String(all.length).padStart(10)}  ` +
    `${String(derived).padStart(6)}  ${String(newHue.length).padStart(6)}  ${newHue.slice(0, 8).join(' ')}`
  );
}

const tot = rows.reduce((a, r) => a + r.all, 0);
const totDerived = rows.reduce((a, r) => a + r.derived, 0);
const totNew = rows.reduce((a, r) => a + r.newHue.length, 0);
console.log(`\n合计：页面 hex ${tot} 个，其中派生色 ${totDerived}（${(totDerived / tot * 100).toFixed(1)}%），新色相 ${totNew}（${(totNew / tot * 100).toFixed(1)}%）`);
console.log(`完全无新色相的案：${rows.filter((r) => !r.newHue.length).map((r) => r.id).join(' ') || '无'}`);
console.log(`新色相 ≥3 的案：${rows.filter((r) => r.newHue.length >= 3).map((r) => `${r.id}(${r.newHue.length})`).join(' ')}`);
