// r11-meta.mjs — 390 档 .row-meta 三个子项的身份与宽度（写注释前核实）
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 390, height: 844, mobile: true });
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.goto(PAGE, { settleMs: 1200 });
  await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
  console.log(await page.eval(`
  (function(){
    var px=function(v){return Math.round(v*100)/100;};
    var out=[];
    Array.prototype.forEach.call(document.querySelectorAll('#ledger .row'), function(r,i){
      if(i>2) return;
      var meta=r.querySelector('.row-meta');
      var mr=meta.getBoundingClientRect();
      var kids=Array.prototype.map.call(meta.children,function(k){
        var b=k.getBoundingClientRect();
        return {tag:k.tagName.toLowerCase(),cls:(k.className||'(none)'),w:px(b.width),h:px(b.height),fs:getComputedStyle(k).fontSize,txt:(k.textContent||'').trim().slice(0,26)};
      });
      out.push({row:i+1, metaW:px(mr.width), metaH:px(mr.height), colGap:getComputedStyle(meta).columnGap, rowGap:getComputedStyle(meta).rowGap, kids:kids});
    });
    return JSON.stringify(out,null,1);
  })()`));
  await page.close();
} finally { await browser.close(); }
