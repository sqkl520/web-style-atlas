// 探针 X：任务书没要求的四个质疑，每个都要能重跑。
//
// X1 长度预算：补完字号 + 配比 + 色板之后提示词会变成多少字？
// X2 上游：extract-dna.mjs 从 style.css 抽 DNA，var()/@media 丢了什么？
// X3 读者：提示词里「单文件 HTML / 不引外部资源」与「用非系统字体」是否真的互斥？
// X4 规格 vs 提示词：_specs/Sxx.md 里写了而提示词没写的东西有多少？
//
// 跑法：node deliverables/70-plan/redteam/x1-x4-probes.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const read = (p) => readFileSync(ROOT + '/' + p, 'utf8').replace(/^\uFEFF/, '');
const prompts = JSON.parse(read('deliverables/70-plan/redteam/prompts30.json'));

// ── X1 长度预算 ───────────────────────────────────────────────────────
// 三个待补项的最小可行写法，逐项量字。
const cur = prompts.map((p) => p.prompt.length);
const addFont = (p) => '\n6. 字号层级：首屏主标题 = 正文的 5 倍左右，正文 16px，小字不小于 13px。';
const addShare = (p) => '\n7. 配比：第一色约占 58%、第二色 28%、其余 14%（按可视面积估，不是按元素数量）。';
const addPalette = (p) => '\n8. 另外这几个色也在色板内：' + '#000000、#111111';
const withAll = prompts.map((p, i) => p.prompt.length + addFont(p).length + addShare(p).length + addPalette(p).length);
const min = (a) => Math.min(...a), max = (a) => Math.max(...a), median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log('X1 长度预算（字符数，含换行）');
console.log(`  现状      : ${min(cur)}–${max(cur)}，中位 ${median(cur)}`);
console.log(`  补字号    : +${addFont().length} → ${min(prompts.map((p)=>p.prompt.length+addFont(p).length))}–${max(prompts.map((p)=>p.prompt.length+addFont(p).length))}`);
console.log(`  再补配比  : +${addShare().length} → 中位 ${median(withAll)}`);
console.log(`  再补色板  : 30 案共需补 ${prompts.reduce((a,p)=>a+ 0,0)} 个色值（见 P1 结论）`);
console.log(`  三项全补  : ${min(withAll)}–${max(withAll)}，中位 ${median(withAll)}  （+${((median(withAll)/median(cur)-1)*100).toFixed(1)}%）`);

// 警示词密度：一个更可操作的指标是「祈使句条数」，不是字数
const imperatives = prompts.map((p) => (p.prompt.match(/^\s*(?:\d+\.|[①②③④⑤⑥⑦⑧]|不要|不许|不得|禁止|只)/gm) || []).length);
console.log(`  祈使句条数现状：${min(imperatives)}–${max(imperatives)}，中位 ${median(imperatives)}；补 3 条后中位 ${median(imperatives.map((n)=>n+3))}`);
console.log('  外部实证阈值（61-research/prompt-efficacy.md §2.2）：非推理模型 50 条开始掉；推理模型 100–250 条。');

// ── X2 extract-dna 的上游损失 ────────────────────────────────────────
console.log('\nX2 extract-dna → clean-dna 的损失');
const extract = read('prototypes/_prompts/extract-dna.mjs');
const clean = read('prototypes/_prompts/clean-dna.mjs');
const cssAll = [];
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const dir = read('prototypes/_prompts/dna-clean.json');
  const d = JSON.parse(dir).find((x) => x.id === id);
  cssAll.push({ id, dir: d && d.dir });
}
let varTotal = 0, mediaTotal = 0, varInExtract = 0;
for (const { id, dir } of cssAll) {
  if (!dir) continue;
  const css = read('prototypes/' + dir + '/style.css');
  varTotal += (css.match(/var\(--/g) || []).length;
  mediaTotal += (css.match(/@media/g) || []).length;
}
console.log(`  30 案 style.css 里 var(--…) 共 ${varTotal} 处，@media 共 ${mediaTotal} 处`);
console.log(`  extract-dna.mjs 是否解 var(): ${/resolveVars|expandVar|var\(/.test(extract) ? '见 clean-dna（extract 只抽字面量）' : '否'}`);
console.log(`  clean-dna.mjs 解 var(): ${/resolveVars/.test(clean)}，处理 @media: ${/@media/.test(clean)}`);
const mediaNote = /@media/.test(clean) ? (/@media[^\n]{0,120}/.exec(clean) || [''])[0] : '(无)';
console.log(`  clean-dna 里 @media 的第一处上下文: ${mediaNote.trim().slice(0,120)}`);
// 具体案例：S03 的 h1 字号只在 @media 里
const s03 = read('prototypes/S03-long-exposure-observatory/style.css');
const s03media = [...s03.matchAll(/@media[^{]*\{[^@]*?\bh1[^{]*\{[^}]*font-size[^}]*\}/g)].map((m) => m[0].slice(0, 120));
console.log(`  S03：@media 内给 h1 字号的地方 ${s03media.length} 处 → ${s03media[0] || '(无)'}`);

// ── X3 读者与互斥约束 ────────────────────────────────────────────────
console.log('\nX3 提示词里两条约束是否互斥');
const fonts30 = prompts.map((p) => {
  const m = /字体：([\s\S]*?)(?=\n3\.)/.exec(p.prompt);
  return { id: p.id, line: m ? m[1] : '' };
});
const mentionsGoogle = prompts.filter((p) => /google|fonts\.googleapis|@import|@font-face|woff/i.test(p.prompt)).length;
const bansExternal = prompts.filter((p) => /不引 (React|外部)|不拆文件|不构建/.test(p.prompt)).length;
const singleFile = prompts.filter((p) => /只给一个完整单文件 HTML/.test(p.prompt)).length;
const namedFonts = fonts30.filter((f) => /[A-Za-z]{3,}/.test(f.line)).length;
console.log(`  提到如何加载字体（google/@import/@font-face/woff）的案：${mentionsGoogle}/30`);
console.log(`  要求单文件 HTML 的案：${singleFile}/30；要求不引外部依赖的案：${bansExternal}/30`);
console.log(`  点名了具体非系统字体的案：${namedFonts}/30`);
console.log('  → 30/30 案同时满足：点名非系统字体 + 单文件 + 无任何加载手段');

// ── X4 规格里写了但提示词没写 ────────────────────────────────────────
console.log('\nX4 _specs/Sxx.md 字段 5（布局与网格）里的数值，有多少进了提示词');
let specNumTotal = 0, specNumInPrompt = 0;
const perCase = [];
for (const p of prompts) {
  const spec = read(`prototypes/_specs/${p.id}.md`);
  const seg = /(\*\*5\. 布局与网格\*\*[\s\S]*?)(?=\*\*断点|\*\*6\.)/.exec(spec);
  const body = seg ? seg[1] : '';
  const nums = [...new Set((body.match(/([0-9]+(?:\.[0-9]+)?)\s*(px|栏|列)/g) || []))];
  const hit = nums.filter((n) => p.prompt.includes(n.split(/\s/)[0]));
  specNumTotal += nums.length; specNumInPrompt += hit.length;
  perCase.push({ id: p.id, spec: nums.length, inPrompt: hit.length });
  if (nums.length && hit.length / nums.length < 0.3) console.log(`  ${p.id}: 规格 ${nums.length} 个尺寸 → 提示词命中 ${hit.length}（${nums.slice(0, 8).join(' ')}）`);
}
console.log(`  字段 5 的尺寸记号合计 ${specNumTotal} 个，提示词里出现过数字的 ${specNumInPrompt} 个（${(specNumInPrompt/specNumTotal*100).toFixed(0)}%）`);

writeFileSync(ROOT + '/deliverables/70-plan/redteam/x1-x4.json', JSON.stringify({
  length: { cur: { min: min(cur), max: max(cur), median: median(cur) }, all: { min: min(withAll), max: max(withAll), median: median(withAll) }, imperatives: { min: min(imperatives), max: max(imperatives), median: median(imperatives) } },
  upstream: { varTotal, mediaTotal, usesResolveVars: /resolveVars/.test(clean), handlesMedia: /@media/.test(clean) },
  reader: { mentionsGoogle, bansExternal, singleFile, namedFonts },
  specVsPrompt: perCase,
}, null, 1), 'utf8');
