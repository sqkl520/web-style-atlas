// r17-body.mjs — probe 的 body 样本到底选中了哪个元素：Archivo / 13px / lh1.5 / chars>=60
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(PAGE, { settleMs: 1200 });
  await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
  console.log(await page.eval(`
  (function(){
    // 复现 probe 的 body 采样：size 10..24、chars>=60、非 code、非 data-ui
    var rows=[];
    Array.prototype.forEach.call(document.querySelectorAll('body *'), function(el){
      var cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden') return;
      var fs=parseFloat(cs.fontSize);
      if(!(fs>=10&&fs<=24)) return;
      if(el.closest('pre,code,kbd,[data-ui]')) return;
      var direct='';
      Array.prototype.forEach.call(el.childNodes,function(n){if(n.nodeType===3)direct+=n.nodeValue;});
      var t=direct.replace(/\\s+/g,' ').trim();
      if(t.length<60) return;
      rows.push({el:el.tagName.toLowerCase()+'.'+((el.className||'').trim().split(/\\s+/).join('.')), fs:fs, fam:cs.fontFamily.split(',')[0].replace(/["']/g,''), chars:t.length, lh:cs.lineHeight, sample:t.slice(0,50)});
    });
    // 按 (fam|size) 聚合字符数，取最大
    var agg={};
    rows.forEach(function(r){var k=r.fam+'|'+Math.round(r.fs);agg[k]=(agg[k]||0)+r.chars;});
    var top=Object.entries(agg).sort(function(a,b){return b[1]-a[1];})[0];
    return JSON.stringify({bodyTop: top, candidates: rows.slice(0,6)}, null, 1);
  })()`));
  await page.close();
} finally { await browser.close(); }
