// r8-cap-emoji.mjs — 390 档：删掉 ⚠ 前缀省下的宽度，是否够让 .cap 在 13px 时仍不换行
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = `
(function () {
  var px = function (v) { return Math.round(v * 100) / 100; };
  var row = document.querySelector('#ledger .row');
  var meta = row.querySelector('.row-meta');
  var caps = Array.prototype.map.call(meta.querySelectorAll('.cap'), function (c) { return { w: px(c.getBoundingClientRect().width), fs: getComputedStyle(c).fontSize, t: c.textContent.trim().slice(0, 30) }; });
  var mr = meta.getBoundingClientRect();
  var rows = {};
  Array.prototype.forEach.call(meta.children, function (k) { var t = px(k.getBoundingClientRect().top - mr.top); rows[t] = (rows[t] || 0) + 1; });
  return JSON.stringify({ metaH: px(mr.height), metaW: px(mr.width), colGap: getComputedStyle(meta).columnGap, rowH: px(row.getBoundingClientRect().height), rowBottom: px(row.getBoundingClientRect().bottom), lines: rows, caps: caps, maxW: px(meta.scrollWidth), clientW: meta.clientWidth });
})()
`;

const VS = [
  { name: 'A baseline 12px+⚠', css: '', stripEmoji: false },
  { name: 'B 12px no ⚠', css: '', stripEmoji: true },
  { name: 'C 13px no ⚠', css: '.cap{font-size:var(--s-13)}', stripEmoji: true },
  { name: 'D 13px + ⚠', css: '.cap{font-size:var(--s-13)}', stripEmoji: false },
  { name: 'E 13px no⚠ nopad', css: '.cap{font-size:var(--s-13);padding:1px 5px}', stripEmoji: true },
];

const browser = await Browser.launch();
try {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await browser.newPage({ width: w, height: h, mobile: w <= 620 });
    await page.setViewport({ width: w, height: h, mobile: w <= 620 });
    await page.goto(PAGE, { settleMs: 1000 });
    await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
    console.log(`\n########## ${w}x${h} ##########`);
    for (const v of VS) {
      // 每次重载页面，避免文本改动累积
      await page.goto(PAGE, { settleMs: 700 });
      await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
      await page.eval(`(function(){
        var s=document.getElementById('__r8'); if(!s){s=document.createElement('style');s.id='__r8';document.head.appendChild(s);}
        s.textContent=${JSON.stringify(v.css)};
        if (${v.stripEmoji}) {
          Array.prototype.forEach.call(document.querySelectorAll('.cap-warn'), function (c) {
            c.textContent = c.textContent.replace(/^\\s*⚠\\s*/, '');
          });
        }
        return 1;})()`);
      await new Promise((r) => setTimeout(r, 300));
      const m = JSON.parse(await page.eval(M));
      console.log(`${v.name.padEnd(20)} metaH=${String(m.metaH).padEnd(6)} rowH=${String(m.rowH).padEnd(7)} rowBottom=${String(m.rowBottom).padEnd(7)} capW=${m.caps.map((c) => c.w).join('/')} fs=${m.caps.map((c) => c.fs).join('/')} lines=${JSON.stringify(m.lines)}`);
      console.log(`   capText: ${m.caps.map((c) => c.t).join(' | ')}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
