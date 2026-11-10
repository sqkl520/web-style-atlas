/* P1b 的真正问题：守卫有没有用？
 *
 * 30/30 当前新鲜 ⇒ 加守卫不会立刻全红（前提成立）。
 * 但这不等于它有价值。要问的是：**这个守卫能抓到人来犯的错误吗？**
 * 人为错误只有两种形态：
 *   ① 改了 css，没重渲染  → 源文件 mtime 变新
 *   ② 手工改了 report.json → 产物变新，但内容与 css 不符（mtime 检查抓不到）
 *
 * 本探针实测这两条，并检查：现有工作流里是否存在「改了 css 一定会重渲染」的机制。
 */
import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');

console.log('═══ 1) 有没有文档/脚本文档化「改了 css 要重渲染」 ═══\n');
const docs = ['README.md', 'prototypes/_CONTRACT.md', 'prototypes/_build/README.md'];
for (const d of docs) {
  if (!existsSync(join(ROOT, d))) continue;
  const t = readFileSync(join(ROOT, d), 'utf8');
  const hits = t.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /render-scheme/.test(l));
  console.log(`  ${d}: ${hits.length} 处提到 render-scheme`);
  for (const [n, l] of hits.slice(0, 3)) console.log(`     L${n}: ${l.trim().slice(0, 110)}`);
}

console.log('\n═══ 2) check-stale.mjs 现在查什么 ═══\n');
const cs = readFileSync(join(P, '_build/check-stale.mjs'), 'utf8');
const hasReport = /report\.json/.test(cs);
console.log('  提到 report.json:', hasReport);
const sections = [...cs.matchAll(/\/\* *([①②③④⑤])[^*]*?\*\//g)].map((m) => m[1]);
console.log('  已有分节:', sections.join(' ') || '（用别的标记）');
for (const m of cs.matchAll(/\/\* *([①②③④⑤])[\s\S]{0,220}?\*\//g)) {
  const title = m[0].replace(/\/\*|\*\//g, '').split('\n')[0].trim();
  console.log(`     ${title.slice(0, 100)}`);
}

console.log('\n═══ 3) 变异测试：模拟「改了 css 没重渲染」 ═══\n');
const target = 'S08-amber-overprint-lightbox';
const css = join(P, target, 'style.css');
const rep = join(P, target, '.inspect/report.json');
const cssBak = readFileSync(css, 'utf8');
const repMtimeBefore = statSync(rep).mtimeMs;

console.log(`  目标: ${target}`);
console.log(`  改 css 前 report.json mtime: ${new Date(repMtimeBefore).toISOString()}`);

// 只 touch css（改一个注释），不改内容语义
writeFileSync(css, cssBak + '\n/* staleness probe */\n', 'utf8');
const cssMtime = statSync(css).mtimeMs;
const repMtime = statSync(rep).mtimeMs;
const gap = Math.round((cssMtime - repMtime) / 1000);
console.log(`  touch 后 css mtime: ${new Date(cssMtime).toISOString()}`);
console.log(`  差: ${gap} 秒  → 一个「源比产物新」的守卫${gap > 0 ? '会' : '不会'}触发`);

// 恢复内容（mtime 会变，但内容回去）
writeFileSync(css, cssBak, 'utf8');
console.log('  已恢复内容');

console.log('\n═══ 4) 关键问题：改 css 后 report.json 的「数字」会不会真的变？ ═══');
const rr = JSON.parse(readFileSync(rep, 'utf8'));
console.log('  report.json 里与 css 相关的字段:');
console.log('    findings 条数:', rr.findings.length);
console.log('    viewports:', rr.viewports.map((v) => v.width).join('/'));
const m = rr.viewports[0].metrics;
console.log('    type.familyCount:', m.type?.familyCount);
console.log('    color.button:', JSON.stringify(m.color?.button));
console.log('    → 这些全部由渲染时实测，改 css 后必然不同');

console.log('\n═══ 5) 那么「陈旧」的真实后果是什么 ═══');
console.log('  · report.json 里的 findings 是**旧渲染**的判定 → 闸门报数失真');
console.log('  · .inspect/*.jpg 是**旧渲染**的截图 → 人看截图以为页面长这样');
console.log('  · 二者都会被 data.js / 选型台消费 → 用户看到旧结论');

console.log('\n═══ 6) 但 check-stale 已经覆盖了选型台入口 ═══');
console.log('  选型台 report 由 render-scheme.mjs _selection 生成，它读 prompts.js / data.js');
console.log('  但 30 案的 report.json 是**各自独立**生成的，不在任何 CHAIN 里');
const chainHit = /S\d\d/.test(cs) || /caseDirs/.test(cs);
console.log('  check-stale 里有 caseDirs（查 30 案）:', /caseDirs/.test(cs));
