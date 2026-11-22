#!/usr/bin/env node
/* 把 rewrites.json 里的 35 段改写写回 data.js 的 audit 字段。
 *
 * 【为什么单独写一个】
 *
 * `data.js` 头部写着「由 collect-schemes.mjs 生成，勿手改」。但 audit 的内容
 * 源头是 `deliverables/04|05|06-schemes-*.md` 里那些规格文档，
 * 直接改那边会被 `quarter --write` 的 extract-specs → collect-schemes 链覆盖回去
 * （我在 S07/S11/S19 那次已经踩过一次）。
 *
 * 所以这里采取和那次相反的顺序：**先改 data.js，再改源头 md**。
 * 这个脚本只负责第一步，并且逐条校验：
 *   · 改写后的字符串里 0 处内部编号（C-x.y / P\d / 文件名 / N 号）
 *   · 改写后的字符串里 0 处负面措辞（反 C- / 不使用 / 不存在 / 禁止 / 不要 / 而不是 / 不靠）
 *   · 字符串能被 JS 正确转义（双引号、反斜杠）
 *
 * 用法：
 *   node deliverables/78-northstar/_probe/_audit-apply-to-data.mjs --dry-run
 *   node deliverables/78-northstar/_probe/_audit-apply-to-data.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const DATA = ROOT + '/prototypes/_selection/data.js';
const RW = ROOT + '/deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json';

const WRITE = process.argv.includes('--write');
const rw = JSON.parse(readFileSync(RW, 'utf8'));

const L1 = /C-\d+\.\d+|C-\d+\s*第\s*\d+\s*条|R-\d+|P\d+|\d{2}-[a-z-]+\.md|与\s*\d{1,2}\s*号/g;
const NEG = /反\s*C-|不使用|不存在|禁止|不要|而不是|不靠/g;

let text = readFileSync(DATA, 'utf8');
let ok = 0;
const problems = [];

for (const [id, rec] of Object.entries(rw)) {
  const after = rec.after;
  /* ① 内部编号清零 */
  const l1 = [...after.matchAll(L1)].map((m) => m[0]);
  if (l1.length) { problems.push(`${id}: 内部编号 ${l1.join(' ')}`); continue; }
  /* ② 负面措辞清零 */
  const neg = [...after.matchAll(NEG)].map((m) => m[0]);
  if (neg.length) { problems.push(`${id}: 负面措辞 ${[...new Set(neg)].join(' ')}`); continue; }

  /* ③ 找到该案的 audit 行并替换。
   * 用 `"id": "Sxx"` 定位块，再在块内找 `"audit": "…"`。
   * audit 值里含转义的双引号（\"），所以匹配要允许 \" 。 */
  const idIdx = text.indexOf(`"id": "${id}"`);
  if (idIdx < 0) { problems.push(`${id}: data.js 里找不到该案`); continue; }
  const seg = text.slice(idIdx, idIdx + 6000);
  const am = seg.match(/"audit": "((?:[^"\\]|\\.)*)"/);
  if (!am) { problems.push(`${id}: 找不到 audit 字段`); continue; }

  /* ④ 校验 before 逐字一致（用 data.js 现值反解 JS 字符串） */
  const current = JSON.parse('"' + am[1] + '"');
  if (current !== rec.before) {
    problems.push(`${id}: before 与 data.js 现值不一致（差 ${current.length - rec.before.length} 字）`);
    continue;
  }

  /* ⑤ 写回：新值要正确转义 */
  const escaped = after.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const oldLit = `"audit": "${am[1]}"`;
  const newLit = `"audit": "${escaped}"`;
  text = text.replace(oldLit, newLit);
  ok++;
}

console.log(`可写入 ${ok}/${Object.keys(rw).length} 段`);
if (problems.length) {
  console.log(`\n有 ${problems.length} 段不能写：`);
  for (const p of problems.slice(0, 10)) console.log('  ' + p);
}

if (WRITE && ok === Object.keys(rw).length) {
  writeFileSync(DATA, text, 'utf8');
  console.log('\n已写入 data.js');
} else if (WRITE) {
  console.log('\n有段落未通过校验，未写入（宁可不动，也不要写一半）。');
  process.exit(1);
} else {
  console.log('\n（dry-run，未写入。加 --write 才写。）');
}
