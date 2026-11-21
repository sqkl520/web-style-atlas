#!/usr/bin/env node
/* 攻击 I：负对照 —— 造一个「故意坏产物」，看评分器抓不抓得住。
 *
 * 正对照只证明「不冤枉好人」。它不能证明「能抓住坏人」。
 * 这里拿 S01 的真实提示词，造一份**每一条硬约束都违反**的产物：
 *   圆角非 0、6px 线宽、绿色配色、链外字体、标准 box-shadow、
 *   字号塌了、条目数错、图片全重复。
 * 然后看 ①–⑤ 各报了什么。
 *
 * 同时做一个「对照版」：同样的坏产物，但把 box-shadow 的 0 写成 0px，
 * 用来隔离「单条判据的具体缺陷」。
 */
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { score, BT } from './_rt-scorelib.mjs';

const PROMPT = readFileSync(join(BT, 'S01', '_prompt.txt'), 'utf8');
const TMPID = 'S98bad';
const TMP = join(BT, TMPID);

function run(html, label) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'index.html'), html);
  writeFileSync(join(TMP, '_prompt.txt'), PROMPT);
  const r = score(TMPID);
  rmSync(TMP, { recursive: true, force: true });
  return r;
}

const badCommon = (shadow, radius, border, font, title, bodySize, items, imgs) => `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><title>坏产物</title>
<style>
  body{font-family:${font};font-size:${bodySize};background:#00FF00;color:#FF00FF}
  h1{font-size:${title}}
  .card{border-radius:${radius};box-shadow:${shadow};border-bottom:${border} solid #000}
  .x{border-left:6px solid #000}
</style></head><body>
  ${'<article class="card"><img src="images/same.jpg"></article>'.repeat(items)}
  <img src="images/same.jpg"><img src="images/same.jpg">
</body></html>`;

console.log('══ I1 故意坏产物（box-shadow 用最常见的无单位 0 写法）══\n');
{
  const html = badCommon('0 4px 12px #000', '8px', '6px', 'Arial', '20px', '12px', 9, 9);
  const r = run(html);
  const report = [];
  report.push(`① 配色  ${r.colors.got}/${r.colors.want}`);
  report.push(`  底色  ${r.colors.bgWant} → ${r.colors.bgCorrect ? '✓' : '✗'}`);
  report.push(`② 字体  ${r.fonts.got}/${r.fonts.want}`);
  if (r.geometry.radius) report.push(`③ 圆角  违反 ${r.geometry.radius.violations} 条`);
  if (r.geometry.lineWidth) report.push(`  线宽  越界 ${JSON.stringify(r.geometry.lineWidth.outside)}`);
  if (r.geometry.scale) report.push(`  字号  标题 ${r.geometry.scale.maxTitle}（要 ${r.geometry.scale.wantTitleAbs}）titleOk=${r.geometry.scale.titleOk}，正文 ${r.geometry.scale.body}（要 ${r.geometry.scale.wantBody}）bodyOk=${r.geometry.scale.bodyOk}`);
  report.push(`④ 条目  hit=${r.structure.items.hit} 选中 <${r.structure.items.gotTag}>=${r.structure.items.got}（应 5）`);
  report.push(`  图片  hit=${r.structure.pictures.hit} got=${r.structure.pictures.got}`);
  report.push(`⑤ 禁项  ${r.banned.length ? r.banned.map(b => b.rule + '×' + b.hits).join('；') : '无违反 ← 没有任何一项'}`);
  console.log(report.map(x => '  ' + x).join('\n'));
  console.log('');
  console.log('  这份产物违反了：圆角(8px)、线宽(6px)、配色(绿/品红)、字体(Arial)、');
  console.log('  阴影(0 4px 12px)、字号(正文12/标题20)、条目(9条)、图片(全重复)。');
  console.log(`  → ⑤ 禁项只有 ${r.banned.length} 项，其中**没有"无阴影"**。`);
}

console.log('\n══ I2 同一份产物，把阴影改成 0px 4px 12px（只差一个单位）══\n');
{
  const html = badCommon('0px 4px 12px #000', '8px', '6px', 'Arial', '20px', '12px', 9, 9);
  const r = run(html);
  console.log(`  ⑤ 禁项  ${r.banned.length ? r.banned.map(b => b.rule + '×' + b.hits).join('；') : '无违反'}`);
  console.log('  → 同一个阴影，只因 x 偏移写成 0px 而不是 0，就被抓到了。');
  console.log('    CSS 里 `0` 和 `0px` 长度等价，浏览器渲染完全一样。');
}

console.log('\n══ I3 假阴性清单：哪些"坏"根本没判据管 ══\n');
{
  const html = badCommon('0px 4px 12px #000', '8px', '6px', 'Arial', '20px', '12px', 9, 9);
  const r = run(html);
  const missed = [];
  if (!r.banned.some(b => b.rule === '新增彩色')) missed.push('配色新增 #00FF00/#FF00FF（提示词写「不新增更多彩色」）→ ① 只查"缺"，不查"多"');
  if (!r.banned.some(b => b.rule === '透明度')) missed.push('opacity 半透明（提示词写「不用透明度」）→ ⑤ 没有这条');
  if (!r.banned.some(b => b.rule === '动效')) missed.push('任意 animation（提示词写「只用机制句那一个动作」）→ ⑤ 没有这条');
  if (!r.banned.some(b => b.rule === 'emoji')) missed.push('emoji（提示词「⑤ 图形一律用线条画」）→ ⑤ 没有这条');
  console.log('  ⑤ 现在只查：阴影、渐变受限、字体链外、渐变跨度、系统默认字体。');
  console.log('  提示词里能机械验证但没人守的：');
  for (const m of missed) console.log('    · ' + m);
}