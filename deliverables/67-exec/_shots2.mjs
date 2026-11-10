// _shots2.mjs — 用**真快照**做改前截图：把 _before/{index.html,style.css} 复制成一个
// 独立站点（路径改成绝对 file:// 指向真实的 _fonts 与 templates），这样改前那张图
// 就是改动前那一版源码的真实渲染，不用在运行时反做 DOM（第一版反做只还原到 986.8，与实测 954 差 32.8）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SITE = join(HERE, '_before-site');
const OUT = join(HERE, 'shots-list');
mkdirSync(SITE, { recursive: true });
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (p) => 'file:///' + join(ROOT, p).replace(/\\/g, '/');

// 组装改前站点
let html = readFileSync(join(HERE, '_before', 'index.html'), 'utf8');
html = html.replace(/href="\.\.\/_fonts\//g, `href="${url('prototypes/_fonts')}/`)
           .replace(/href="\.\.\/\.\.\/templates\//g, `href="${url('templates')}/`)
           .replace(/href="style\.css"/g, 'href="./style.css"')
           .replace(/href="wizard\.html"/g, `href="${url('prototypes/_selection/wizard.html')}"`)
           .replace(/src="(data|prompts|prompt-copy|app)\.js"/g, (m, f) => `src="${url('prototypes/_selection/' + f + '.js')}"`);
// data.js 里的截图路径是相对 _selection 的（"../S01-…/.inspect/…"），快照站点换了目录就断了。
// 在 data.js 与 app.js 之间插一段把 shots.* 改写成绝对 file:// URL —— 只影响这份快照，不动源码。
const fix = `<script>(function(){
  var base = ${JSON.stringify(url('prototypes/_selection/'))};
  (window.SCHEMES || []).forEach(function (r) {
    if (!r.shots) return;
    Object.keys(r.shots).forEach(function (vp) {
      r.shots[vp] = (r.shots[vp] || []).map(function (p) { return /^https?:|^file:/.test(p) ? p : base + p; });
    });
  });
})();</script>`;
html = html.replace(/(<script src="[^"]*app\.js"><\/script>)/, fix + '\n$1');
writeFileSync(join(SITE, 'index.html'), html, 'utf8');
copyFileSync(join(HERE, '_before', 'style.css'), join(SITE, 'style.css'));

const BEFORE = 'file:///' + join(SITE, 'index.html').replace(/\\/g, '/');
const AFTER = url('prototypes/_selection/index.html');
console.log('before =', BEFORE);
console.log('after  =', AFTER);

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
const out0 = {};
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m, reducedMotion: true });
  // ── 改前 ──
  await p.goto(BEFORE, { settleMs: 1800 });
  const b = await p.eval(M);
  await p.screenshot({ path: join(OUT, `before-${vp.k}-1-firstscreen.png`), format: 'png' });
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(350);
  await p.screenshot({ path: join(OUT, `before-${vp.k}-2-firstcard.png`), format: 'png' });
  await p.eval(() => window.scrollTo(0, 0));
  await sleep(250);
  // 改前：滚到筛选栏（11 组常驻 + 内滚）
  await p.eval(() => { const r = document.querySelector('.rail'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 4); });
  await sleep(350);
  await p.screenshot({ path: join(OUT, `before-${vp.k}-3-rail.png`), format: 'png' });
  await p.eval(() => window.scrollTo(0, 0));
  await sleep(200);
  const ex0 = await p.eval(M);
  out0[vp.k] = ex0;

  // ── 改后 ──
  await p.goto(AFTER, { settleMs: 1800 });
  const a = await p.eval(M);
  await p.screenshot({ path: join(OUT, `after-${vp.k}-1-firstscreen.png`), format: 'png' });
  // 改后：三块展开（内容未删的证据），回到顶部
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = true; } window.scrollTo(0, 0); });
  await sleep(450);
  const ex = await p.eval(M);
  await p.screenshot({ path: join(OUT, `after-${vp.k}-2-expanded.png`), format: 'png' });
  // 改后：收起三块、滚到首卡（证明首屏之外的行卡照旧，且首屏那张是「完整」而不是被切）
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = false; } window.scrollTo(0, 0); });
  await sleep(350);
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(400);
  await p.screenshot({ path: join(OUT, `after-${vp.k}-3-firstcard.png`), format: 'png' });

  console.log(`\n[${vp.k}] 改前 mast=${b.mastH} rail=${b.railH} bar=${b.barH} 首卡=${b.firstRowTop} 卡高=${b.firstRowH} 完整=${b.completeCards} ovX=${b.overflowX}`);
  console.log(`[${vp.k}] 改后 mast=${a.mastH} rail=${a.railH} bar=${a.barH} 首卡=${a.firstRowTop} 卡高=${a.firstRowH} 完整=${a.completeCards} ovX=${a.overflowX}`);
  console.log(`[${vp.k}] 展开后 首卡=${ex.firstRowTop} 完整=${ex.completeCards} ovX=${ex.overflowX}`);
  await p.close();
}
await browser.close();
console.log('\nshots →', OUT);
