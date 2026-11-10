/* S02 修复的实质验证：注入一个真实的低对比度文字，看 contrast 是否抓得到。
 *
 * 逻辑：
 *   修复前 body 有 background-image → bgBehind() 在 body 短路 → return null
 *     → 调用处 :282 `if (!bg) continue` → 所有文字被跳过 → lowContrast 恒 0
 *   修复后 body 纯色 → bgBehind() 能返回 bodyBg → contrast 真的被算 → 注入的
 *     低对比度文字会被抓进 lowContrast
 *
 * 做法：在本案加一段 <p> 文字，颜色设为与底色极近的 #101014（对 #0b0b0f 约 1.05:1），
 * 分别在「body 有纹理」与「body 无纹理」两种状态下重渲染，比对 lowContrast 条数。
 *
 * ⚠️ 这会改 style.css 与 index.html 并重渲染，测试后必须完整还原。
 *    当前 S02 是"已修复"状态（纹理在 body::before），所以：
 *      状态 A = 现在（正确）→ 期望 lowContrast ≥ 1
 *      状态 B = 把纹理挪回 body → 期望 lowContrast = 0（失明）
 */
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CASE = `${ROOT}/prototypes/S02-gilded-symmetry-salon`;
const CSS = `${CASE}/style.css`;
const HTML = `${CASE}/index.html`;
const REP = `${CASE}/.inspect/report.json`;

const cssOrig = readFileSync(CSS, 'utf8');
const htmlOrig = readFileSync(HTML, 'utf8');
const repOrig = readFileSync(REP, 'utf8');

const restore = () => {
  writeFileSync(CSS, cssOrig, 'utf8');
  writeFileSync(HTML, htmlOrig, 'utf8');
  writeFileSync(REP, repOrig, 'utf8');
};

const render = () => {
  try { execSync('node prototypes/_build/render-scheme.mjs S02-gilded-symmetry-salon', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { /* render-scheme 在有 FAIL 时 exit 1，正常 */ }
  const j = JSON.parse(readFileSync(REP, 'utf8'));
  const v = j.viewports.find((x) => x.width === 1440);
  return {
    lowContrast: v?.metrics?.color?.lowContrast?.length ?? -1,
    bodyBg: v?.metrics?.color?.bodyBg,
    texts: v?.metrics?.color?.lowContrast || [],
  };
};

/* 注入的低对比度段落：颜色 #101014 对 #0b0b0f ≈ 1.05:1 */
const INJECT = `
<section class="contrast-probe" style="position:relative;z-index:2;padding:24px;background:transparent">
  <p style="color:#101014;font-size:16px;line-height:1.8;margin:0">对比度探针：这一段文字的颜色与底色几乎相同，如果 contrast 检查在工作，它必须被抓到。</p>
</section>
`;

console.log('═══ 准备：注入低对比度文字（颜色 #101014 对底色 #0b0b0f）═══\n');

/* ── 状态 A：当前（已修复，纹理在 body::before）── */
writeFileSync(HTML, htmlOrig.replace('</body>', INJECT + '\n</body>'), 'utf8');
const A = render();
console.log('状态 A（已修复，纹理在 body::before）:');
console.log(`  bodyBg = ${A.bodyBg}   lowContrast = ${A.lowContrast}`);
A.texts.slice(0, 3).forEach((t) => console.log(`    「${t.text.slice(0, 26)}」 ${t.fg} on ${t.bg} = ${t.ratio}:1（需 ${t.need}）`));

/* ── 状态 B：把纹理挪回 body（复现修复前的状态）── */
const cssB = cssOrig
  .replace(/body::before \{[\s\S]*?\n\}\n/, '')  // 删掉 ::before 块
  .replace(
    "body {\n  margin: 0;\n  background-color: var(--card);",
    'body {\n  margin: 0;\n  background-color: var(--card);\n  background-image: url("assets/card-grain.png");'
  );
writeFileSync(CSS, cssB, 'utf8');
const B = render();
console.log('\n状态 B（复现修复前，纹理挂 body）:');
console.log(`  bodyBg = ${B.bodyBg}   lowContrast = ${B.lowContrast}`);
B.texts.slice(0, 3).forEach((t) => console.log(`    「${t.text.slice(0, 26)}」 ${t.fg} on ${t.bg} = ${t.ratio}:1（需 ${t.need}）`));

restore();
console.log('\n═══ 判定 ═══');
console.log(`  状态 A（纹理在伪元素）lowContrast = ${A.lowContrast}`);
console.log(`  状态 B（纹理挂 body） lowContrast = ${B.lowContrast}`);
if (A.lowContrast > 0 && B.lowContrast === 0) {
  console.log('  ✓ **修复有效**：注入的低对比度文字在 A 被抓到、在 B 被短路 —— 证明 bgBehind() 确实会让 contrast 失明');
} else if (A.lowContrast === 0 && B.lowContrast === 0) {
  console.log('  ⚠ 两种状态都没抓到 —— 探针的注入位置或颜色可能不对，需换位置再试');
} else {
  console.log('  ? 结果不符合预期，需人工看');
}
console.log('\n已还原 S02 的三个文件。注意：需重跑一次 render-scheme 让 report.json 回到修复后状态。');
