// 探针 P1d：为什么「正文色」不在提示词色板里？—— 查抽取口径，不查像素。
//
// P1b 找到几个占面积最大的集合外色（S25 #4A423A 41.6% 正文、S30 #2B2B2B 79.7% 正文、
// S19 #5E5443 17.3% 次级墨）。它们既不在提示词色板，也不在 _specs 或 _CURRENT-VALUES 里。
// 所以问题不是「抽取漏了一两个」，而是**抽取的来源口径根本看不到它们**。
//
// 本探针把每个集合外色归到四类之一：
//   A. 在 :root 里声明成变量，但被 palette 上限 7 截掉
//   B. 在 :root 里声明成变量，但 pickPalette 的判据没选中它（且总数 ≤7）
//   C. 硬编码字面量（不在 :root），所以抽取器根本看不到
//   D. 运行时算出来的（rgba/opacity/color-mix/抗锯齿），CSS 里没有这个字面值
//
// 跑法：node deliverables/70-plan/redteam/p1d-palette-source.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const read = (p) => readFileSync(ROOT + '/' + p, 'utf8').replace(/^\uFEFF/, '');
const prompts = JSON.parse(read('deliverables/70-plan/redteam/prompts30.json'));
const colors = JSON.parse(read('deliverables/70-plan/redteam/p1b-color.json'));
const dna = JSON.parse(read('prototypes/_prompts/dna-clean.json'));

const norm = (h) => h.toUpperCase();
const rows = [];
const tally = { A: 0, B: 0, C: 0, D: 0 };
for (const c of colors) {
  const rec = prompts.find((p) => p.id === c.id);
  const d = dna.find((x) => x.id === c.id);
  const dir = readdirSync(ROOT + '/prototypes', { withFileTypes: true })
    .find((e) => e.isDirectory() && e.name.startsWith(c.id + '-')).name;
  const css = read('prototypes/' + dir + '/style.css');
  const html = read('prototypes/' + dir + '/index.html');
  // :root 里声明的 hex
  const rootBlocks = [...css.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map((m) => m[1]).join('\n');
  const rootHex = new Set([...rootBlocks.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => norm(m[0])).filter((h) => h.length === 7));
  const rootVarCount = rootHex.size;
  const paletteCount = (rec.palette.match(/#[0-9A-Fa-f]{6}/g) || []).length;

  // 候选：DOM-B 里出现过的集合外色（含次数与面积）
  const cand = [...new Map([...c.domB].map((x) => [x.hex, x])).values()].sort((a, b) => b.areaPct - a.areaPct);
  const detail = [];
  for (const x of cand) {
    const hex = norm(x.hex);
    const inRoot = rootHex.has(hex);
    const litInCss = new RegExp(hex.slice(1), 'i').test(css);
    const litInHtml = new RegExp(hex.slice(1), 'i').test(html);
    let cls;
    if (inRoot && rootVarCount > paletteCount) cls = 'A';          // :root 有，但被 7 上限截掉
    else if (inRoot) cls = 'B';                                     // :root 有，判据没选
    else if (litInCss || litInHtml) cls = 'C';                      // 字面量，抽取器看不到
    else cls = 'D';                                                 // 运行时产物
    tally[cls]++;
    detail.push({ hex, areaPct: x.areaPct, n: x.n, cls, inRoot, litInCss, litInHtml, sample: x.sample });
  }
  rows.push({ id: c.id, rootVarCount, paletteCount, detail });
  const big = detail.filter((x) => x.areaPct >= 1 || x.n >= 50);
  if (big.length) {
    console.log(`${c.id}  :root ${rootVarCount} 色 / 色板 ${paletteCount} 色`);
    for (const x of big) console.log(`   ${x.hex} ${x.cls}  面积${x.areaPct}% n=${x.n}  root=${x.inRoot} css字面=${x.litInCss} html字面=${x.litInHtml}  ${x.sample || ''}`);
  }
}
console.log('\n=== 归类汇总（按「显著」集合外色计）===');
console.log(`  A 在 :root 但被 7 上限截掉 : ${tally.A}`);
console.log(`  B 在 :root 但判据没选中     : ${tally.B}`);
console.log(`  C 硬编码字面量（抽取看不到）: ${tally.C}`);
console.log(`  D 运行时产物                : ${tally.D}`);
console.log('\n各案 :root 声明色数 vs 色板色数（差额 = 被截掉的量）：');
for (const r of rows) if (r.rootVarCount > r.paletteCount) console.log(`   ${r.id}: :root ${r.rootVarCount} → 色板 ${r.paletteCount}（截掉 ${r.rootVarCount - r.paletteCount}）`);
writeFileSync(ROOT + '/deliverables/70-plan/redteam/p1d-palette-source.json', JSON.stringify({ rows, tally }, null, 1), 'utf8');

