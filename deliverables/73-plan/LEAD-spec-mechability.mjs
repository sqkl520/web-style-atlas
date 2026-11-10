/* P3 的第一步：规格字段里，哪些是机械可核的？
 *
 * 做法：把 30 份 _specs/Sxx.md 里「数字 + 单位/名词」的断言抽出来，
 * 分类成「可机械核」与「不可机械核」，统计数量。这决定了 P3 能做多大。
 *
 * 可机械核的例子：
 *   「12 栏」      → CSS 里有 repeat(12, ...) 吗
 *   「基线 8px」    → CSS 里有 8px 相关的变量/间距吗
 *   「0.4px 与 0.8px 两级」→ CSS 里 stroke-width/border 只有这两级吗
 *   「面积和 100」  → palette 的百分比和是否为 100
 *
 * 不可机械核的例子：
 *   「情绪：陈雅」  → 审美判断
 *   「为什么不像 AI 选的」
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const specs = readdirSync(join(P, '_specs')).filter((f) => /^S\d{2}\.md$/.test(f)).sort();

/* 各类断言的模式。命中即计入对应桶。 */
const PATTERNS = [
  { key: '栏数', re: /(\d+)\s*栏/g, kind: 'mech', how: 'CSS 里 repeat(N, ...) 或 grid-template-columns 的列数' },
  { key: '基线', re: /基线\s*(\d+(?:\.\d+)?)\s*px/g, kind: 'mech', how: 'CSS 里该值是否作为间距/行高单位出现' },
  { key: '线宽等级', re: /(\d+(?:\.\d+)?)\s*px[^。；]{0,6}与\s*(\d+(?:\.\d+)?)\s*px[^。；]{0,8}两级/g, kind: 'mech', how: 'CSS/HTML 里的 stroke-width / border 是否只有这两级' },
  { key: '面积和', re: /面积和\s*100/g, kind: 'mech', how: 'palette 的百分比之和是否 = 100' },
  { key: '断点', re: /[<≥]\s*(\d{3,4})\s*px/g, kind: 'mech', how: '@media 的阈值是否与规格一致' },
  { key: '字号', re: /(\d+)\s*px\s*\/\s*行高\s*([\d.]+)/g, kind: 'mech', how: 'CSS 里该 font-size / line-height 是否存在' },
  { key: '情绪', re: /情绪[：:][^）)]*/g, kind: 'aesthetic', how: '审美判断，不可机械核' },
  { key: '为什么不像AI', re: /为什么不像\s*AI[^。]{0,40}/g, kind: 'aesthetic', how: '论证性文字，不可机械核' },
];

const tally = new Map();
const perCase = [];

for (const f of specs) {
  const id = f.slice(0, 3);
  const t = readFileSync(join(P, '_specs', f), 'utf8');
  const counts = {};
  for (const p of PATTERNS) {
    const n = [...t.matchAll(p.re)].length;
    if (!n) continue;
    counts[p.key] = n;
    const cur = tally.get(p.key) || { kind: p.kind, n: 0, cases: 0, how: p.how };
    cur.n += n;
    cur.cases += 1;
    tally.set(p.key, cur);
  }
  perCase.push({ id, counts });
}

console.log('═══ 规格断言的种类与数量（30 份规格合计）═══\n');
console.log('类型            可机械核   出现次数   涉及案数');
console.log('─'.repeat(62));
for (const [k, v] of [...tally.entries()].sort((a, b) => (a[1].kind === b[1].kind ? b[1].n - a[1].n : a[1].kind === 'mech' ? -1 : 1))) {
  console.log(`${k.padEnd(14)}  ${(v.kind === 'mech' ? '✓ 是' : '✗ 否').padEnd(8)}  ${String(v.n).padStart(8)}   ${String(v.cases).padStart(6)}`);
}

const mech = [...tally.entries()].filter(([, v]) => v.kind === 'mech');
const aes = [...tally.entries()].filter(([, v]) => v.kind === 'aesthetic');
console.log(`\n  可机械核: ${mech.length} 类，合计 ${mech.reduce((a, [, v]) => a + v.n, 0)} 条断言`);
console.log(`  纯审美:   ${aes.length} 类，合计 ${aes.reduce((a, [, v]) => a + v.n, 0)} 条断言`);

console.log('\n═══ 逐案的机械断言密度（前 10）═══');
const mechKeys = new Set(mech.map(([k]) => k));
const rows = perCase.map((c) => ({ id: c.id, n: Object.entries(c.counts).filter(([k]) => mechKeys.has(k)).reduce((a, [, v]) => a + v, 0) }));
rows.sort((a, b) => b.n - a.n);
for (const r of rows.slice(0, 10)) console.log(`  ${r.id}  ${r.n} 条`);
console.log(`  … 最少: ${rows[rows.length - 1].id}  ${rows[rows.length - 1].n} 条`);

console.log('\n═══ 结论：P3 的可机械核部分有多大 ═══');
console.log(`  每案平均 ${(rows.reduce((a, r) => a + r.n, 0) / rows.length).toFixed(1)} 条机械断言，30 案合计 ${rows.reduce((a, r) => a + r.n, 0)} 条`);
