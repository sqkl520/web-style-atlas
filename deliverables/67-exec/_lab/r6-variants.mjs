// r6-variants.mjs — 在运行时注入覆盖样式，模拟「11/12px → 13px」对布局的影响，先量后改。
// 只注入 CSS，不改磁盘文件。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const VARIANTS = [
  { name: 'baseline', css: '' },
  { name: 'figcap13', css: '.shot figcaption { font-size: var(--s-13); }' },
  { name: 'tpl13', css: '.scene-tpl { font-size: var(--s-13); }' },
  { name: 'cap13', css: '.cap { font-size: var(--s-13); }' },
  { name: 'all13', css: '.shot figcaption,.scene-tpl,.cap { font-size: var(--s-13); }' },
];

const MEASURE = `
(function () {
  var px = function (v) { return Math.round(v * 100) / 100; };
  var mast = document.querySelector('.mast');
  var rail = document.querySelector('.rail');
  var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
  var vh = window.innerHeight, fully = 0, partly = 0;
  rows.forEach(function (r) { var b = r.getBoundingClientRect(); if (b.top >= 0 && b.bottom <= vh) fully++; if (b.bottom > 0 && b.top < vh) partly++; });
  var r0 = rows[0] ? rows[0].getBoundingClientRect() : null;
  var meta0 = document.querySelector('#ledger .row .row-meta');
  var cap0 = document.querySelector('.cap');
  var fig0 = document.querySelector('.shot figcaption');
  return JSON.stringify({
    mastH: mast ? px(mast.getBoundingClientRect().height) : null,
    railH: rail ? px(rail.getBoundingClientRect().height) : null,
    railScrollH: rail ? rail.scrollHeight : null,
    firstTop: r0 ? px(r0.top) : null,
    firstH: r0 ? px(r0.height) : null,
    firstBottom: r0 ? px(r0.bottom) : null,
    full: fully, part: partly,
    metaH: meta0 ? px(meta0.getBoundingClientRect().height) : null,
    capW: cap0 ? px(cap0.getBoundingClientRect().width) : null,
    capH: cap0 ? px(cap0.getBoundingClientRect().height) : null,
    figFS: fig0 ? px(parseFloat(getComputedStyle(fig0).fontSize)) : null,
    figH: fig0 ? px(fig0.getBoundingClientRect().height) : null,
    hOv: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight
  });
})()
`;

const browser = await Browser.launch();
try {
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    const page = await browser.newPage({ width: w, height: h, mobile: w <= 620 });
    await page.setViewport({ width: w, height: h, mobile: w <= 620 });
    await page.goto(PAGE, { settleMs: 1200 });
    await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
    console.log(`\n########## ${w}x${h} ##########`);
    for (const v of VARIANTS) {
      await page.eval(`(function(){
        var s = document.getElementById('__r6');
        if (!s) { s = document.createElement('style'); s.id = '__r6'; document.head.appendChild(s); }
        s.textContent = ${JSON.stringify(v.css)};
        return 1;
      })()`);
      await new Promise((r) => setTimeout(r, 260));
      const m = JSON.parse(await page.eval(MEASURE));
      console.log(v.name.padEnd(10), JSON.stringify(m));
    }
    await page.close();
  }
} finally { await browser.close(); }
