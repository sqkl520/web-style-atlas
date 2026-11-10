// r10-scoped.mjs — 验证「作用域最小」的写法与全局写法等效
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = `
(function () {
  var px = function (v) { return Math.round(v * 100) / 100; };
  var vh = window.innerHeight;
  var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
  var fully = 0, partly = 0, rowHs = [], maxCapH = 0, minCapH = 1e9, capW = [];
  rows.forEach(function (r) {
    var b = r.getBoundingClientRect();
    rowHs.push(b.height);
    if (b.top >= 0 && b.bottom <= vh) fully++;
    if (b.bottom > 0 && b.top < vh) partly++;
    var c = r.querySelector('.cap');
    if (c) { var cr = c.getBoundingClientRect(); maxCapH = Math.max(maxCapH, cr.height); minCapH = Math.min(minCapH, cr.height); capW.push(px(cr.width)); }
  });
  var r0 = rows[0].getBoundingClientRect();
  return JSON.stringify({
    full: fully, part: partly, firstTop: px(r0.top), firstH: px(r0.height), firstBottom: px(r0.bottom),
    rowHmin: px(Math.min.apply(null, rowHs)), rowHmax: px(Math.max.apply(null, rowHs)),
    capH: px(minCapH) + '~' + px(maxCapH), capWmax: Math.max.apply(null, capW),
    hOv: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight
  });
})()
`;
const STRIP = `Array.prototype.forEach.call(document.querySelectorAll('.cap-warn'), function (c) { c.textContent = c.textContent.replace(/^\\s*⚠\\s*/, ''); });`;

const VS = [
  { name: 'A baseline', css: '', strip: false },
  { name: 'E global (13px,pad5 + meta gap6@all)', css: '.cap{font-size:var(--s-13);padding:1px 5px} .row-meta{column-gap:6px}', strip: true },
  { name: 'F scoped (13px global; pad5+gap6 only <=620)', css: '.cap{font-size:var(--s-13)} @media (max-width:620px){ .cap{padding:1px 5px} .row-meta{column-gap:6px} }', strip: true },
  { name: 'G scoped2 (13px global; gap6 only <=620)', css: '.cap{font-size:var(--s-13)} @media (max-width:620px){ .row-meta{column-gap:6px} }', strip: true },
];

const browser = await Browser.launch();
try {
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    console.log(`\n########## ${w}x${h} ##########`);
    for (const v of VS) {
      const page = await browser.newPage({ width: w, height: h, mobile: w <= 620 });
      await page.setViewport({ width: w, height: h, mobile: w <= 620 });
      await page.goto(PAGE, { settleMs: 1100 });
      await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
      await page.eval(`(function(){
        var s=document.getElementById('__r10'); if(!s){s=document.createElement('style');s.id='__r10';document.head.appendChild(s);}
        s.textContent=${JSON.stringify(v.css)};
        if (${v.strip}) { ${STRIP} }
        return 1;})()`);
      await new Promise((r) => setTimeout(r, 320));
      const m = JSON.parse(await page.eval(M));
      console.log(`${m.full >= 1 ? 'OK ' : '✗  '}${v.name.padEnd(44)} full=${m.full} part=${m.part} firstH=${m.firstH} bottom=${m.firstBottom} capH=${m.capH} capWmax=${m.capWmax} rowH=${m.rowHmin}~${m.rowHmax} hOv=${m.hOv} docH=${m.docH}`);
      await page.close();
    }
  }
} finally { await browser.close(); }
