// Paint-truth probe: a closed <details>'s children still report rects (the repo's own
// documented trap, index.html ~1103-1119). Judge by hit-testing, not by getBoundingClientRect.
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

{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(500);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(900);

  log('collapsedStrip', await page.eval(`(() => {
    const s=document.getElementById('tpl-strip');
    const a=s.querySelector('.tpl-open');
    const lead=s.querySelector('.tpl-strip-lead');
    const r=a.getBoundingClientRect();
    const cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
    const hit = (cy>=0 && cy<innerHeight) ? document.elementFromPoint(cx, cy) : null;
    // ::details-content owns the hidden state in Chromium; read it explicitly
    const cs = getComputedStyle(s, '::details-content');
    return {
      open: s.open,
      stripH: +s.getBoundingClientRect().height.toFixed(1),
      linkRectH: +r.height.toFixed(1),
      // paint truth: is the link the actual hit target at its own centre?
      hitIsLink: !!(hit && (hit === a || a.contains(hit))),
      hitTag: hit ? hit.tagName + '.' + (hit.className||'') : null,
      hitText: hit ? (hit.innerText||'').replace(/\\s+/g,' ').slice(0,30) : null,
      detailsContentVisibility: cs.contentVisibility || cs.getPropertyValue('content-visibility'),
      leadVisibleRect: +lead.getBoundingClientRect().height.toFixed(1),
      activeInStrip: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#tpl-strip')),
    };
  })()`));

  // Now click exactly where the collapsed link claims to be: nothing must navigate.
  const before = await page.eval('location.href');
  const box = await page.eval(`(() => { const a=document.querySelector('#tpl-strip .tpl-open'); const r=a.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)}; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(800);
  log('clickDeadSpot', { before, after: await page.eval('location.href'), samePage: before === (await page.eval('location.href')) });

  // Expanding then hit-testing must flip to true
  await page.eval(`(() => { document.getElementById('tpl-strip').open = true; return 1; })()`);
  await sleep(600);
  log('expandedStripHit', await page.eval(`(() => {
    const s=document.getElementById('tpl-strip'); const a=s.querySelector('.tpl-open');
    const r=a.getBoundingClientRect(); const cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
    const hit=(cy>=0&&cy<innerHeight)?document.elementFromPoint(cx,cy):null;
    return { open:s.open, stripH:+s.getBoundingClientRect().height.toFixed(1),
      hitIsLink: !!(hit && (hit===a || a.contains(hit))),
      linkTop:+(r.top+scrollY).toFixed(1), inViewport: r.top>=0 && r.bottom<=innerHeight }; })()`));
  await page.close();
}

writeFileSync('deliverables/69-exec/_bce/paint-truth.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote paint-truth.json');
await browser.close();
