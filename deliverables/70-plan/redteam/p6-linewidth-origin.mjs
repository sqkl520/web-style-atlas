// 探针 P6：S20 的两组「线宽」到底是不是同一份数据？
//
// PATCH-linewidth.md 的定位是「lineWidths 的根因在 clean-dna.mjs:452 的 lineWidthVerdict()」。
// 本探针只问三个可判定的事实问题，不引用任何人的结论：
//   Q1 机制句里的 0.6/1.2/2.4 在 CSS/HTML 里作为**描边宽度**出现过吗？
//   Q2 它们是靠哪个字段、哪个函数进到提示词里的？
//   Q3 它们在页面运行时被当成什么量使用？
//
// 跑法：node deliverables/70-plan/redteam/p6-linewidth-origin.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const norm = (p) => readFileSync(ROOT + p, 'utf8').replace(/^\uFEFF/, '');
const rows = [];

// ── Q1：S20 的 0.6/1.2/2.4 在 CSS 声明里是什么属性 ──────────────────
const css = norm('/prototypes/S20-plotter-soundfield/style.css');
const html = norm('/prototypes/S20-plotter-soundfield/index.html');
const triple = ['0.6', '1.2', '2.4'];
const asStroke = [];
for (const v of triple) {
  const inCss = [...css.matchAll(new RegExp(`(?:border[a-z-]*|outline[a-z-]*|stroke-width)\\s*:\\s*${v.replace('.', '\\.')}px?\\b`, 'g'))];
  const inHtml = [...html.matchAll(new RegExp(`stroke-width\\s*=\\s*["']${v.replace('.', '\\.')}["']`, 'g'))];
  asStroke.push({ v, cssDecls: inCss.length, htmlAttrs: inHtml.length });
}
console.log('Q1 0.6/1.2/2.4 作为「描边宽度」出现在 CSS 声明 / HTML 属性里的次数:');
for (const r of asStroke) console.log(`   ${r.v}px → CSS ${r.cssDecls} 次，HTML stroke-width= ${r.htmlAttrs} 次`);
const totalStroke = asStroke.reduce((a, r) => a + r.cssDecls + r.htmlAttrs, 0);

// 反查：真实存在的 stroke-width / border 值
const realCss = [...new Set([...css.matchAll(/(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([0-9.]+)px/g)].map((m) => parseFloat(m[1])))].sort((a, b) => a - b);
const realHtml = [...new Set([...html.matchAll(/stroke-width\s*=\s*["']([0-9.]+)["']/g)].map((m) => parseFloat(m[1])))].sort((a, b) => a - b);
console.log(`   真实存在：CSS ${JSON.stringify(realCss)}，HTML ${JSON.stringify(realHtml)}`);

// ── Q2：字段与函数 ────────────────────────────────────────────────
const dna = JSON.parse(norm('/prototypes/_prompts/dna-clean.json'));
const s20 = dna.find((d) => d.id === 'S20');
const mech = JSON.parse('{}'); // placeholder
const mechSrc = norm('/prototypes/_prompts/mechanisms.mjs');
const mechBlock = /S20:\s*\{[\s\S]*?\n  \},/.exec(mechSrc)[0];
const prompts = JSON.parse(norm('/deliverables/70-plan/redteam/prompts30.json'));
const s20p = prompts.find((p) => p.id === 'S20');
const mechLine = s20p.prompt.split('\n').find((l) => l.startsWith('这个风格的签名动作'));
const lwLine = s20p.prompt.split('\n').find((l) => l.startsWith('5. 线宽'));
console.log('\nQ2 两个值分别来自哪个字段：');
console.log('   dna-clean.json S20.lineWidths = ' + JSON.stringify(s20.lineWidths));
console.log('   dna-clean.json S20.mechanism  = ' + JSON.stringify(s20.mechanism || '(空)'));
console.log('   → 机制句实际来自 mechanisms.mjs 的 S20.text（build-prompts.mjs:105 的 if (!d.mechanism) 分支）');
console.log('     mechanisms.mjs S20.source = ' + (/"source":\s*"([^"]*)"/.exec(mechBlock) || [])[1]);
console.log('\n   提示词第 5 条 : ' + lwLine);
console.log('   提示词机制句  : ' + mechLine.slice(0, 140) + '…');

// ── Q3：运行时它被当成什么 ──────────────────────────────────────────
const spLine = /CAP = 4000,\s*SP = (\[[^\]]*\])/.exec(html);
const spUse = /sp = 8 \* s/.exec(html);
const rdSig = /function RD\(i, C, N, sp, fr\)/.exec(html);
const rdUse = /r = R0 \+ i \* sp \+/.exec(html);
console.log('\nQ3 运行时语义：');
console.log('   ' + (spLine ? 'SP = ' + spLine[1] : '未找到 SP'));
console.log('   ' + (spUse ? 'sp = 8 * s  → 实际间距 = 8 × 档位值（8 倍图面输出）' : '未找到 8*s'));
console.log('   ' + (rdSig ? 'RD(i, C, N, sp, fr) 里 sp 参与半径计算' : '未找到 RD'));
console.log('   ' + (rdUse ? 'r = R0 + i * sp + …  → sp 是**相邻走线的半径步长**，不是描边宽度' : '未找到 r 公式'));
const legendHtml = /下半[^<]{0,40}8 倍放大/.test(html);
console.log('   HTML 自述：「画布按 8 倍图面输出，即 4.8 / 9.6 / 19.2px」= ' + legendHtml);

rows.push({ q1: { triple, asStroke, realCss, realHtml, totalStroke }, q2: { lineWidths: s20.lineWidths, mechanism: s20.mechanism, mechLine, lwLine }, q3: { SP: spLine && spLine[1], uses8x: !!spUse, isRadiusStep: !!rdUse } });

// ── 扩展到 30 案：机制句里的数字，有多少在 lineWidths 之外？─────────
console.log('\n=== 30 案：机制句里的 px 值与 lineWidths 的关系 ===');
const lwSet = new Set();
const per = [];
for (const p of prompts) {
  const lw = (p.lineWidths || '').match(/[0-9.]+/g) || [];
  const lws = new Set(lw.map(Number));
  const ml = p.prompt.split('\n').find((l) => l.startsWith('这个风格的签名动作')) || '';
  const mechNums = [...new Set((ml.match(/([0-9]+(?:\.[0-9]+)?)px/g) || []).map((s) => parseFloat(s)))];
  const outside = mechNums.filter((n) => !lws.has(n));
  per.push({ id: p.id, lw: [...lws].sort((a, b) => a - b), mechNums: mechNums.sort((a, b) => a - b), outside });
  if (outside.length) console.log(`   ${p.id}: 线宽{${[...lws].sort((a,b)=>a-b).join(',')}} | 机制句{${mechNums.sort((a,b)=>a-b).join(',')}} | 机制句独有 {${outside.join(',')}}`);
}
const withOutside = per.filter((x) => x.outside.length).length;
console.log(`   机制句含 lineWidths 之外 px 值的案：${withOutside}/30`);
writeFileSync(ROOT + '/deliverables/70-plan/redteam/p6-linewidth.json', JSON.stringify({ rows, per, withOutside }, null, 1), 'utf8');
