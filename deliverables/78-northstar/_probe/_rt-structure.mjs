#!/usr/bin/env node
/* 攻击 C：判据假设了 HTML 结构。
 *
 *   C1 ⑤ 只看第一个 <style> 块 —— 内联 style="" 与第二个 style 块是否被漏？
 *   C2 ③ 字号取「全页最大 font-size」—— 装饰元素会不会冒充标题？
 *   C3 @media 里的规则是否被数进桌面判据？
 *   C4 ⑤ 的禁项清单 vs 提示词里的禁令条数 —— 哪些禁令没人守？
 *   C5 --all 的目录匹配 ^S\d{2}$ 会不会漏掉重跑目录？
 *
 * 用 _rt-scorelib.mjs（从 score.mjs 逐字派生），不修改 score.mjs。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { score, BT } from './_rt-scorelib.mjs';

const html = (s) => `<!DOCTYPE html><html><head>${s}</head><body><div id=x></div></body></html>`;

/* 用 S01 的真实提示词，保证判据分支真的会跑 */
const PROMPT = readFileSync(join(BT, 'S01', '_prompt.txt'), 'utf8');

let defects = 0;
const row = (name, got, want, detail) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) defects++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`      实得 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}${detail ? ' ｜ ' + detail : ''}`);
};

/* score() 只吃目录，所以造一个临时目录塞进去，跑完删掉。 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
const TMPID = 'S99probe';
const TMP = join(BT, TMPID);
function scoreHTML(h, prompt = PROMPT) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'index.html'), h);
  writeFileSync(join(TMP, '_prompt.txt'), prompt);
  const r = score(TMPID);
  rmSync(TMP, { recursive: true, force: true });
  return r;
}

console.log('══ C1 ⑤ 只看第一个 <style> 块 / 漏内联 style="" ══');
{
  const inline = scoreHTML(html(`<style>.a{color:#C1121F}</style>
    <div style="box-shadow: 0 4px 12px #000; border-radius: 9999px; border-bottom: 6px solid #000"></div>`));
  console.log(`  内联 style="box-shadow:0 4px 12px"（有模糊、真阴影）→ ⑤ banned: ${JSON.stringify(inline.banned.map(b => b.rule + '×' + b.hits))}`);
  console.log(`  同一处内联的 border-radius:9999px → ③ 圆角 violations=${inline.geometry.radius.violations}`);
  console.log(`  同一处内联的 border-bottom:6px → ③ 线宽 outside=${JSON.stringify(inline.geometry.lineWidth.outside)}`);
  row('内联阴影应被 ⑤ 抓到', inline.banned.some(b => b.rule === '无阴影'), true,
    'judgeRadius/judgeLineWidth 扫全文所以抓到了内联；⑤ 只扫第一个 <style> 块');

  const twoBlocks = scoreHTML(html(`<style>.a{color:#C1121F}</style>
    <style>.b{box-shadow: 0 4px 12px #000}</style>`));
  row('第二个 <style> 块里的阴影应被抓到', twoBlocks.banned.some(b => b.rule === '无阴影'), true,
    `css 取的是 /<style[^>]*>([\\s\\S]*?)<\\/style>/i 的第一次匹配，第二个块整块不可见`);
}

console.log('\n══ C2 ③ 字号：装饰/畸形 font-size 会不会冒充"最大标题" ══');
{
  /* 正文 16px、真实标题 96px，另有一个装饰元素 400px（例如巨型水印字） */
  const deco = scoreHTML(html(`<style>
    body{font-size:16px}
    h1{font-size:96px}
    .watermark{font-size:400px}
  </style>`));
  const g = deco.geometry.scale;
  console.log(`  正文 16 / 标题 96 / 装饰 400 → maxTitle=${g.maxTitle}（提示词要 ${g.wantTitleAbs}），titleOk=${g.titleOk}`);
  row('装饰 400px 不该推翻 96px 的真实标题', g.titleOk, true,
    'judge 取 Math.max(...decls)，任何一处更大的 font-size 都会冒充标题');

  /* 反向：只有装饰元素比目标大一点点，真实标题正确 */
  const deco2 = scoreHTML(html(`<style>
    body{font-size:16px}
    h1{font-size:96px}
    .wm{font-size:101px}
  </style>`));
  row('101px 装饰让 96px 标题仍算过（容差 ±4）', deco2.geometry.scale.titleOk, true);

  /* 真实标题做小了，但有个 200px 装饰 → 应报 ✗，会不会被冒充成 ✓ */
  const fake = scoreHTML(html(`<style>
    body{font-size:16px}
    h1{font-size:44px}
    .wm{font-size:96px}
  </style>`));
  console.log(`  真实标题只有 44px，但装饰块 96px → maxTitle=${fake.geometry.scale.maxTitle}，titleOk=${fake.geometry.scale.titleOk}`);
  row('44px 的真标题不该因为装饰块 96px 而判过', fake.geometry.scale.titleOk, false,
    '这正是"量错了对象"：判据量的是页面最大字号，不是标题字号');
}

console.log('\n══ C3 @media 里的移动端规则是否混进桌面判据 ══');
{
  const mq = scoreHTML(html(`<style>
    body{font-size:16px}
    h1{font-size:96px}
    @media (max-width:600px){ h1{font-size:40px} body{font-size:14px} }
  </style>`));
  console.log(`  桌面 h1=96, @media 里 h1=40 → maxTitle=${mq.geometry.scale.maxTitle} titleOk=${mq.geometry.scale.titleOk}`);
  row('@media 里的 40px 不该拉低 maxTitle', mq.geometry.scale.titleOk, true,
    'maxTitle 取全页最大值，移动端只会更小，所以这条方向安全');

  /* 反方向：@media 里有一个超大字号（比如移动端视觉补偿），会否让桌面标题冒充过关 */
  const mqBig = scoreHTML(html(`<style>
    body{font-size:16px}
    h1{font-size:40px}
    @media (min-width:1200px){ .x{font-size:96px} }
  </style>`));
  console.log(`  桌面 h1=40，@media 里无关元素 96 → maxTitle=${mqBig.geometry.scale.maxTitle} titleOk=${mqBig.geometry.scale.titleOk}`);
  row('@media 里无关的 96px 不该救回 40px 的标题', mqBig.geometry.scale.titleOk, false,
    '同 C2 的"量错对象"，@media 只是提供了另一条注入路径');

  /* 圆角：提示词说"全站一律 0"——移动端写 4px 也该算违规，所以这条方向是对的 */
  const mqR = scoreHTML(html(`<style>.a{border-radius:0} @media(max-width:600px){.a{border-radius:4px}}</style>`));
  row('@media 里的 4px 圆角仍应算违规（全站一律 0）', mqR.geometry.radius.violations, 1);
}

console.log('\n══ C4 提示词明令的禁令，⑤ 实际守了几条 ══');
{
  /* S01 提示词里能机械验证的禁令，逐条造违规输入 */
  const cases = [
    ['4. 阴影：无阴影。', 'box-shadow', `<style>.a{box-shadow:0 4px 12px #000}</style>`],
    ['⑥ 不用透明度。', 'opacity/rgba透明', `<style>.a{opacity:.4;background:rgba(0,0,0,.35)}</style>`],
    ['⑧ 动效只用机制句写到的那一个动作，其余位置保持静止。', 'transition/animation', `<style>.a{animation:spin 1s infinite;transition:all .3s}</style>`],
    ['3. 圆角：全站一律 0。', 'border-radius', `<style>.a{border-radius:8px}</style>`],
    ['⑤ 图形一律用本案线宽级别的线条画…没有对应线条时就只用文字。', 'emoji/svg图标', `<div>🔥 🎉 ⭐</div><svg><circle r=4/></svg>`],
    ['1. 配色…不新增更多彩色。', '额外彩色', `<style>.a{color:#FF00FF}</style>`],
  ];
  for (const [rule, kind, bad] of cases) {
    const r = scoreHTML(html(bad));
    const caught = r.banned.length > 0 || r.geometry.radius?.violations > 0;
    console.log(`  ${caught ? '抓到' : '漏掉'}  ${kind.padEnd(18)} ← ${rule}`);
  }
}

console.log('\n══ C5 --all 的目录匹配 ^S\\\\d{2}$ ══');
{
  const dirs = readdirSync(BT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  const scored = dirs.filter(n => /^S\d{2}$/.test(n));
  const skipped = dirs.filter(n => /^S\d/.test(n) && !/^S\d{2}$/.test(n));
  console.log(`  目录 ${dirs.filter(n => /^S\d/.test(n)).length} 个；--all 会扫 ${scored.length} 个`);
  console.log(`  以 S 开头但不匹配 ^S\\d{2}$、被静默跳过的：${skipped.join(' ') || '（无）'}`);
  row('所有跑过的案目录都被 --all 扫到', skipped.length, 0,
    'S34-r2 是重跑产物，有 index.html，但 --all 不认它');
}

console.log(`\n缺陷计数 ${defects}`);