#!/usr/bin/env node
// 从 04/05/06 三份方案文件里切出每个方案的"12 字段"块，写成一案一文件。
// 只做机械切分，不做任何判断、不改一个字。
//
//   node extract-specs.mjs
//
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const DELIV = join(ROOT, 'deliverables');
const OUT = join(ROOT, 'prototypes', '_specs');
const SOURCES = [
  '04-schemes-01-10.md',
  '05-schemes-11-20.md',
  '06-schemes-21-30.md',
];

mkdirSync(OUT, { recursive: true });

const found = new Map();   // n -> { title, body, src, startLine, endLine }
const HEAD = /^###\s*方案\s*(\d+)\s*[｜|]\s*(.+?)\s*$/;
const STOP = /^##\s/;      // 一级分节（自检汇总等）即止

for (const name of SOURCES) {
  const p = join(DELIV, name);
  if (!existsSync(p)) { console.error('缺文件: ' + p); process.exit(2); }
  const lines = readFileSync(p, 'utf8').split(/\r?\n/);
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = HEAD.exec(lines[i]);
    if (m) {
      cur = { n: Number(m[1]), title: m[2], body: [], src: name, startLine: i + 1 };
      found.set(cur.n, cur);
      continue;
    }
    if (cur && STOP.test(lines[i])) {          // 进入自检汇总，收尾
      cur.endLine = i;                          // 上一行
      cur = null;
      continue;
    }
    if (cur) cur.body.push(lines[i]);
  }
  if (cur) { cur.endLine = lines.length; cur = null; }
}

// 尾部空行裁掉
for (const r of found.values()) {
  while (r.body.length && r.body[r.body.length - 1].trim() === '') r.body.pop();
  r.endLine = r.startLine + r.body.length;
}

/* ⚠️ 2026-11-10（Q2）：下面两处 `n <= 30` 原本是写死的上界。
 *
 * 后果：新增 S31–S35 之后
 *   · `missing` 检查只覆盖 1..30 —— S31 的规格缺失不会被报（静默）；
 *   · 切分循环只跑 1..30 —— S31 的 `_specs/S31.md` **永远不会生成**（静默）。
 * 而 `collect-schemes.mjs` 读到没有规格的案时，`def` 会是空串，
 * 站点上那一案显示为一句话都没有的空壳 —— 且没有任何闸门会说"你没生成规格"。
 *
 * 改成从 **SOURCES 里实际切到的方案号**推上界，不再维护一个数字。
 * 想加新案：把 `07-schemes-31-35.md` 加进 SOURCES 即可，无需记得改两处循环。 */
const numbers = [...found.keys()].sort((a, b) => a - b);
const maxN = numbers.length ? numbers[numbers.length - 1] : 0;

const missing = [];
for (let n = 1; n <= maxN; n++) if (!found.has(n)) missing.push(n);
if (missing.length) {
  console.error('未切到方案: ' + missing.join(', '));
  process.exit(3);
}

const rows = [];
for (const n of numbers) {
  const r = found.get(n);
  const id = 'S' + String(n).padStart(2, '0');
  const body = r.body.join('\n');
  const cjk = (body.match(/[\u4e00-\u9fff]/g) || []).length;
  // 12 字段标题是否齐全（字段名以"数字."开头）
  const fieldRe = /^\s*(\d{1,2})[.、]\s*(配色系统|字体策略|一句话视觉定义|美学家族|布局与网格|关键视觉元素|动效与交互|去 AI 味审查点|反 AI 味风险|适用场景|可落地要点|方案编号)/gm;
  const fields = new Set();
  let fm; while ((fm = fieldRe.exec(body))) fields.add(fm[1]);
  const out = [
    `# ${id} 单案规格（机械切分，未改一字）`,
    ``,
    `> 源：\`deliverables/${r.src}\` 第 ${r.startLine}–${r.endLine} 行`,
    `> 原标题：方案 ${n}｜${r.title}`,
    `> 正文汉字数：${cjk}`,
    `> **本文件只是 12 字段原文。当前有效色值／字体／错误码以 \`_CURRENT-VALUES.md\` 为准；两者不一致时以后者为准。**`,
    ``,
    `---`,
    ``,
    body,
    ``,
  ].join('\n');
  writeFileSync(join(OUT, id + '.md'), out, 'utf8');
  rows.push({ id, n, title: r.title, src: r.src, lines: `${r.startLine}-${r.endLine}`, cjk, fields: fields.size, bytes: Buffer.byteLength(out, 'utf8') });
}

console.log('写入 ' + OUT);
console.log('');
console.log('| 案 | 标题 | 源 | 行 | 汉字 | 字节 |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.id} | ${r.title} | ${r.src.slice(0, 2)} | ${r.lines} | ${r.cjk} | ${r.bytes} |`);
const cj = rows.map(r => r.cjk);
console.log('');
console.log(`汉字数：最低 ${Math.min(...cj)}（${rows.find(r => r.cjk === Math.min(...cj)).id}）、最高 ${Math.max(...cj)}（${rows.find(r => r.cjk === Math.max(...cj)).id}）、平均 ${Math.round(cj.reduce((a, b) => a + b, 0) / cj.length)}`);
console.log(`合计 ${cj.reduce((a, b) => a + b, 0)} 汉字，30/30 全部切出。`);
