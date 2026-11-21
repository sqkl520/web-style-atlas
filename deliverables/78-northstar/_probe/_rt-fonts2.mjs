#!/usr/bin/env node
/* 攻击 H：② 漏掉链尾字体 → 产物用了链外字体也能满分。
 *
 * S31 的真实提示词链是：Jost → Noto Sans SC；正文 Noto Serif SC → Literata → Georgia。
 * 只抓到了 4 个（Jost/Noto Sans SC/Noto Serif SC/Literata），Georgia 因为后面跟「。」没进
 * want 集合（正则前瞻要求 →|（|$|、，而「Georgia。」后面是「。」下的换行，$ 在 m 模式下
 * 匹配行尾 —— 但行尾是「。」不是 Georgia 本身）。
 *
 * 后果：产物用 Georgia 会算"已用 5/4"？不会 —— 它根本不在 want 里，所以:
 *   ① 想查"N 个字体全用了"时，链尾那个永远不计入分母 → 分母偏小。
 *   ② 如果模型用了链外字体，只要名字不在 want 里，就不会被计。
 * 真正的问题在 judgeFontChain —— 它才是 ⑤ 的违规判据。它对同样的链也是用同一条正则吗？
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { score, judgeFontChain, BT } from './_rt-scorelib.mjs';

let defects = 0;
const row = (name, got, want, detail) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) defects++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`      实得 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}${detail ? ' ｜ ' + detail : ''}`);
};

const TMPID = 'S99probe';
const TMP = join(BT, TMPID);
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
function scoreHTML(h, prompt) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'index.html'), h);
  writeFileSync(join(TMP, '_prompt.txt'), prompt);
  const r = score(TMPID);
  rmSync(TMP, { recursive: true, force: true });
  return r;
}
const html = (s) => `<!DOCTYPE html><html><head>${s}</head><body></body></html>`;

const P31 = readFileSync(join(BT, 'S31', '_prompt.txt'), 'utf8');

console.log('══ H1 ② 分母偏小：链尾字体不计入 want ══');
{
  const r = scoreHTML(html(`<style>
    body{font-family:"Noto Serif SC",serif}
    h1{font-family:Jost,sans-serif}
  </style>`), P31);
  console.log(`  S31 提示词：标题 Jost→Noto Sans SC；正文 Noto Serif SC→Literata→Georgia`);
  console.log(`  产物只用了 2 个（Jost + Noto Serif SC），② 输出 ${r.fonts.got}/${r.fonts.want}`);
  console.log(`  → want=4，但链上真实有 5 个不同族名（含 Georgia）。分母漏 1。`);
}

console.log('\n══ H2 ⑤ 字体链外：链尾字体被用了会不会误报链外？ ══');
{
  /* 反过来：产物用了 Georgia，它其实是链上最后一个 —— 应该合规 */
  const fc = judgeFontChain(P31, '<style>body{font-family:Georgia,serif}</style>');
  console.log(`  产物只用 Georgia（链尾，合规）→ outside=${JSON.stringify(fc.outside)}`);
  row('链尾 Georgia 不该被判链外', fc.outside, [], `allowed=${JSON.stringify(fc.allowed)}`);

  /* 用 STSong 同理（S21 的正文链最后一个） */
  const P21 = readFileSync(join(BT, 'S21', '_prompt.txt'), 'utf8');
  const fc21 = judgeFontChain(P21, '<style>body{font-family:STSong,serif}</style>');
  console.log(`  S21 产物只用 STSong（正文链最后一个，合规）→ outside=${JSON.stringify(fc21.outside)}`);
  row('链尾 STSong 不该被判链外', fc21.outside, [], `allowed=${JSON.stringify(fc21.allowed)}`);
}

console.log('\n══ H3 ② 在产物为 0 个字体时是否"静默通过" ══');
{
  const r = scoreHTML(html(`<style>body{color:red}</style>`), P31);
  console.log(`  产物没有任何 font-family → ② 行在报告里${r.fonts && r.fonts.want ? '显示' : '整行消失'}`);
  console.log(`  fonts=${JSON.stringify(r.fonts)}`);
  row('没有 font-family 时不能算"通过"', r.fonts && r.fonts.want ? r.fonts.got : 'MISSING-LINE', '必须显式说未判',
    '输出层条件是 if (r.fonts && r.fonts.want) —— want=0 时整行不打印，读起来是什么都没问题');
}

console.log(`\n缺陷计数 ${defects}`);