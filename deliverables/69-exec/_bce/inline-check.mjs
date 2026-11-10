// Zoomed register: where the inline link sits vs the "打开 M02" button, both first screen.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await Browser.launch({ width: 1200, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: false });
await p.setViewport({ width: 390, height: 844, mobile: true, dsf: 2 });
await p.goto('http://127.0.0.1:9311/prototypes/_selection/', { settleMs: 1400 });
await p.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1');
await sleep(1500);
await p.eval(`(() => { const q=document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
await sleep(900);
const info = await p.eval(`(() => {
  const vh=innerHeight, sy=scrollY;
  const box=(sel)=>{const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect();
    return {top:+(r.top+sy).toFixed(1), bottom:+(r.bottom+sy).toFixed(1), screens:+((r.top+sy)/vh).toFixed(3),
      visiblePx:+Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0)).toFixed(1)};};
  return { vh, inline: box('#empty-tpl a.tpl-inline'), openBtn: box('#empty-tpl .tpl-open'),
    head: box('#empty-tpl .tpl-empty-head'), emptyTpl: box('#empty-tpl'),
    docH: document.documentElement.scrollHeight };
})()`);
console.log('餐厅 390:', JSON.stringify(info, null, 1));
writeFileSync('deliverables/69-exec/_bce/inline-vs-button.json', JSON.stringify(info, null, 2), 'utf8');
// crop the head sentence with the link, at 2x
await p.screenshot({ path: 'deliverables/69-exec/_bce/shots/crop-390-restaurant-inline-2x.png', format: 'png', clip: { x: 0, y: 640, width: 390, height: 120 } });
await browser.close();
