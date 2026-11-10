// Robustness: collapsed strip + hidden cycle, resize across the breakpoint,
// and whether the collapsed strip's dead click area swallows taps.
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

// 1. narrow -> wide -> narrow: does the strip state follow the contract?
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); document.getElementById('rail-fold').open=true; b.click(); return 1; })()`);
  await sleep(800);
  const n1 = await page.eval(`(() => ({ w:innerWidth, open:document.getElementById('tpl-strip').open, h:+document.getElementById('tpl-strip').getBoundingClientRect().height.toFixed(1) }))()`);
  await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await sleep(900);
  const wide = await page.eval(`(() => ({ w:innerWidth, open:document.getElementById('tpl-strip').open, h:+document.getElementById('tpl-strip').getBoundingClientRect().height.toFixed(1) }))()`);
  await page.setViewport({ width: 390, height: 844, mobile: true, dsf: 1 });
  await sleep(900);
  const n2 = await page.eval(`(() => ({ w:innerWidth, open:document.getElementById('tpl-strip').open, h:+document.getElementById('tpl-strip').getBoundingClientRect().height.toFixed(1) }))()`);
  log('resizeCycle', { n1, wide, n2 });
  await page.close();
}

// 2. deep link straight into a detail while the strip is collapsed (no crash, no overlap)
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { const q=document.getElementById('q'); q.value='咖啡'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(700);
  await page.eval(`location.hash='#S06'`);
  await sleep(1000);
  log('deeplink', await page.eval(`(() => {
    const d=document.getElementById('detail'), s=document.getElementById('tpl-strip');
    return { detailOpen:!d.hidden, detailPos:getComputedStyle(d).position,
      stripOpen:s.open, stripHidden:s.hidden, stripH:+s.getBoundingClientRect().height.toFixed(1),
      consoleErrors: window.__errs ? window.__errs.length : 0 }; })()`));
  await page.close();
}

// 3. rapid chip clicks (A then B then A) must not leave the rail in a wrong state
{
  const page = await open(390, 844, true);
  const clickChip = async (scene) => {
    await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')===${JSON.stringify(scene)}); if(b) b.click(); return 1; })()`);
    await sleep(500);
  };
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(400);
  await clickChip('咖啡店');
  // reopen rail then pick another chip
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(400);
  await clickChip('烘焙');
  const st = await page.eval(`(() => ({ railOpen: document.getElementById('rail-fold').open,
    count: document.getElementById('count').textContent,
    pressed: [...document.querySelectorAll('.scene-chip[aria-pressed="true"]')].map(x=>x.getAttribute('data-scene')),
    rows: document.querySelectorAll('#ledger .row').length,
    stripSum: (document.getElementById('tpl-strip-sum').innerText||'').trim() }))()`);
  log('rapidChips', st);
  await page.close();
}

// 4. chip click while a search term is parked (the "chip dead end" region) must still work
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { const q=document.getElementById('q'); q.value='咖啡店'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(700);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(400);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(900);
  log('parkedThenChip', await page.eval(`(() => {
    const pk=document.getElementById('q-parked');
    return { rows:document.querySelectorAll('#ledger .row').length,
      count:document.getElementById('count').textContent,
      railOpen:document.getElementById('rail-fold').open,
      parkedVisible: !!(pk && !pk.hidden), parkedText: pk? (pk.innerText||'').replace(/\\s+/g,' ').slice(0,60):null,
      firstTop:+document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(1),
      firstFull: (()=>{const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight; return rows.filter(e=>{const r=e.getBoundingClientRect();return r.top>=-0.5&&r.bottom<=vh+0.5;}).length;})() }; })()`));
  await page.close();
}

writeFileSync('deliverables/69-exec/_bce/robust.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote robust.json');
await browser.close();
