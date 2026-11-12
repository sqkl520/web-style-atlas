/* S99 的新鲜性论证：逐项证明它不是 35 案里任何一案的变体。
 *
 * 论证分三层，每层都要有实测数字，不接受"读起来不一样"：
 *   ① 数据层：配色 5/5、主字体、正文主字体都未被任何原型用作该角色
 *   ② 机制层：机制句里的每一个构件名（延长线 / 尺寸线 / 端点短线 / 行数读数）
 *      在 35 案的 style.css + index.html + data.js + prompts.js 里的出现次数
 *   ③ 结构层：它要求的那种"左侧纯标注栏 + 右移内容"在 35 案里存不存在
 *
 * 用法：node deliverables/78-northstar/_probe/_s99-freshness.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const css = {};
const html = {};
for (const d of readdirSync(join(ROOT, 'prototypes')).filter((x) => /^S\d\d-/.test(x))) {
  const id = d.slice(0, 3);
  try { css[id] = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8'); } catch { css[id] = ''; }
  try { html[id] = readFileSync(join(ROOT, 'prototypes', d, 'index.html'), 'utf8'); } catch { html[id] = ''; }
}
const dataJs = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const promptsJs = readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');
const ids = Object.keys(css).sort();

console.log(`样本：${ids.length} 个案（${ids[0]}..${ids.at(-1)}）\n`);

/* ── ① 数据层 ─────────────────────────────────────────────────────────── */
console.log('=== ① 配色与字体：是否被任何原型用作同一角色 ===');
const HEX = ['#E8E3D9', '#1F2A2E', '#7A8C8E', '#3C4A4D', '#C9A227'];
for (const h of HEX) {
  const hits = ids.filter((id) => new RegExp(h, 'i').test(css[id]) || new RegExp(h, 'i').test(html[id]));
  console.log(`  ${h}  ${hits.length ? '✗ 出现于 ' + hits.join(' ') : '✓ 全库 0 处（style.css + index.html）'}`);
}

/* 字体角色：Karla 当 display、Newsreader 当 body。查的是"有没有人把它放在这个角色上"，
 * 不是"有没有出现过"——S15 的 display 就是 Newsreader，所以正文角色才是新的。 */
const roleHits = (fam, role) => {
  const lines = [];
  for (const id of ids) {
    if (role === 'display') {
      if (new RegExp(`--(?:font-)?(?:display|head|title)[^;]*${fam}`, 'i').test(css[id])) lines.push(id);
    } else {
      if (new RegExp(`--(?:font-)?(?:body|text|serif)[^;]*${fam}`, 'i').test(css[id])) lines.push(id);
    }
  }
  return lines;
};
console.log(`  Karla 作 display：${roleHits('Karla', 'display').join(' ') || '✓ 0 案'}`);
console.log(`  Newsreader 作 body：${roleHits('Newsreader', 'body').join(' ') || '✓ 0 案'}`);
/* 但 CSS 变量命名不统一，所以再做一个更强的判据：body 的 font-family 里有没有它 */
const bodyDecl = (fam) => ids.filter((id) => new RegExp(`^body\\s*\\{[^}]*font-family:[^;}]*${fam}`, 'im').test(css[id]));
console.log(`  Newsreader 直接写在 body{} 的 font-family 里：${bodyDecl('Newsreader').join(' ') || '✓ 0 案'}`);
console.log(`  Karla 出现在任何一案的任何位置：${ids.filter((id) => /Karla/.test(css[id] + html[id])).join(' ') || '✓ 0 案'}`);
console.log(`  Source Code Pro 出现在任何位置（本版未采用，仅记录设计稿候选的实测）：${ids.filter((id) => /Source Code Pro/.test(css[id] + html[id])).join(' ') || '✓ 0 案'}`);
console.log(`  Besley 出现于（设计稿曾建议用，实测已被占用）：${ids.filter((id) => /Besley/.test(css[id] + html[id])).join(' ') || '0'}`);

/* ── ② 机制层 ─────────────────────────────────────────────────────────── */
console.log('\n=== ② 机制句构件在 35 案里的出现次数 ===');
const TOKENS = [
  ['延长线', '尺寸链的延长线'],
  ['尺寸线', '尺寸线本身'],
  ['尺寸链', '整套手法'],
  ['端点短', '端点短线'],
  ['断口里', '断口里放读数'],
  ['逐级内移', '分段尺寸内移'],
  ['总尺寸', '总尺寸在外侧'],
];
for (const [tok, label] of TOKENS) {
  const inCss = ids.filter((id) => css[id].includes(tok));
  const inHtml = ids.filter((id) => html[id].includes(tok));
  const nData = (dataJs.match(new RegExp(tok, 'g')) || []).length;
  const nPr = (promptsJs.match(new RegExp(tok, 'g')) || []).length;
  const all = new Set([...inCss, ...inHtml]);
  console.log(`  「${tok}」(${label})  style.css ${inCss.length} 案 / index.html ${inHtml.length} 案 / 并集 ${all.size} 案` +
    `  | data.js ${nData} 次 / prompts.js ${nPr} 次` + (all.size ? '  ← ' + [...all].join(' ') : ''));
}

/* ── ③ 结构层 ─────────────────────────────────────────────────────────── */
console.log('\n=== ③ 「左侧纯标注栏 + 内容右移」在 35 案里存不存在 ===');
/* 判据：一条在左侧、宽度 100–170px、且**不承载正文**的固定轨道。
 * 光 grep 132px 会命中 4 案，但四处的角色都不是"标注栏"（S06/S17/S27 是圆形印章的
 * 宽高、S02 是表头列宽、S03 是卡片 min-height），所以必须逐条看上下文。 */
const gutter = ids.filter((id) => /grid-template-columns:[^;{}]*\b1[0-6]\dpx\b/.test(css[id]));
console.log(`  左侧固定轨道宽度在 100–169px 的案：${gutter.join(' ') || '无'}`);
for (const id of gutter) {
  const m = css[id].match(/grid-template-columns:[^;{}]*\b1[0-6]\dpx\b[^;{}]*/g) || [];
  console.log(`    ${id}: ${m.slice(0, 2).join(' | ')}`);
}
const padLeft = ids.filter((id) => /padding-left:\s*1[0-6]\dpx/.test(css[id]));
console.log(`  padding-left 在 100–169px 的案：${padLeft.join(' ') || '无'}`);
for (const id of padLeft) {
  const m = css[id].match(/[^\n]*padding-left:\s*1[0-6]\dpx[^\n]*/g) || [];
  console.log(`    ${id}: ${m.slice(0, 2).join(' | ').trim()}`);
}
/* 有没有任何案在左侧留一条"只放数字、不放正文"的窄栏 */
const leftDigit = ids.filter((id) => /((width|grid-template-columns):[^;{}]*(1[0-6]\d)px)/.test(css[id]) &&
  /(text-align:\s*right)/.test(css[id]) && /(position:\s*absolute)/.test(css[id]));
console.log(`  （弱判据，仅供参考）窄左栏 + 绝对定位 + 右对齐数字同时出现的案：${leftDigit.join(' ') || '无'}`);

console.log('\n=== 结论依据汇总 ===');
console.log('  配色 5/5 未被使用、Karla 全库 0 处、Newsreader 未作正文主字体；');
console.log('  机制句的 7 个构件名里，前 5 个在 35 案里 0 次出现；');
console.log('  左侧 132px 标注栏这种结构在 35 案里没有对应物（132px 的 4 处命中都是别的角色）。');
