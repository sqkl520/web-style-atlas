// _isolate2.mjs — 精确隔离「我的贡献」：
//   站点 A（without-mine）= HEAD 版 index.html + 当前 style.css 去掉我追加的那一整段
//   站点 B（with-mine）   = 当前 index.html + 当前 style.css
// 两者共用当前 app.js / data.js / prompts.js（别人的改动都在里面，两边一样，不干扰差值）。
// 这样 A→B 的差就**只有我的改动**，且不依赖任何运行时反做。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SITE = join(HERE, '_without-mine');
mkdirSync(SITE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (p) => 'file:///' + join(ROOT, p).replace(/\\/g, '/');

// ── 组装 A 站 ──────────────────────────────────────────────────────────────
const GIT = 'D:/Git/cmd/git.exe';
let headHtml = execFileSync(GIT, ['show', 'HEAD:prototypes/_selection/index.html'], { cwd: ROOT, encoding: 'utf8' });
headHtml = headHtml.replace(/href="\.\.\/_fonts\//g, `href="${url('prototypes/_fonts')}/`)
  .replace(/href="\.\.\/\.\.\/templates\//g, `href="${url('templates')}/`)
  .replace(/href="style\.css"/g, 'href="./style.css"')
  .replace(/href="wizard\.html"/g, `href="${url('prototypes/_selection/wizard.html')}"`)
  .replace(/src="(data|prompts|prompt-copy|app)\.js"/g, (m, f) => `src="${url('prototypes/_selection/' + f + '.js')}"`);
// 截图路径是相对 _selection 的，改写成绝对
const fix = `<script>(function(){var base=${JSON.stringify(url('prototypes/_selection/'))};
(window.SCHEMES||[]).forEach(function(r){ if(!r.shots) return;
  Object.keys(r.shots).forEach(function(vp){ r.shots[vp]=(r.shots[vp]||[]).map(function(p){ return /^https?:|^file:/.test(p)?p:base+p; }); }); });})();</script>`;
headHtml = headHtml.replace(/(<script src="[^"]*app\.js"><\/script>)/, fix + '\n$1');
writeFileSync(join(SITE, 'index.html'), headHtml, 'utf8');

// 当前 style.css 去掉我追加的整段（从「列表页首屏：390」那段注释的起点到文件末尾）
const css = readFileSync(join(ROOT, 'prototypes', '_selection', 'style.css'), 'utf8');
const MARK = '/* ══════════════════════════════════════════════════════════════════════════\n   列表页首屏：390×844';
const idx = css.indexOf(MARK);
if (idx < 0) throw new Error('找不到我的段落起点，隔离失败');
const cssWithoutMine = css.slice(0, idx).replace(/\s*$/, '\n');
writeFileSync(join(SITE, 'style.css'), cssWithoutMine, 'utf8');
console.log(`我的段落长度 ${css.length - idx} 字符，已从 A 站剔除（A 站 css ${cssWithoutMine.length} 字符）`);

const BEFORE = 'file:///' + join(SITE, 'index.html').replace(/\\/g, '/');
const AFTER = url('prototypes/_selection/index.html');

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    chips: q('.rail')?.querySelectorAll('.chips button').length, blocks: q('.rail')?.querySelectorAll('.rail-block').length };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
console.log('\n═══ A = 不含我的改动（HEAD index.html + 当前 css 去掉我的段）\n═══ B = 当前源码 ═══\n');
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '768', w: 768, h: 1024, d: 1, m: false }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m, reducedMotion: true });
  await p.goto(BEFORE, { settleMs: 1800 });
  const a = await p.eval(M);
  await p.goto(AFTER, { settleMs: 1800 });
  const b = await p.eval(M);
  console.log(`[${vp.k}] A(无我)  mast=${a.mastH} rail=${a.railH} bar=${a.barH} 首卡=${a.firstRowTop} 卡高=${a.firstRowH} 完整=${a.completeCards} ovX=${a.overflowX} 芯片=${a.chips}/${a.blocks}组`);
  console.log(`       B(有我)  mast=${b.mastH} rail=${b.railH} bar=${b.barH} 首卡=${b.firstRowTop} 卡高=${b.firstRowH} 完整=${b.completeCards} ovX=${b.overflowX} 芯片=${b.chips}/${b.blocks}组`);
  console.log(`       我的贡献 Δmast=${(b.mastH - a.mastH).toFixed(1)} Δrail=${(b.railH - a.railH).toFixed(1)} Δbar=${(b.barH - a.barH).toFixed(1)} Δ首卡=${(b.firstRowTop - a.firstRowTop).toFixed(1)} Δ卡高=${(b.firstRowH - a.firstRowH).toFixed(1)} Δ完整=${b.completeCards - a.completeCards}\n`);
  await p.close();
}
await browser.close();
