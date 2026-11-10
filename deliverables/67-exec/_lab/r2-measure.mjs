// r2-measure.mjs — 三档实测：h1 字号/vw、首卡 top、首屏完整卡数、横向溢出、图注字号、页头高
//   node r2-measure.mjs <out.json> [--url file:///...]
// 复用仓库自带 CDP（tools/taste-skill/.../lib/cdp.mjs），零依赖。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const args = process.argv.slice(2);
const out = args[0] || join(HERE, 'r2-measure.json');
const urlIdx = args.indexOf('--url');
const PAGE = urlIdx >= 0 ? args[urlIdx + 1]
  : 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 1180, height: 900 },
  { width: 980, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const INPAGE = `
window.__R2 = function () {
  var px = function (v) { return Math.round(v * 100) / 100; };
  var h1 = document.querySelector('.mast h1');
  var mast = document.querySelector('.mast');
  var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
  var vh = window.innerHeight;
  var fully = 0, partly = 0, firstTop = null, firstH = null;
  rows.forEach(function (r, i) {
    var b = r.getBoundingClientRect();
    if (i === 0) { firstTop = px(b.top); firstH = px(b.height); }
    if (b.top >= 0 && b.bottom <= vh) fully++;
    if (b.bottom > 0 && b.top < vh) partly++;
  });
  var de = document.documentElement;
  var fig = document.querySelector('.shot figcaption');
  var cap = document.querySelector('.cap');
  var capWarn = document.querySelector('.cap-warn');
  // 首屏最大字号（focal-point 判据用）
  var maxFs = 0, maxEl = null;
  Array.prototype.forEach.call(document.querySelectorAll('body *'), function (el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var r = el.getBoundingClientRect();
    if (r.top >= window.innerHeight || r.bottom <= 0 || r.width === 0 || r.height === 0) return;
    var fs = parseFloat(cs.fontSize);
    if (fs > maxFs) { maxFs = fs; maxEl = el.tagName + '.' + (el.className || ''); }
  });
  return {
    vw: window.innerWidth, vh: vh,
    h1Text: h1 ? h1.textContent.trim().slice(0, 24) : null,
    h1FontSize: h1 ? px(parseFloat(getComputedStyle(h1).fontSize)) : null,
    h1FontSizeRaw: h1 ? getComputedStyle(h1).fontSize : null,
    h1VW: h1 ? px(parseFloat(getComputedStyle(h1).fontSize) / window.innerWidth * 100) : null,
    h1RectH: h1 ? px(h1.getBoundingClientRect().height) : null,
    h1MaxWidth: h1 ? getComputedStyle(h1).maxWidth : null,
    mastH: mast ? px(mast.getBoundingClientRect().height) : null,
    firstRowTop: firstTop, firstRowH: firstH,
    firstRowBottom: (firstTop != null && firstH != null) ? px(firstTop + firstH) : null,
    fullyVisibleCards: fully, partlyVisibleCards: partly,
    totalRows: rows.length,
    figcaptionFontSize: fig ? px(parseFloat(getComputedStyle(fig).fontSize)) : null,
    figcaptionRect: fig ? { h: px(fig.getBoundingClientRect().height), top: px(fig.getBoundingClientRect().top), pos: getComputedStyle(fig).position } : null,
    capFontSize: cap ? px(parseFloat(getComputedStyle(cap).fontSize)) : null,
    capText: capWarn ? capWarn.textContent.trim() : (cap ? cap.textContent.trim() : null),
    capWarnCount: document.querySelectorAll('.cap-warn').length,
    sceneTplFontSize: (function () { var e = document.querySelector('.scene-tpl'); return e ? px(parseFloat(getComputedStyle(e).fontSize)) : null; })(),
    maxFontInViewport: px(maxFs), maxFontEl: maxEl,
    hOverflow: de.scrollWidth - de.clientWidth,
    hOverflowBody: document.body.scrollWidth - de.clientWidth,
    docScrollH: de.scrollHeight,
    mastRect: mast ? { h: px(mast.getBoundingClientRect().height), bottom: px(mast.getBoundingClientRect().bottom) } : null,
  };
};
true;
`;

const browser = await Browser.launch();
const results = [];
try {
  for (const { width, height } of WIDTHS) {
    const page = await browser.newPage({ width, height, mobile: width <= 620 });
    await page.setViewport({ width, height, mobile: width <= 620 });
    await page.goto(PAGE, { settleMs: 1200 });
    await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
    await page.eval(INPAGE);
    const m = await page.eval('JSON.stringify(window.__R2())');
    const obj = JSON.parse(m);
    obj.label = `${width}x${height}`;
    results.push(obj);
    console.log(`--- ${width}x${height} ---`);
    console.log(JSON.stringify(obj, null, 1));
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(out, JSON.stringify({ url: PAGE, at: new Date().toISOString(), results }, null, 1));
console.log('\nwrote ' + out);
