#!/usr/bin/env node
/* audit 字段该不该进提示词？—— 实测数据支持的裁决
 *
 * 【为什么这是个需要证据的问题】
 *
 * `audit`（去 AI 味审查点）35/35 有值、合计 11,365 字，此前 0/35 进提示词。
 * 按 check-prompt-fields 的标准这是个缺口。但这个仓库有一条硬发现，
 * 写在 prompt-copy.js:1286 的注释里：
 *
 *   arXiv 2601.08070 "Semantic Gravity Wells"（n=40,000，含 activation patching
 *   因果干预）：87.5% 的违规发生在「明确点名被禁词」时 —— 写下「不要用 #6366F1」
 *   会**提高**模型输出 #6366F1 的概率。
 *
 * 而 `audit` 这个字段的本质就是"我故意反了什么"。
 * 所以「补进去」和「负向指令有害」这两条会直接冲突。
 *
 * 【本脚本测什么】
 *
 * 1. audit 里负面措辞的密度（这是冲突的量）
 * 2. audit 里内部条款编号的密度（这些对 AI 是纯噪音）
 * 3. 能不能自动抽出"正面等价说法"（如果能，就可以只补正面部分）
 *
 * 【结论写在输出最后，由数据推出，不由偏好决定】
 */
import { readFileSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const win = {};
new Function('window', readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'))(win);

/* 负面措辞：这一组是"点名某个被禁做法"的语言标记 */
const NEG = /反\s*C-|反\s*0[0-9]-|不使用|不存在|禁止|不要|没有|零\s*[a-z-]|而不是|不靠/g;
/* 内部条款编号：只有评审者看得懂 */
const CASE_REF = /C-\d+\.\d+|0[0-9]-[a-z-]+\.md|P\d+/g;
/* 正面等价说法的标记 */
const POS = /跳脱之处[：:]|而是|改由|只靠|靠/g;

let negTotal = 0, refTotal = 0, posTotal = 0, chars = 0;
const per = [];
for (const s of win.SCHEMES) {
  const a = s.audit || '';
  if (!a) continue;
  chars += a.length;
  const neg = (a.match(NEG) || []).length;
  const ref = (a.match(CASE_REF) || []).length;
  const pos = (a.match(POS) || []).length;
  negTotal += neg; refTotal += ref; posTotal += pos;
  per.push({ id: s.id, neg, ref, pos, len: a.length });
}

/* 能不能只抽正面部分？试一个保守的抽取器，看覆盖率。 */
function extractPositive(a) {
  const out = [];
  for (const raw of a.split(/(?=[①②③④⑤⑥⑦⑧⑨]|第[一二三四五六七八九])/)) {
    const t = raw.trim();
    if (!t) continue;
    const m = t.match(/跳脱之处[：:]\s*([^。]+)/);
    if (m) { out.push(m[1].trim()); continue; }
    /* 「而是 X」「只靠 X」「靠 X」这类 */
    const m2 = t.match(/(?:而是|改由|只靠)\s*([^。；]+)/);
    if (m2) out.push(m2[1].trim());
  }
  return out.join('；');
}
let extractable = 0;
const empty = [];
for (const s of win.SCHEMES) {
  if (!s.audit) continue;
  if (extractPositive(s.audit).length >= 20) extractable++;
  else empty.push(s.id);
}

console.log('audit 字段该不该进提示词：实测\n');
console.log(`  35 案合计 ${chars.toLocaleString()} 字`);
console.log(`  负面措辞     ${negTotal} 处（密度 ${(negTotal / chars * 1000).toFixed(1)} 处/千字）`);
console.log(`  内部条款编号 ${refTotal} 处（C-x.y / 文件名 / P 编号）`);
console.log(`  正面标记     ${posTotal} 处`);
console.log('');
console.log('  负面密度最高的五案：');
for (const p of [...per].sort((a, b) => b.neg / b.len - a.neg / a.len).slice(0, 5)) {
  console.log(`    ${p.id}  ${p.neg} 处 / ${p.len} 字 = ${(p.neg / p.len * 1000).toFixed(1)} 处/千字`);
}
console.log('');
console.log(`  自动抽取正面说法：能抽出 ≥20 字的 ${extractable}/35 案`);
console.log(`  抽不出的 ${empty.length} 案：${empty.join(' ') || '无'}`);
console.log('');

const verdict = [];
if (negTotal / chars > 0.01) verdict.push(`负面措辞密度 ${(negTotal / chars * 100).toFixed(1)}%（每 100 字就有一处点名被禁做法）`);
if (refTotal) verdict.push(`${refTotal} 处内部条款编号会一起泄漏，AI 没有图鉴目录`);
if (extractable < 35) verdict.push(`正面等价说法只能自动抽出 ${extractable}/35 案，其余 ${35 - extractable} 案整段就是"我反了什么"`);

console.log('结论：');
for (const v of verdict) console.log(`  · ${v}`);
console.log('');
if (verdict.length >= 2) {
  console.log('  → audit **不应整段进提示词**。它与"点名即加权"直接冲突，');
  console.log('    而这个仓库已经用 8 条正面处方的改写处理过同一个问题（见 prompt-copy.js 防退化段）。');
  console.log('  → 要补的是一层**转换**（把"反 X"翻成"用 Y"），不是直接拼接。');
  console.log('    转换需要人工逐案做，因为自动抽取只覆盖一部分。');
} else {
  console.log('  → 数据不支持"不该补"的结论，请重新评估。');
}
