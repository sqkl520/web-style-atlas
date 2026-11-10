// Keyboard-only chip activation, exactly as a keyboard user does it, plus what happens next.
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

// FIXED: focus the chip via Tab-equivalent (real .focus()), then Enter via Input domain.
{
  const page = await open(390, 844, true);
  // A keyboard user would have expanded the rail first (it is collapsed by default in narrow).
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(600);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.focus(); return document.activeElement === b; })()`);
  await sleep(300);
  const pre = await page.eval(`(() => ({ active: document.activeElement.getAttribute('data-scene'), pressed: document.activeElement.getAttribute('aria-pressed') }))()`);
  // Use rawKeyDown + char + keyUp the way Chrome synthesises Enter on a button.
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await sleep(900);
  log('keyboardChip', { pre, post: await page.eval(`(() => ({
    railOpen: document.getElementById('rail-fold').open,
    rows: document.querySelectorAll('#ledger .row').length,
    count: document.getElementById('count').textContent,
    activeTag: document.activeElement.tagName,
    activeIsSummary: document.activeElement === document.querySelector('#rail-fold > summary'),
    focusVisible: document.activeElement.matches(':focus-visible'),
    outlineW: getComputedStyle(document.activeElement).outlineWidth,
    outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
    pressedChips: document.querySelectorAll('.scene-chip[aria-pressed="true"]').length,
    firstTop: +document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(1),
  }))()`) });

  // After the collapse, pressing J must still work (focus is on summary, not a button/input).
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 74, key: 'j', code: 'KeyJ', text: 'j' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 74, key: 'j', code: 'KeyJ' });
  await sleep(800);
  log('afterJ', await page.eval(`(() => ({ detailOpen: !document.getElementById('detail').hidden, dNo: (document.getElementById('d-no')||{}).textContent }))()`));

  // Escape closes the detail, focus handling must not crash
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape', text: '' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' });
  await sleep(600);
  log('afterEsc', await page.eval(`(() => ({ detailHidden: document.getElementById('detail').hidden, activeTag: document.activeElement.tagName }))()`));

  // And summary must open again with Enter (the native behaviour we rely on)
  await page.eval(`(() => { document.querySelector('#rail-fold > summary').focus(); return 1; })()`);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await sleep(700);
  log('summaryEnterOpens', await page.eval(`(() => ({ railOpen: document.getElementById('rail-fold').open, railH:+document.getElementById('rail-fold').getBoundingClientRect().height.toFixed(1) }))()`));
  await page.close();
}

// 390: collapsed strip children must be unfocusable (no tab into hidden links)
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(500);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(900);
  log('collapsedStripFocusable', await page.eval(`(() => { const s=document.getElementById('tpl-strip');
    const links=[...s.querySelectorAll('a')];
    return { open:s.open, links: links.length,
      visibleLinks: links.filter(a=>a.getBoundingClientRect().height>0).length,
      detailContentVisibility: (()=>{ const c=s.querySelector('.tpl-strip-lead'); return c?getComputedStyle(c).visibility:'-'; })() }; })()`));
  // Tab through the page and see whether any collapsed strip link receives focus
  const seq = [];
  for (let i = 0; i < 40; i++) {
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await sleep(60);
    const cur = await page.eval(`(() => { const a=document.activeElement; const r=a.getBoundingClientRect();
      const inStrip = !!a.closest && !!a.closest('#tpl-strip');
      return { tag:a.tagName, inStrip, h:+r.height.toFixed(1), text:(a.innerText||'').replace(/\\s+/g,' ').slice(0,18) }; })()`);
    seq.push(cur);
  }
  log('tabSequence', { count: seq.length, anyCollapsedStripLink: seq.some((s) => s.inStrip && s.h < 1), stripEntries: seq.filter((s) => s.inStrip) });
  await page.close();
}

// Strip expanded: Tab must reach the open link, and geometry must be reported honestly
{
  const page = await open(390, 844, true);
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(500);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.getAttribute('data-scene')==='咖啡店'); b.click(); return 1; })()`);
  await sleep(800);
  await page.eval(`(() => { document.getElementById('tpl-strip').open = true; return 1; })()`);
  await sleep(500);
  log('expandedStrip', await page.eval(`(() => { const s=document.getElementById('tpl-strip'); const a=s.querySelector('.tpl-open');
    return { open:s.open, h:+s.getBoundingClientRect().height.toFixed(1), openLinkTop:+(a.getBoundingClientRect().top+scrollY).toFixed(1) }; })()`));
  await page.close();
}

writeFileSync('deliverables/69-exec/_bce/interact2.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote interact2.json');
await browser.close();
