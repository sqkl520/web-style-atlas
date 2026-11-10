// Interaction / a11y / escaping checks for the B/C/E changes.
// usage: node interact.mjs <port> <tag>
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '9311';
const TAG = process.argv[3] || 'after';
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
async function clickEl(page, sel) {
  const b = await page.eval(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)}; })()`);
  if (!b) return null;
  await sleep(250);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(600);
  return b;
}

// ── A. 390: chip click with MOUSE — focus must not fall to body; rail collapses
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(600);
  await clickEl(page, '#flt-scene button[data-scene="咖啡店"]');
  log('A.afterMouseChip', await page.eval(`(() => ({
    railOpen: document.getElementById('rail-fold').open,
    activeTag: document.activeElement ? document.activeElement.tagName : null,
    activeClass: document.activeElement ? (document.activeElement.className || '') : null,
    activeIsSummary: document.activeElement === document.querySelector('#rail-fold > summary'),
    focusVisible: document.activeElement ? document.activeElement.matches(':focus-visible') : null,
    rows: document.querySelectorAll('#ledger .row').length,
    count: document.getElementById('count').textContent,
    firstTop: +document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(1),
  }))()`).catch((e) => String(e)));

  // Tab from the summary must reach the next focusable, not restart the page
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  await sleep(300);
  log('A.afterTab', await page.eval(`(() => { const a=document.activeElement; const r=a.getBoundingClientRect(); return {
    tag:a.tagName, cls:a.className||'', text:(a.innerText||'').replace(/\\s+/g,' ').slice(0,40),
    top:+(r.top+scrollY).toFixed(0), inPage: r.width>0 && r.height>0 }; })()`));

  // summary must re-open on click
  await clickEl(page, '#rail-fold > summary');
  log('A.reopenByClick', await page.eval(`(() => ({ railOpen: document.getElementById('rail-fold').open, railH:+document.getElementById('rail-fold').getBoundingClientRect().height.toFixed(1) }))()`));
  await page.close();
}

// ── B. 1440 wide: chip click must NOT collapse the rail
{
  const page = await open(1440, 900, false);
  await clickEl(page, '#flt-scene button[data-scene="咖啡店"]');
  log('B.wideChip', await page.eval(`(() => ({
    railOpen: document.getElementById('rail-fold').open,
    railH: +document.getElementById('rail-fold').getBoundingClientRect().height.toFixed(1),
    railBodyKids: document.querySelectorAll('#rail-fold .rail-fold-body > *').length,
    rows: document.querySelectorAll('#ledger .row').length,
    firstCardTop: +document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(1),
  }))()`));
  await page.close();
}

// ── C. 1024 (just above the guard): must NOT collapse either
{
  const page = await open(1024, 900, false);
  await clickEl(page, '#flt-scene button[data-scene="咖啡店"]');
  log('C.1024Chip', await page.eval(`(() => ({ railOpen: document.getElementById('rail-fold').open, w: innerWidth }))()`));
  await page.close();
}

// ── D. 390: template strip toggle by real click, and summary text correctness
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(600);
  await clickEl(page, '#flt-scene button[data-scene="咖啡店"]');
  const before = await page.eval(`(() => { const s=document.getElementById('tpl-strip'); return { open:s.open, h:+s.getBoundingClientRect().height.toFixed(1), sumText:document.getElementById('tpl-strip-sum').innerText.trim(), leadPainted: document.getElementById('tpl-strip-lead').getBoundingClientRect().height>0 }; })()`);
  await clickEl(page, '#tpl-strip > summary');
  const after = await page.eval(`(() => { const s=document.getElementById('tpl-strip'); return { open:s.open, h:+s.getBoundingClientRect().height.toFixed(1), leadPainted: document.getElementById('tpl-strip-lead').getBoundingClientRect().height>0, cards: s.querySelectorAll('.tpl-card').length, sumText:document.getElementById('tpl-strip-sum').innerText.trim() }; })()`);
  log('D.stripToggle', { before, after });

  // summary text must equal actual card count for a term with exact+adjacent (设计工作室)
  await page.eval(`(() => { const q=document.getElementById('q'); q.value='设计工作室'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(800);
  log('D.summaryVsCards', await page.eval(`(() => { const s=document.getElementById('tpl-strip');
    return { hidden:s.hidden, sumText:(document.getElementById('tpl-strip-sum').innerText||'').trim(),
      cards: s.querySelectorAll('.tpl-card').length,
      cardIds:[...s.querySelectorAll('.tpl-card')].map(c=>c.dataset.tpl),
      lead: (document.getElementById('tpl-strip-lead').innerText||'').replace(/\\s+/g,' ').slice(0,120) }; })()`));

  // a term with rows>0 but no template hit: strip must stay hidden AND show no empty shell
  await page.eval(`(() => { const q=document.getElementById('q'); q.value='红'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(800);
  log('D.noHitStrip', await page.eval(`(() => { const s=document.getElementById('tpl-strip');
    return { hidden:s.hidden, rectH:+s.getBoundingClientRect().height.toFixed(1), display:getComputedStyle(s).display, rows:document.querySelectorAll('#ledger .row').length }; })()`));
  await page.close();
}

// ── E. 390: empty state, inline link href + escaping
{
  const page = await open(390, 844, true);
  for (const term of ['餐厅', '咖啡店', '电商']) {
    await page.eval(`(() => { const q=document.getElementById('q'); q.value=${JSON.stringify(term)}; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await sleep(800);
    log('E.' + term, await page.eval(`(() => { const a=document.querySelector('#empty-tpl a.tpl-inline');
      const head=document.querySelector('#empty-tpl .tpl-empty-head');
      return { inline:a? { href:a.getAttribute('href'), text:a.innerText.trim(), target:a.getAttribute('target'), rel:a.getAttribute('rel'),
        color:getComputedStyle(a).color, deco:getComputedStyle(a).textDecorationLine, fontSize:getComputedStyle(a).fontSize,
        lineHeight:getComputedStyle(a).lineHeight, top:+(a.getBoundingClientRect().top+scrollY).toFixed(1), h:+a.getBoundingClientRect().height.toFixed(1) } : null,
        headText: head? head.innerText.replace(/\\s+/g,' ').trim() : null }; })()`));
  }
  // escaping: a term containing markup must not create elements
  for (const bad of ['<img src=x onerror=alert(1)>', '<b>x</b>', 'a"onmouseover="x']) {
    await page.eval(`(() => { const q=document.getElementById('q'); q.value=${JSON.stringify(bad)}; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await sleep(600);
    log('E.escape:' + bad.slice(0, 12), await page.eval(`(() => {
      const box=document.getElementById('empty-tpl');
      return { injectedTags: box.querySelectorAll('img,b,i,script').length,
        text: (box.querySelector('.tpl-empty-head')||{}).innerText ? box.querySelector('.tpl-empty-head').innerText.replace(/\\s+/g,' ').slice(0,120) : null }; })()`));
  }
  await page.close();
}
{
  const page = await open(1440, 900, false);
  await page.eval(`(() => { const q=document.getElementById('q'); q.value='<img src=x onerror=alert(1)>'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(700);
  log('E.escape1440', await page.eval(`(() => { const box=document.getElementById('empty-tpl'); return { injectedTags: box.querySelectorAll('img,script').length }; })()`));
  await page.close();
}

// ── F. keyboard-only chip activation (Enter) then focus placement
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.focus(); return 1; })()`);
  await sleep(500);
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await sleep(700);
  log('F.keyboardChip', await page.eval(`(() => ({ railOpen: document.getElementById('rail-fold').open,
    activeIsSummary: document.activeElement === document.querySelector('#rail-fold > summary'),
    activeTag: document.activeElement.tagName,
    focusVisible: document.activeElement.matches(':focus-visible'),
    outline: getComputedStyle(document.activeElement).outlineWidth,
    rows: document.querySelectorAll('#ledger .row').length }))()`));
  await page.close();
}

// ── G. after reset: close bar-fold again, confirm baseline is restored
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(500);
  await clickEl(page, '#flt-scene button[data-scene="咖啡店"]');
  await page.eval(`(() => { document.getElementById('bar-fold').open = true; return 1; })()`);
  await sleep(400);
  await clickEl(page, '#reset');
  const withBarOpen = await page.eval(`(() => ({ rows: document.querySelectorAll('#ledger .row').length, railOpen: document.getElementById('rail-fold').open, barOpen: document.getElementById('bar-fold').open, firstTop:+document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(1), stripHidden: document.getElementById('tpl-strip').hidden }))()`);
  await page.eval(`(() => { document.getElementById('bar-fold').open = false; return 1; })()`);
  await sleep(500);
  const restored = await page.eval(`(() => { const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
    const b=rows[0].getBoundingClientRect();
    return { rows:rows.length, firstTop:+(b.top+scrollY).toFixed(1), firstH:+b.height.toFixed(1),
      full: rows.filter(e=>{const r=e.getBoundingClientRect();return r.top>=-0.5&&r.bottom<=vh+0.5;}).length,
      slack: +(vh-(b.top+scrollY+b.height)).toFixed(1), count: document.getElementById('count').textContent }; })()`);
  log('G.resetRestores', { withBarOpen, restored });
  await page.close();
}

// ── H. 390: no JS? details open by default when scripts blocked — check markup only
{
  const page = await open(390, 844, true);
  log('H.markup', await page.eval(`(() => {
    const s=document.getElementById('tpl-strip');
    return { tag:s.tagName, hasOpenAttr: s.hasAttribute('open'), htmlHasOpen: /<details class="tpl-strip" id="tpl-strip" hidden/.test(document.documentElement.outerHTML), open:s.open }; })()`));
  await page.close();
}

writeFileSync(`deliverables/69-exec/_bce/interact-${TAG}.json`, JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote interact-' + TAG + '.json');
await browser.close();
