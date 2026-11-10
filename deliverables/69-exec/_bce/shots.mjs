// Evidence screenshots for the B/C/E report.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await Browser.launch({ width: 1200, height: 900 });
async function open(w, h, mobile, port) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: false });
  await page.setViewport({ width: w, height: h, mobile, dsf: 1 });
  await page.goto(`http://127.0.0.1:${port}/prototypes/_selection/`, { settleMs: 1400 });
  await page.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1');
  await sleep(1500);
  return page;
}
const DIR = 'deliverables/69-exec/_bce/shots';

// BEFORE (overlay 9312, if up) — otherwise skip gracefully
try {
  const p = await open(390, 844, true, 9312);
  await p.eval(`(() => { document.getElementById('rail-fold').open = true; const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(900);
  await p.eval('scrollTo(0,0)'); await sleep(400);
  await p.screenshot({ path: `${DIR}/before-390-coffee-firstscreen.png`, format: 'png' });
  await p.close();
  console.log('before shot ok');
} catch (e) { console.log('before shot skipped: ' + e.message); }

// AFTER: 390 coffee, rail auto-collapsed
{
  const p = await open(390, 844, true, 9311);
  await p.eval(`(() => { document.getElementById('rail-fold').open = true; const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(1000);
  await p.eval('scrollTo(0,0)'); await sleep(400);
  await p.screenshot({ path: `${DIR}/after-390-coffee-firstscreen.png`, format: 'png' });
  // expanded strip
  await p.eval(`(() => { document.getElementById('tpl-strip').open = true; return 1; })()`);
  await sleep(500);
  await p.eval('scrollTo(0,0)'); await sleep(300);
  await p.screenshot({ path: `${DIR}/after-390-coffee-strip-expanded.png`, format: 'png' });
  await p.close();
  console.log('after coffee shot ok');
}

// AFTER: 390 restaurant empty state, inline link
{
  const p = await open(390, 844, true, 9311);
  await p.eval(`(() => { const q=document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(900);
  await p.eval('scrollTo(0,0)'); await sleep(400);
  await p.screenshot({ path: `${DIR}/after-390-restaurant-inline.png`, format: 'png' });
  await p.close();
  console.log('restaurant shot ok');
}

// BEFORE + AFTER: 390 detail riskNote (S15)
for (const [port, tag] of [[9312, 'before'], [9311, 'after']]) {
  try {
    const p = await open(390, 844, true, port);
    await p.eval(`location.hash='#S15'`);
    await sleep(1100);
    await p.screenshot({ path: `${DIR}/${tag}-390-S15-risknook.png`, format: 'png' });
    await p.close();
    console.log(tag + ' S15 shot ok');
  } catch (e) { console.log(tag + ' S15 skipped: ' + e.message); }
}
await browser.close();
