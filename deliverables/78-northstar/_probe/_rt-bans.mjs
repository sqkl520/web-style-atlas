#!/usr/bin/env node
/* 攻击 E：⑤ 只守 5 条，提示词里可机械验证的禁令有 12+ 条。
 * 拿 17 份真实产物扫「⑤ 没守的」那几条，看漏报是否**已经发生**。
 *
 * 每条都用产物全文，不依赖 score.mjs 的实现；判据是否该报由提示词原文决定。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BT, score } from './_rt-scorelib.mjs';

const ids = readdirSync(BT, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^S\d/.test(d.name))
  .map(d => d.name).sort();

console.log('══ E1 ⑤ 未守的禁令，在真实产物里的命中 ══\n');
const CHECKS = [
  {
    name: '⑥ 不用透明度',
    re: /opacity\s*:\s*(0?\.\d+|[01](?!\d))|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0?\.\d+/g,
    note: 'opacity<1 或 rgba 带 alpha',
  },
  {
    name: '⑧ 动效只用机制句那一个动作',
    re: /animation\s*:|@keyframes\s+|animation-name\s*:/g,
    note: '任何 keyframes 动画',
  },
  {
    name: '⑧ 其余位置保持静止（transition）',
    re: /transition\s*:/g,
    note: '任何 transition',
  },
  {
    name: '⑤ 图形只用本案线宽级的线条',
    re: /<(svg|path|circle|rect|polygon)\b|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
    note: 'svg 图形或 emoji',
  },
  {
    name: '6. 最大那一档必须够大（标题实测量）',
    re: null,
    note: '由 ③ 字号判据覆盖',
  },
];

for (const c of CHECKS) {
  if (!c.re) continue;
  const hitCases = [];
  for (const id of ids) {
    const p = join(BT, id, 'index.html');
    if (!existsSync(p)) continue;
    const h = readFileSync(p, 'utf8');
    const m = h.match(c.re);
    if (m) hitCases.push(`${id}(${m.length})`);
  }
  console.log(`  ${c.name}`);
  console.log(`    ${c.note.padEnd(28)} 命中 ${hitCases.length}/${ids.length} 案：${hitCases.join(' ') || '无'}`);
}

console.log('\n══ E2 ① 配色：产物里出现了多少提示词没给的 hex（"不新增更多彩色"） ══\n');
for (const id of ids) {
  const hp = join(BT, id, 'index.html'), pp = join(BT, id, '_prompt.txt');
  if (!existsSync(hp) || !existsSync(pp)) continue;
  const h = readFileSync(hp, 'utf8'), p = readFileSync(pp, 'utf8');
  const promptHex = new Set((p.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()));
  const htmlHex = new Set((h.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()));
  const extra = [...htmlHex].filter(x => !promptHex.has(x));
  const r = score(id);
  const reported = r.colors ? r.colors.missing.length : -1;
  if (extra.length) console.log(`  ${id}  产物多出 ${extra.length} 个提示词外的 hex：${extra.slice(0, 8).join(' ')}${extra.length > 8 ? ' …' : ''}　（① 只报"缺"${reported} 个，不报"多")`);
}
console.log('\n  （① 的全部输出是「提示词的 N 个 hex 出现了几个」——多出来的颜色不在判据视野里。）');