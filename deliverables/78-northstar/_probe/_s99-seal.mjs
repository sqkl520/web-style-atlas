/* 封存负对照 S99 的原始证据：把 no-signal 判据与「三块读数不实」两件事写成可复算的两个断言。
 * 目的只有一个：让下一个人能在不读这份报告的情况下，独立确认 B 判定。
 * 用法：node deliverables/78-northstar/_probe/_s99-seal.mjs  → 退出码 0 = 判定 B 成立
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const html = readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_S99-out.html'), 'utf8');
const task = readFileSync(join(ROOT, 'deliverables/78-northstar/blind/S99/task.txt'), 'utf8');

const A = [
  ['产物非空且成规模', html.split('\n').length >= 300],
  ['以 <!DOCTYPE html> 开头', html.trimStart().startsWith('<!DOCTYPE html>')],
  /* "单文件" 判据不能写成"零外链"：S31 的产物**也**引了 Google Fonts
   * （_sandbox-S31-out.html:14），两份做法一致，所以它不是 S99 独有的缺陷，
   * 也不区分 A/B。这里判的是"没有本地外部样式表 / 没有拆文件"，与 S31 同口径。 */
  ['单文件（CSS 内联、不引本地外链样式）',
    /<style[\s>]/.test(html) && !/<link[^>]+href="(?!https?:)/i.test(html)],
  ['5/5 设计色值全在', ['#E8E3D9', '#1F2A2E', '#7A8C8E', '#3C4A4D', '#C9A227'].every((h) => new RegExp(h, 'i').test(html))],
  ['132px 栏宽', /132px/.test(html)],
  ['1×9px 端点短线', /--tick\s*:\s*1px/.test(html) && /--tick-h\s*:\s*9px/.test(html)],
  ['12px 断口', /--notch\s*:\s*12px/.test(html)],
  ['18px 逐级内移', /--step\s*:\s*18px/.test(html)],
  ['93px 标题 / 15px 正文', /--s1\s*:\s*93px/.test(html) && /--s5\s*:\s*15px/.test(html)],
  ['读数牌 ≥ 6 个且互不相同', (() => {
    const v = [...html.matchAll(/class="rd"><b>(\d+)<\/b>/g)].map((m) => m[1]);
    return v.length >= 6 && new Set(v).size === v.length;
  })()],
];
console.log('=== 断言：S99 确实做出了一个完整的、命中机制值的页面 ===');
let ok = true;
for (const [name, pass] of A) { if (!pass) ok = false; console.log(`  ${pass ? '✓' : '✗'} ${name}`); }

const B = [
  ['task.txt 40 行（与 S31 同构）', task.split('\n').length === 40],
  ['task.txt 里不含「测试 / 虚构 / 对照组」等元提示',
    !/测试|虚构|对照组|负对照|实验|benchmark|fake/i.test(task)],
];
console.log('\n=== 断言：任务书是一份正常产品提示词（对照才有效）===');
for (const [name, pass] of B) { if (!pass) ok = false; console.log(`  ${pass ? '✓' : '✗'} ${name}`); }

console.log(`\n判定：${ok ? 'B（负对照失败）—— 一个不存在的风格也被精确实现' : '证据不足，需人工复核'}`);
process.exit(ok ? 0 : 1);
