#!/usr/bin/env node
/* 动效段的效果对照：把 motion 写进提示词，产物到底变没变？
 *
 * 【为什么需要这个脚本】
 *
 * 2026-11-21 之前，`data.js` 的 `motion` 字段 35/35 有值，而进入提示词 0/35。
 * 补上之后，"补对了没有"不能靠读提示词确认 —— 那只能证明文本变了，
 * 不能证明**产物**变了。这是本仓库反复区分的一件事。
 *
 * 这里用 S34 的两轮盲测做受控对照：
 *   · S34      第一轮，提示词**没有**动效段（2026-11-20 跑）
 *   · S34-r2   第二轮，提示词**有**动效段（2026-11-21 跑）
 *
 * 同一个案、同一份规格、同一个 harness、同一类输入，唯一的差别是动效段。
 * 所以两者在动效实现上的差异可以归因到那一段。
 *
 * 【已知的局限，必须写出来】
 *
 * 两轮之间提示词还变了别的（S34 的 degrades 从 no 改 yes、
 * 散文里的条目数改成不写死、⑤ 的渐变措辞）。所以这不是严格的单变量实验 ——
 * 但那些改动都不涉及动效，而下面四个探针全是动效专有的结构
 * （prefers-reduced-motion / 逐块延迟 / animation 声明 / @keyframes），
 * 它们不可能由 degrades 或散文改动产生。
 *
 * 另一个局限：n=1。两轮各一个产物，不能排除偶然。
 * 这里只报"发生了"，不报"平均会怎样"。
 *
 * 用法：node _motion-effect.mjs
 * 退出码：对照成立 0；产物缺失 2；断言失败 1
 */
import { readFileSync, existsSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = ROOT + '/deliverables/78-northstar/_blindtest';

/* 四个探针都只在"实现动效"时出现，纯静态页面不会碰它们。 */
const PROBES = [
  ['prefers-reduced-motion', /prefers-reduced-motion/],
  ['逐块延迟变量', /--text-delay|--delay|animation-delay/],
  ['animation 声明', /animation:\s*[a-z-]+/],
  ['@keyframes', /@keyframes/],
];

function read(id) {
  const f = `${BT}/${id}/index.html`;
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
}

const r1 = read('S34');
const r2 = read('S34-r2');
if (!r1 || !r2) {
  console.error(`缺产物：${!r1 ? 'S34' : ''} ${!r2 ? 'S34-r2' : ''}（对照需要两轮都在）`);
  process.exit(2);
}

console.log('动效段的效果对照（同一个案，唯一的差别是提示词里有没有那一段）\n');
console.log('案'.padEnd(10) + '版本'.padEnd(22) + PROBES.map((p) => p[0]).join('  '));
const rows = [['S34', '第一轮·提示词无动效段', r1], ['S34-r2', '第二轮·提示词有动效段', r2]];
for (const [id, label, h] of rows) {
  console.log(id.padEnd(10) + label.padEnd(22) + PROBES.map((p) => (p[1].test(h) ? '✓' : '✗')).join('       '));
}

/* 数值级对照：降级段里那串间距值，是提示词独有的，不该被猜中。 */
const prompt = readFileSync(`${BT}/S34-r2/_prompt.txt`, 'utf8');
const wantM = prompt.match(/块间距各差 8px（([^）]*)）/);
const seg = r2.match(/prefers-reduced-motion[\s\S]*?\n\s*\}/);
const got = seg ? [...seg[0].matchAll(/margin-bottom:\s*(\d+)px/g)].map((x) => x[1]).join('/') : '';

console.log('');
if (wantM) {
  console.log(`提示词要求（降级段）：块间距 ${wantM[1]}`);
  console.log(`第二轮实际实现：      ${got || '（未找到）'}`);
  console.log(`逐字命中：           ${wantM[1] === got ? '✓ 全部命中' : '✗ 不符'}`);
} else {
  console.log('⚠️ 提示词里没找到降级段的间距值 —— 这一行判不了');
}

/* 断言：第一轮四项全无、第二轮四项全有、间距逐字命中。
 * 任何一条不成立，说明"补动效段"这件事没有真正到达产物。 */
const a = PROBES.every((p) => !p[1].test(r1));
const b = PROBES.every((p) => p[1].test(r2));
const c = wantM && wantM[1] === got;

console.log('');
const checks = [
  ['第一轮完全没有动效实现', a],
  ['第二轮四项动效结构齐全', b],
  ['降级段的间距值逐字命中', !!c],
];
let bad = 0;
for (const [name, ok] of checks) {
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
}
console.log('');
console.log(bad === 0
  ? '结论：动效段到达了产物 —— 这是「把 motion 写进提示词」有效的直接证据（n=1，只证明发生，不证明普遍性）。'
  : `结论：${bad} 条断言不成立，动效段没有完整到达产物，需要查。`);

process.exit(bad === 0 ? 0 : 1);
