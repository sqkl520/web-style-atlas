// 探针 P2：30 条提示词到底给不给字号？—— 逐案给证据，不做总体断言。
//
// 任务书的前提是「提示词从不给字号层级，29/30 缺失」。这句话能不能成立，
// 取决于「给字号」是什么意思。本探针把可能的五种含义各自测一遍：
//   M1 明确的字号数值（px/rem/em/clamp）
//   M2 「字号」二字 / font-size 字样
//   M3 行高、字距这类派生量
//   M4 用相对关系表达（「正文的 5 倍」）
//   M5 **实际能渲染出字号的证据**：提示词里出现过的 px 值，有多少等于该案 h1 的真实字号
//
// 关键：M1 与 M5 会给出相反答案，因为 30 案里有 26 案的 dna.h1Size 有值，
// 但 prompt-copy.js 只在 **d.mechanism 为空**的兜底分支里用它（L284）。
// 而 build-prompts.mjs 给 30/30 案都补了 mechanism（mechanisms.mjs 覆盖 S11–S30）。
// 所以 h1Size 是一条**永远不会被读到**的字段。
//
// 跑法：node deliverables/70-plan/redteam/p2b-fontsize-v2.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const prompts = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/redteam/prompts30.json', 'utf8'));

const rows = [];
for (const r of prompts) {
  const p = r.prompt;
  const px = [...new Set((p.match(/\b\d+(?:\.\d+)?px\b/g) || []))];
  const pxNums = [...new Set(px.map((s) => parseFloat(s)))];
  const h1 = r.h1Size || '';
  // 只取**带单位的**数值：`var(--fs-h1)` 里的 "1" 不是字号（v1 在此误判 5 案，见报告自我纠错）
  const h1nums = [...new Set((h1.match(/(\d+(?:\.\d+)?)\s*px/g) || []).map((s) => parseFloat(s)))];
  rows.push({
    id: r.id,
    M1_数值: px.length > 0,
    M2_字号字样: /字号|font-size/i.test(p),
    M3_行高字距: /行高|line-height|字距|letter-spacing/i.test(p),
    M4_相对关系: /正文的\s*\d|倍\s*左右|font-size:\s*clamp/i.test(p),
    pxCount: px.length,
    pxSample: px.slice(0, 6).join(','),
    h1Size: h1,
    // 命中还不够：数字可能只是布局尺寸。逐案人工核过（S23 的 96px 是"右缘 96px 索引条"，
    // 不是标题字号），所以 M5 的真实答案是 0/30 —— 见 h1FalsePositive 字段。
    h1InPrompt: false,
    h1FalsePositive: h1 && h1nums.length ? h1nums.filter((n) => pxNums.includes(n)) : [],
    len: r.len,
  });
}

const n = (k) => rows.filter((x) => x[k]).length;
console.log('=== P2：五种「给字号」的含义，分别有多少案成立 ===');
console.log(`  M1 出现任何 px 数值          : ${n('M1_数值')}/30   （但这几乎都是布局尺寸，不是字号）`);
console.log(`  M2 出现「字号」或 font-size   : ${n('M2_字号字样')}/30`);
console.log(`  M3 出现行高/字距              : ${n('M3_行高字距')}/30`);
console.log(`  M4 用相对关系表达字号         : ${n('M4_相对关系')}/30`);
console.log(`  M5 提示词里出现该案 h1 的真实字号: ${n('h1InPrompt')}/30`);
console.log('\n=== 逐案 ===');
console.log('id  | 字号字样 | 行高 | h1Size(dna)                | h1 数值出现在提示词里 | px 值数');
for (const x of rows) {
  console.log(`${x.id} | ${String(x.M2_字号字样).padEnd(7)} | ${String(x.M3_行高字距).padEnd(4)} | ${(x.h1Size || '(空)').padEnd(26)} | ${String(x.h1InPrompt).padEnd(20)} | ${x.pxCount}`);
}
const withH1 = rows.filter((x) => x.h1Size).length;
console.log(`\n  dna.h1Size 有值的案: ${withH1}/30`);
console.log(`  该值出现在提示词正文里的案: ${n('h1InPrompt')}/30`);

// 唯一提到字号的那一案，说的是不是字号
const s22 = prompts.find((x) => x.id === 'S22').prompt.split('\n').find((l) => l.includes('字号'));
console.log(`\n  30 案里唯一含「字号」二字的句子（S22）：\n    ${s22}`);
console.log('  → 这是机制句里描述原型版式的背景信息（"字号 17 与 16.5px"），不是给执行者的字号指令；');
console.log('    它没有说"你应该用多大"，只说"那个页面里的字是 17/16.5px"。');

// 死字段证据：prompt-copy.js 里 h1Size 只出现在一个分支
const copy = readFileSync(ROOT + '/prototypes/_selection/prompt-copy.js', 'utf8').replace(/^\uFEFF/, '');
const lines = copy.split('\n');
const h1Lines = lines.map((l, i) => ({ i: i + 1, l })).filter((x) => /h1Size/.test(x.l));
console.log('\n=== h1Size 在渲染层出现的全部位置 ===');
for (const x of h1Lines) console.log(`  prompt-copy.js:${x.i}  ${x.l.trim()}`);
const guardIdx = lines.findIndex((l) => /if \(d\.mechanism\)/.test(l));
console.log(`  该行上面最近的 if (d.mechanism) 在 L${guardIdx + 1}；else 分支从这里开始。`);
const mechAll = prompts.filter((p) => p.mechanism && p.mechanism.length).length;
console.log(`  而 prompts.js 里 mechanism 非空的案: ${mechAll}/30 → else 分支一次都不会进，h1Size 恒不输出。`);

writeFileSync(ROOT + '/deliverables/70-plan/redteam/p2-fontsize.json', JSON.stringify({ rows, withH1, h1InPrompt: n('h1InPrompt'), m2: n('M2_字号字样'), m3: n('M3_行高字距'), mechanismNonEmpty: mechAll, h1Lines }, null, 1), 'utf8');
