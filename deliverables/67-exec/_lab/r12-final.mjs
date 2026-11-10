// r12-final.mjs — 最终方案：三处 <13px 全部收到 13px，并在窄档补回 .cap 的横向空间。
// 对比：基线 / 仅 13px / 13px+窄档 gap6 / 13px+窄档 pad5+gap6，看 30 案 docH 与首屏。
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
  var fully = 0, partly = 0, rowHs = [], capHs = [], capFs = new Set(), figFs = new Set(), tplFs = new Set();
  rows.forEach(function (r) {
    var b = r.getBoundingClientRect();
    rowHs.push(b.height);
    if (b.top >= 0 && b.bottom <= vh) fully++;
    if (b.bottom > 0 && b.top < vh) partly++;
    var c = r.querySelector('.cap');
    if (c) { capHs.push(c.getBoundingClientRect().height); capFs.add(getComputedStyle(c).fontSize); }
    var f = r.querySelector('.shot figcaption');
    if (f) figFs.add(getComputedStyle(f).fontSize);
  });
  var tpl = document.querySelector('.scene-tpl');
  if (tpl) tplFs.add(getComputedStyle(tpl).fontSize);
  var r0 = rows[0].getBoundingClientRect();
  var worst = 0, worstName = '';
  rows.forEach(function (r) {
    var b = r.getBoundingClientRect();
    if (b.top >= 0 && b.bottom <= vh) { var slack = vh - b.bottom; if (worstName === '' || slack < worst) { worst = slack; worstName = (r.querySelector('.no') || {}).textContent || '?'; } }
  });
  return JSON.stringify({
    full: fully, part: partly, firstTop: px(r0.top), firstH: px(r0.height), firstBottom: px(r0.bottom),
    rowHmin: px(Math.min.apply(null, rowHs)), rowHmax: px(Math.max.apply(null, rowHs)),
    capFs: [...capFs], figFs: [...figFs], tplFs: [...tplFs],
    capHmax: px(Math.max.apply(null, capHs)),
    worstSlack: px(worst), worstSlackRow: worstName.trim(),
    hOv: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight
  });
})()
`;
const STRIP = `Array.prototype.forEach.call(document.querySelectorAll('.cap-warn'), function (c) { c.textContent = c.textContent.replace(/^\\s*⚠\\s*/, ''); });`;

const VS = [
  { name: 'A baseline', css: '', strip: false },
  { name: 'B all13 only', css: '.cap{font-size:var(--s-13)} .scene-tpl{font-size:var(--s-13)}', strip: true },
  { name: 'C all13+narrow gap6', css: '.cap{font-size:var(--s-13)} .scene-tpl{font-size:var(--s-13)} @media (max-width:620px){ .row-meta{column-gap:6px} }', strip: true },
  { name: 'D all13+narrow pad5+gap6', css: '.cap{font-size:var(--s-13)} .scene-tpl{font-size:var(--s-13)} @media (max-width:620px){ .cap{padding:1px 5px} .row-meta{column-gap:6px} }', strip: true },
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
        var s=document.getElementById('__r12'); if(!s){s=document.createElement('style');s.id='__r12';document.head.appendChild(s);}
        s.textContent=${JSON.stringify(v.css)};
        if (${v.strip}) { ${STRIP} }
        return 1;})()`);
      await new Promise((r) => setTimeout(r, 320));
      const m = JSON.parse(await page.eval(M));
      console.log(`${m.full >= 1 ? 'OK ' : '✗  '}${v.name.padEnd(28)} full=${m.full} part=${m.part} firstH=${m.firstH} bot=${m.firstBottom} cap=${m.capFs}/h${m.capHmax} fig=${m.figFs} tpl=${m.tplFs} worstSlack=${m.worstSlack}(${m.worstSlackRow}) rowH=${m.rowHmin}~${m.rowHmax} hOv=${m.hOv} docH=${m.docH}`);
      await page.close();
    }
  }
} finally { await browser.close(); }
