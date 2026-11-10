// r9-cap-final.mjs — 候选方案全量实测：30 个行卡的 meta 行数、行卡高、首屏、doc 高、横向溢出
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
  var fully = 0, partly = 0, rowHs = [], metaLinesMax = 0, capWraps = 0;
  rows.forEach(function (r) {
    var b = r.getBoundingClientRect();
    rowHs.push(px(b.height));
    if (b.top >= 0 && b.bottom <= vh) fully++;
    if (b.bottom > 0 && b.top < vh) partly++;
    var meta = r.querySelector('.row-meta');
    if (meta) {
      var mr = meta.getBoundingClientRect();
      var tops = {};
      Array.prototype.forEach.call(meta.children, function (k) { tops[Math.round(k.getBoundingClientRect().top - mr.top)] = 1; });
      // 把 ±4px 内的 top 合并成同一行
      var keys = Object.keys(tops).map(Number).sort(function (a, b) { return a - b; });
      var lines = 0, last = -999;
      keys.forEach(function (t) { if (t - last > 6) { lines++; last = t; } });
      metaLinesMax = Math.max(metaLinesMax, lines);
    }
    var cap = r.querySelector('.cap');
    if (cap) { var cr = cap.getBoundingClientRect(); if (cr.height > 30) capWraps++; }
  });
  var r0 = rows[0].getBoundingClientRect();
  return JSON.stringify({
    full: fully, part: partly,
    firstTop: px(r0.top), firstH: px(r0.height), firstBottom: px(r0.bottom),
    rowHmin: Math.min.apply(null, rowHs), rowHmax: Math.max.apply(null, rowHs),
    rowHavg: px(rowHs.reduce(function (a, b) { return a + b; }, 0) / rowHs.length),
    metaLinesMax: metaLinesMax, capWraps: capWraps,
    hOv: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight
  });
})()
`;

const STRIP = `Array.prototype.forEach.call(document.querySelectorAll('.cap-warn'), function (c) { c.textContent = c.textContent.replace(/^\\s*⚠\\s*/, ''); });`;

const VS = [
  { name: 'A baseline 12px', css: '', strip: false },
  { name: 'B 13px only', css: '.cap{font-size:var(--s-13)}', strip: true },
  { name: 'C 13px+gap6', css: '.cap{font-size:var(--s-13)} .row-meta{column-gap:6px}', strip: true },
  { name: 'D 13px+pad4+gap8', css: '.cap{font-size:var(--s-13);padding:1px 4px} .row-meta{column-gap:8px}', strip: true },
  { name: 'E 13px+gap6+pad5', css: '.cap{font-size:var(--s-13);padding:1px 5px} .row-meta{column-gap:6px}', strip: true },
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
        var s=document.getElementById('__r9'); if(!s){s=document.createElement('style');s.id='__r9';document.head.appendChild(s);}
        s.textContent=${JSON.stringify(v.css)};
        ${v.strip ? STRIP : ''}
        return 1;})()`);
      await new Promise((r) => setTimeout(r, 320));
      const m = JSON.parse(await page.eval(M));
      const ok = m.full >= 1 ? 'OK ' : '✗  ';
      console.log(`${ok}${v.name.padEnd(20)} full=${m.full} part=${m.part} firstTop=${m.firstTop} firstH=${m.firstH} bottom=${m.firstBottom} capWrap=${m.capWraps} metaLines≤${m.metaLinesMax} rowH=${m.rowHmin}~${m.rowHmax}/avg${m.rowHavg} hOv=${m.hOv} docH=${m.docH}`);
      await page.close();
    }
  }
} finally { await browser.close(); }
