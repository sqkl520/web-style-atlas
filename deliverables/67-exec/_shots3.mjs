// _shots3.mjs — 最终截图：1440 档的「改后」用隔离站点 B'，
//   B' = 当前 index.html + 当前 style.css **但把 .mast h1 的 font-size 改回 clamp(30px,4vw,56px)**
// 这样 B' 与 A（HEAD）之间只差**我的**改动，1440 那张图才是"我的改动造成的差异"。
// 同时另出一张 after-1440-1-firstscreen-full.png = 真实当前源码（含别人的 h1 改动），供对照。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'shots-list');
const SITE = join(HERE, '_mine-only');
mkdirSync(SITE, { recursive: true });
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (p) => 'file:///' + join(ROOT, p).replace(/\\/g, '/');

// B' 站：当前 html + 把 h1 那一行还原成 HEAD 的字面值
let html = readFileSync(join(ROOT, 'prototypes/_selection/index.html'), 'utf8');
html = html.replace(/href="\.\.\/_fonts\//g, `href="${url('prototypes/_fonts')}/`)
  .replace(/href="\.\.\/\.\.\/templates\//g, `href="${url('templates')}/`)
  .replace(/href="style\.css"/g, 'href="./style.css"')
  .replace(/href="wizard\.html"/g, `href="${url('prototypes/_selection/wizard.html')}"`)
  .replace(/src="(data|prompts|prompt-copy|app)\.js"/g, (m, f) => `src="${url('prototypes/_selection/' + f + '.js')}"`);
const fix = `<script>(function(){var base=${JSON.stringify(url('prototypes/_selection/'))};
(window.SCHEMES||[]).forEach(function(r){ if(!r.shots) return;
  Object.keys(r.shots).forEach(function(vp){ r.shots[vp]=(r.shots[vp]||[]).map(function(p){ return /^https?:|^file:/.test(p)?p:base+p; }); }); });})();</script>`;
html = html.replace(/(<script src="[^"]*app\.js"><\/script>)/, fix + '\n$1');
writeFileSync(join(SITE, 'index.html'), html, 'utf8');
// css：当前 + 一条把 h1 压回 HEAD 值的覆盖（只影响 .mast h1，其余不动）
const css = readFileSync(join(ROOT, 'prototypes/_selection/style.css'), 'utf8')
  + '\n/* 只为截图对照：把人家的 --s-h1 改动按 HEAD 的值还原，好让 1440 那张图只反映我的改动 */\n'
  + '.mast h1 { font-size: clamp(30px, 4vw, 56px); }\n';
writeFileSync(join(SITE, 'style.css'), css, 'utf8');

const MINE_ONLY = 'file:///' + join(SITE, 'index.html').replace(/\\/g, '/');
const BEFORE = 'file:///' + join(HERE, '_before-site', 'index.html').replace(/\\/g, '/');
const CURRENT = url('prototypes/_selection/index.html');

const M = () => {
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height }; });
  const h = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  return { mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: +boxes[0].top.toFixed(1), firstRowH: +boxes[0].h.toFixed(1),
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
// ── 390：改前 / 改后（我的改动在全档生效，直接用当前源码）──
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
  await p.goto(BEFORE, { settleMs: 1800 });
  const b = await p.eval(M);
  await p.screenshot({ path: join(OUT, 'before-390-1-firstscreen.png'), format: 'png' });
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(350);
  await p.screenshot({ path: join(OUT, 'before-390-2-firstcard.png'), format: 'png' });

  await p.goto(CURRENT, { settleMs: 1800 });
  const a = await p.eval(M);
  await p.screenshot({ path: join(OUT, 'after-390-1-firstscreen.png'), format: 'png' });
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = true; } window.scrollTo(0, 0); });
  await sleep(450);
  const ex = await p.eval(M);
  await p.screenshot({ path: join(OUT, 'after-390-2-expanded.png'), format: 'png' });
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = false; } window.scrollTo(0, 0); });
  await sleep(300);
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(350);
  await p.screenshot({ path: join(OUT, 'after-390-3-firstcard.png'), format: 'png' });
  console.log(`[390] 改前 mast=${b.mastH} rail=${b.railH} bar=${b.barH} 首卡=${b.firstRowTop} 卡高=${b.firstRowH} 完整=${b.completeCards}`);
  console.log(`[390] 改后 mast=${a.mastH} rail=${a.railH} bar=${a.barH} 首卡=${a.firstRowTop} 卡高=${a.firstRowH} 完整=${a.completeCards}`);
  console.log(`[390] 展开后 首卡=${ex.firstRowTop} 完整=${ex.completeCards} ovX=${ex.overflowX}`);
  await p.close();
}
// ── 1440：改前(A=HEAD) / 改后(B'=只含我的改动) ──
{
  const p = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
  await p.goto(BEFORE, { settleMs: 1800 });
  const b = await p.eval(M);
  await p.screenshot({ path: join(OUT, 'before-1440-1-firstscreen.png'), format: 'png' });
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(350);
  await p.screenshot({ path: join(OUT, 'before-1440-2-firstcard.png'), format: 'png' });
  await p.eval(() => { const r = document.querySelector('.rail'); r.scrollTop = r.scrollHeight; });
  await sleep(300);
  await p.screenshot({ path: join(OUT, 'before-1440-3-rail-bottom.png'), format: 'png' });

  await p.goto(MINE_ONLY, { settleMs: 1800 });
  const m = await p.eval(M);
  await p.screenshot({ path: join(OUT, 'after-1440-1-firstscreen.png'), format: 'png' });
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(350);
  await p.screenshot({ path: join(OUT, 'after-1440-2-firstcard.png'), format: 'png' });
  await p.eval(() => { const r = document.querySelector('.rail'); window.scrollTo(0, 0); r.scrollTop = r.scrollHeight; });
  await sleep(300);
  await p.screenshot({ path: join(OUT, 'after-1440-3-rail-bottom.png'), format: 'png' });

  // 另存一张「真实当前源码」（含别人的 h1 改动）
  await p.goto(CURRENT, { settleMs: 1800 });
  const c = await p.eval(M);
  await p.screenshot({ path: join(OUT, 'after-1440-4-current-with-others-h1.png'), format: 'png' });

  console.log(`[1440] A 改前(HEAD)        mast=${b.mastH} rail=${b.railH} bar=${b.barH} 首卡=${b.firstRowTop} 卡高=${b.firstRowH} 完整=${b.completeCards}`);
  console.log(`[1440] B' 只含我的改动      mast=${m.mastH} rail=${m.railH} bar=${m.barH} 首卡=${m.firstRowTop} 卡高=${m.firstRowH} 完整=${m.completeCards}`);
  console.log(`[1440] 我的贡献            Δmast=${(m.mastH - b.mastH).toFixed(1)} Δrail=${(m.railH - b.railH).toFixed(1)} Δbar=${(m.barH - b.barH).toFixed(1)} Δ首卡=${(m.firstRowTop - b.firstRowTop).toFixed(1)} Δ完整=${m.completeCards - b.completeCards}`);
  console.log(`[1440] 真实当前源码(含别人) mast=${c.mastH} 首卡=${c.firstRowTop} 完整=${c.completeCards}  ← 多出来的 +19.1 是别人的 --s-h1 改动`);
  await p.close();
}
await browser.close();
console.log('\nshots →', OUT);
