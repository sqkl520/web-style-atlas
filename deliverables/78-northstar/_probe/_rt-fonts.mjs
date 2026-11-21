#!/usr/bin/env node
/* 攻击 G：② 字体判据。
 *
 * 实现：famNames 从提示词抽族名；htmlFonts = 所有 font-family 声明（展开 var）拼成一个串；
 *       famHit = famNames.filter(f => htmlFonts.includes(f))。
 * 这是**子串包含**，不是"这个字体被用在了 font-family 里"。
 *
 * 可能的病：
 *   G1 注释里提到字体名就算"出现"
 *   G2 前缀相同算"出现"（Georgia vs Georgia Pro / Noto Sans vs Noto Sans SC）
 *   G3 font-family: "Noto Sans SC", ... 正确用上 vs 只出现在自定义属性值里
 *   G4 famNames 抽取本身是否漏/多
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { score, BT } from './_rt-scorelib.mjs';

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

const PROMPT = `2. 字体：标题按这个顺序取第一个可用的：Georgia → Songti SC（前一个缺字就用下一个）。正文同理，按序取：Georgia → Songti SC。`;

console.log('══ G1 字体名只出现在注释里 ══');
{
  const r = scoreHTML(html(`<style>
    /* 本页本想用 Georgia，但最后用了系统默认 */
    body{font-family:Papyrus,serif}
  </style>`), PROMPT);
  console.log(`  产物 font-family 只有 Papyrus（链外），Georgia 只在注释里`);
  console.log(`  ② 字体 ${r.fonts.got}/${r.fonts.want}　hit=${JSON.stringify(r.fonts.hit)}`);
  row('注释里的 Georgia 不该算"已用"', r.fonts.got, 0,
    'htmlFonts 只取 font-family 声明，注释不在其中 —— 这条方向是安全的');
}

console.log('\n══ G2 子串包含：Georgia Pro / Noto Sans 前缀 ══');
{
  const r = scoreHTML(html(`<style>body{font-family:"Georgia Pro",serif}</style>`), PROMPT);
  console.log(`  产物用 Georgia Pro（不同字体），提示词给 Georgia → got=${r.fonts.got}/${r.fonts.want}`);
  row('Georgia Pro 不应算 Georgia 已用', r.fonts.got, 0, 'includes() 子串匹配');

  const P2 = `2. 字体：标题按这个顺序取第一个可用的：Noto Sans → Songti SC。正文同理，按序取：Noto Sans → Songti SC。`;
  const r2 = scoreHTML(html(`<style>body{font-family:"Noto Sans SC"}</style>`), P2);
  console.log(`  提示词给 Noto Sans，产物用 Noto Sans SC → got=${r2.fonts.got}/${r2.fonts.want}`);
  row('Noto Sans SC 不应算 Noto Sans 已用', r2.fonts.got, 0, '同上');
}

console.log('\n══ G3 自定义属性里出现的字体名 ══');
{
  const r = scoreHTML(html(`<style>
    :root{--unused-font:Georgia;/* 声明了但从没接上 */}
    body{font-family:Papyrus,serif}
  </style>`), PROMPT);
  console.log(`  --unused-font:Georgia 声明但从未被 font-family 使用 → got=${r.fonts.got}/${r.fonts.want}`);
  row('只声明在变量里、没接上的字体不该算已用', r.fonts.got, 0);
}

console.log('\n══ G4 famNames 抽取：提示词真实形态 ══');
{
  /* 真实 S01 提示词 */
  const p = readFileSync(join(BT, 'S01', '_prompt.txt'), 'utf8');
  const famLine = (p.match(/字体：[^\n]*(?:\n[^\n]*)*?(?=\n\s*(?:\d+\.|结构约束|$))/m) || [''])[0];
  const famNames = [...new Set((famLine.match(/[A-Z][A-Za-z ]{2,}(?=\s*(?:→|（|$|、))/g) || [])
    .map(s => s.trim()).filter(s => s && !/^[A-Z]$/.test(s)))];
  console.log(`  抓到 ${famNames.length} 个：${JSON.stringify(famNames)}`);
  row('S01 应抓到 3 个字体（Noto Sans SC / Source Han Sans SC / Martian Mono）', famNames.length, 3);

  /* 小写开头的字体名（真实存在的字体里也有小写起头的，如 iA Writer Mono） */
  const plower = `2. 字体：标题按这个顺序取第一个可用的：iA Writer Quattro → Songti SC（前一个缺字就用下一个）。正文同理，按序取：iA Writer Quattro → Songti SC。`;
  const rl = scoreHTML(html(`<style>body{font-family:"iA Writer Quattro",serif}</style>`), plower);
  console.log(`  提示词给 iA Writer Quattro（小写开头），产物正确使用 → got=${rl.fonts.got}/${rl.fonts.want}`);
  row('小写开头的字体名应被抓到', rl.fonts.want >= 1, true, `want=${rl.fonts.want}，正则 /[A-Z][A-Za-z ]{2,}/ 要求大写开头`);

  /* 通用的"字体："行里出现中文名 */
  const pcn = `2. 字体：标题按这个顺序取第一个可用的：思源宋体 → Songti SC。正文同理，按序取：思源宋体 → Songti SC。`;
  const rcn = scoreHTML(html(`<style>body{font-family:"思源宋体",serif}</style>`), pcn);
  console.log(`  提示词给中文族名「思源宋体」，产物正确使用 → got=${rcn.fonts.got}/${rcn.fonts.want}`);
  row('中文族名应被抓到', rcn.fonts.want >= 1, true, `want=${rcn.fonts.want}`);
}

console.log(`\n缺陷计数 ${defects}`);