/* S13 empty-screens 变体实验：560 / 600 / 640 / 680 / 720，外加"只放宽正文"与"连栏位一起"两组。
 *
 * 为什么分两组：
 *   s13-attrib 实测出两种不同的空法 ——
 *     屏 3：文字 x[64..1367] 摸到了签发栏，但 bare 点均匀散布在全部 12 个 x 桶里（17–30 个/桶）
 *           → 是"整屏内容稀疏"，与 max-width 有关；
 *     屏 5、6：文字最大右边界只有 945/943，x≥960 的 4 个桶 30/30 全空
 *           → 是".levels/.log/colophon 只占 1–11 栏"造成的，**放宽正文 max-width 也填不到那里**。
 *   只做"放宽 max-width"一组，会在屏 5/6 上得到一个说不通的改善；必须把两组并列，
 *   才能判断到底是哪一个变量在起作用。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13var';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

// .clause__body / .levels__lead / .levels__note / .plates__lead / .annex__note /
// .colophon__line / .signature__status / .log__empty / .claim / .specimen__cap
// 都是 32em（15px 下 = 480px）。用一个变量统一改写，避免"只改了其中几个"。
const BODY_SELECTORS = [
  '.clause__body', '.levels__lead', '.levels__note', '.plates__lead', '.annex__note',
  '.colophon__line', '.colophon__quirk', '.colophon__credits', '.signature__status',
  '.log__empty', '.claim', '.specimen__cap',
];

const VARIANTS = [];
for (const px of [null, 560, 600, 640, 680, 720]) {
  VARIANTS.push({ tag: `body-${px || 'base'}`, px, group: 'body' });
  VARIANTS.push({ tag: `grid-${px || 'base'}`, px, group: 'grid' });
}

const results = [];
for (const v of VARIANTS) {
  const W = join(BASE, v.tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  // 目录里 _fonts 相对路径 ../_fonts 需要上一层
  let css = '\n/* 变体实验：仅用于测量，不会写回仓库 */\n';
  if (v.px) {
    css += BODY_SELECTORS.map((s) => `${s}{max-width:${v.px}px !important}`).join('\n') + '\n';
  }
  if (v.group === 'grid') {
    // 让 levels / log / colophon 也吃到 1–16 栏的全宽（只测"栏位"这一个变量）
    css += `.levels,.log{grid-column:1 / span 16}\n.colophon__line,.colophon__quirk,.colophon__credits{max-width:none}\n`;
  }
  const cssPath = join(W, 'style.css');
  writeFileSync(cssPath, readFileSync(cssPath, 'utf8') + css, 'utf8');

  const r = spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', join(BASE, `${v.tag}-inspect`), '--widths', '1440', '--json',
  ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });

  let report = null;
  try { report = JSON.parse(readFileSync(join(BASE, `${v.tag}-inspect`, 'report.json'), 'utf8')); } catch {}
  const fails = report ? report.findings.filter((f) => f.level === 'FAIL') : [];
  const warns = report ? report.findings.filter((f) => f.level === 'WARN') : [];
  const vp = report ? report.viewports.find((x) => x.width === 1440) : null;
  const m = vp ? vp.metrics : null;

  // 行长（汉字/行）：用 body 元素的实测宽 ÷ 字号
  const bodyW = m && m.type.body ? null : null;
  results.push({
    tag: v.tag, px: v.px, group: v.group,
    exit: r.status,
    failIds: fails.map((f) => f.id),
    warnIds: warns.map((f) => f.id),
    filled: vp ? vp.filled : null,
    screens: vp ? vp.screens : null,
    docH: m ? m.page.height : null,
    measureChars: m ? m.type.measureChars : null,
    bodySize: m && m.type.body ? m.type.body.size : null,
    words: m ? m.page.words : null,
  });
  const f = (x) => (x === null || x === undefined ? '—' : x);
  console.log(`${v.tag.padEnd(11)} exit=${f(r.status)} FAIL=[${fails.map((x) => x.id).join(',')}] WARN=[${warns.map((x) => x.id).join(',')}]`);
  console.log(`           filled=${JSON.stringify(vp ? vp.filled : null)} docH=${f(m ? m.page.height : null)} measureChars=${f(m ? m.type.measureChars : null)}`);
}

writeFileSync('D:/Web/style/deliverables/69-exec/_s13var/results.json', JSON.stringify(results, null, 1), 'utf8');
console.log('\n已写 _s13var/results.json');
