// Clean re-check of the expanded strip: no detail overlay in the way.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const PORT = process.argv[2] || '9311';
const BASE = `http://127.0.0.1:${PORT}/prototypes/_selection/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, '=', JSON.stringify(v)); };

const browser = await Browser.launch({ width: 1200, height: 900 });
async function open(w, h, mobile) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: false });
  await page.setViewport({ width: w, height: h, mobile, dsf: 1 });
  await page.goto(BASE, { settleMs: 1400 });
  await page.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1');
  await sleep(1500);
  return page;
}
const probe = `(() => {
  const s=document.getElementById('tpl-strip'); const a=s.querySelector('.tpl-open');
  if(!a) return { noLink:true, open:s.open };
  const r=a.getBoundingClientRect();
  const cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
  const inVp = cy>=0 && cy<innerHeight;
  const hit = inVp ? document.elementFromPoint(cx, cy) : null;
  return { open:s.open, stripH:+s.getBoundingClientRect().height.toFixed(1),
    linkTopVp:+r.top.toFixed(1), linkTopDoc:+(r.top+scrollY).toFixed(1), inViewport:inVp,
    hitIsLink: !!(hit && (hit===a || a.contains(hit))),
    hitTag: hit? hit.tagName : null,
    detailOpen: !document.getElementById('detail').hidden,
    contentVis: (getComputedStyle(s,'::details-content').contentVisibility || '-') };
})()`;

{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(500);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(900);
  log('collapsed', await page.eval(probe));

  // expand via a real click on the summary
  const b = await page.eval(`(() => { const sm=document.getElementById('tpl-strip-sum'); sm.scrollIntoView({block:'center'}); const r=sm.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2), y_doc:+(r.top+scrollY).toFixed(1)}; })()`);
  await sleep(300);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(700);
  log('afterSummaryClick', await page.eval(probe));
  // scroll so the link is in view, then hit-test again
  await page.eval(`(() => { const a=document.querySelector('#tpl-strip .tpl-open'); a.scrollIntoView({block:'center'}); return 1; })()`);
  await sleep(400);
  log('expandedScrolled', await page.eval(probe));
  await page.close();
}

// Same on 1440: strip must be open by default with no summary, identical to a plain section
{
  const page = await open(1440, 900, false);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(900);
  log('wide', await page.eval(`(() => { const s=document.getElementById('tpl-strip'); const sm=document.getElementById('tpl-strip-sum');
    const a=s.querySelector('.tpl-open'); const r=a.getBoundingClientRect();
    const hit=document.elementFromPoint(Math.round(r.left+r.width/2), Math.round(r.top+r.height/2));
    return { open:s.open, stripH:+s.getBoundingClientRect().height.toFixed(1),
      sumDisplay:getComputedStyle(sm).display, sumH:+sm.getBoundingClientRect().height.toFixed(1),
      leadTop:+(document.getElementById('tpl-strip-lead').getBoundingClientRect().top+scrollY).toFixed(1),
      hitIsLink: !!(hit && (hit===a || a.contains(hit))), linkTop:+(r.top+scrollY).toFixed(1) }; })()`));
  await page.close();
}
writeFileSync('deliverables/69-exec/_bce/paint-truth2.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote paint-truth2.json');
await browser.close();
