/* plan-probe-p1a.mjs — 只读：把 check-contract.mjs 的解析边界缺陷钉死到行号。
 *
 * 待证命题：
 *   `parseAllowTable()` 用 `md.indexOf('9.15')` 定位切片起点。
 *   但 `9.15` 这个字符串在 `_CONTRACT.md` 里**第一次出现是 §6 的表格行**（L110），
 *   不是 §9.15 的标题行（L194）。于是切片多吃了 84 行，§6 的表格整个落进"允许表"。
 *   后果：任何人在 §6 表里写一行 `| \`某规则\` | … | … |`，那条规则就被自动豁免。
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const md = readFileSync(join(ROOT, 'prototypes/_CONTRACT.md'), 'utf8');

const iNaive = md.indexOf('9.15');
const lineOf = (idx) => md.slice(0, idx).split('\n').length;
const headingIdx = md.search(/^\*\*9\.15[^\n]*/m);

console.log('═══ P1a · parseAllowTable 的切片起点 ═══\n');
console.log(`  md.indexOf('9.15')        → 字符 ${iNaive}，第 ${lineOf(iNaive)} 行`);
console.log(`  该行原文                  → ${md.split('\n')[lineOf(iNaive) - 1].slice(0, 90)}`);
console.log(`  /^\\*\\*9\\.15/ 标题行       → 字符 ${headingIdx}，第 ${lineOf(headingIdx)} 行`);
console.log(`  该行原文                  → ${md.split('\n')[lineOf(headingIdx) - 1].slice(0, 90)}`);
console.log(`  ⇒ 朴素切片多吃了 ${lineOf(headingIdx) - lineOf(iNaive)} 行`);

/* 朴素切片里，§9.15 标题之前有哪几行会被误当"允许行" */
const secNaive = md.slice(iNaive, md.indexOf('9.16', iNaive));
const secFixed = md.slice(headingIdx, md.indexOf('9.16', headingIdx));
const rowsOf = (sec) => [...sec.split(/\r?\n/)]
  .filter((l) => /^\|\s*`[\w-]+`\s*\|/.test(l))
  .map((l) => (l.match(/^\|\s*`([\w-]+)`/) || [])[1]);

console.log('\n  ── 两种切片各解析出哪些规则 ──');
console.log('  朴素 indexOf：', rowsOf(secNaive).join(', ') || '（无）');
console.log('  修正 标题行  ：', rowsOf(secFixed).join(', ') || '（无）');
console.log(`  ⇒ 当前两者相同（${rowsOf(secNaive).length} vs ${rowsOf(secFixed).length}），`);
console.log('     只是因为**目前恰好没有人在 §6 表里写反引号开头的行** —— 这不是正确性，是运气。');

/* 数一数 §6 表里"形式上完全合格"的行有多少 —— 这些行一旦出现就会被误收 */
const s6 = md.slice(md.indexOf('## 6'), headingIdx);
const s6lines = s6.split(/\r?\n/);
const wouldBeRows = s6lines.filter((l) => /^\|\s*`[\w-]+`\s*\|/.test(l));
console.log(`\n  §6 表里"若写成反引号开头就会被我误收"的行数：${wouldBeRows.length}`);
const s6rowCount = s6lines.filter((l) => /^\|/.test(l) && !/^\|\s*-+/.test(l) && !/^\|\s*规则/.test(l)).length;
console.log(`  §6 表的数据行总数：${s6rowCount}（其中规则名用 **加粗** 的 ${s6rowCount - wouldBeRows.length} 行）`);
console.log('  ⇒ §6 用的是 `| **不得横向溢出** |` 这种加粗写法，所以今天恰好不匹配 `^\\|\\s*` + 反引号。');
console.log('     契约作者换一种写法（或有人抄一行 §9.15 的格式进 §6），豁免表就被静默撑大。');

/* C0：报告缺失/损坏为什么是 WARN */
const chk = readFileSync(join(ROOT, 'prototypes/_build/check-contract.mjs'), 'utf8');
const c0 = chk.split(/\r?\n/).map((l, i) => ({ l, n: i + 1 })).filter((x) => /C0-report-missing|C0-report-unreadable/.test(x.l));
console.log('\n  ── C0：报告缺失/损坏的处理 ──');
for (const c of c0) console.log(`     check-contract.mjs:${c.n}  ${c.l.trim()}`);
console.log('     ⇒ 两处都是 add(\'WARN\', …)，而 exit 码只看 FAILS ⇒ "无法判定"被当成"契约成立"。');

/* 变异：在 §6 里加一行反引号行，能不能被 C3 看见 */
const injected = md.replace('| **不得横向溢出** |', '| `shadow` | 侧门 | 见 §9.15 |\n| **不得横向溢出** |');
const injNaive = rowsOf(injected.slice(injected.indexOf('9.15'), injected.indexOf('9.16', injected.indexOf('9.15'))));
const injFixed = rowsOf(injected.slice(injected.search(/^\*\*9\.15[^\n]*/m), injected.indexOf('9.16', injected.search(/^\*\*9\.15[^\n]*/m))));
console.log('\n  ── 注入一行 `| \`shadow\` | 侧门 | 见 §9.15 |` 到 §6 之后 ──');
console.log('  朴素切片解析出：', injNaive.join(', '));
console.log('  修正切片解析出：', injFixed.join(', '));
console.log(`  ⇒ 朴素切片 ${injNaive.includes('shadow') ? '**吃进了 shadow**（假绿）' : '没吃进'}`);
console.log(`  ⇒ 修正切片 ${injFixed.includes('shadow') ? '也吃进了（修法无效）' : '没吃进（修法有效）'}`);
