// End-to-end find-in-page test with REAL keyboard events (Ctrl+F, type, Enter).
// Question: does a folded field become invisible to the browser's find, or does Chrome auto-expand it?
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const LAB = resolve('deliverables/65-audit/lab');
const srv = await startLabServer({
  root: resolve('.'), labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();
const out = {};

async function key(page, type, opts) {
  await page.send('Input.dispatchKeyEvent', { type, ...opts });
}
async function pressCtrlF(page) {
  const base = { modifiers: 2, key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 };
  await key(page, 'rawKeyDown', base);
  await key(page, 'char', { ...base, text: 'f', unmodifiedText: 'f' });
  await key(page, 'keyUp', base);
}
async function typeText(page, text) {
  for (const ch of text) {
    await page.send('Input.insertText', { text: ch }).catch(async () => {
      await key(page, 'char', { text: ch, key: ch, code: '', windowsVirtualKeyCode: 0 });
    });
    await sleep(40);
  }
}
async function pressEnter(page) {
  const base = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await key(page, 'rawKeyDown', base); await key(page, 'char', { ...base, text: '\r' }); await key(page, 'keyUp', base);
}

for (const variant of ['base', 'ren']) {
  for (const c of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: c.w, height: c.h, mobile: c.mobile });
    const qs = variant === 'base' ? '' : '?lab=' + variant;
    await page.goto(srv.origin + '/prototypes/_selection/index.html' + qs, { settleMs: 900 });
    await page.eval(() => document.querySelector('.row[data-id="S15"]').click());
    await sleep(800);
    await page.eval(() => { document.getElementById('detail').scrollTop = 0; });

    // baseline of fold state
    const before = await page.eval(() => ({
      open: [...document.querySelectorAll('#detail details[open]')].map((d) => (d.querySelector('.lab-grp-t') || {}).textContent),
      closed: [...document.querySelectorAll('#detail details:not([open])')].map((d) => (d.querySelector('.lab-grp-t') || {}).textContent),
      selection: String(window.getSelection()),
    }));

    // DOM text index (same TextFinder Chrome's find bar uses)
    await page.send('DOM.enable');
    const searches = {};
    for (const [k, term] of [['foldedLanding', '性能预算'], ['foldedMotion', 'cubic-bezier'], ['openDef', '渔场']]) {
      const r = await page.send('DOM.performSearch', { query: term }).catch((e) => ({ error: e.message }));
      searches[k] = r.resultCount ?? r.error;
      if (r.searchId) await page.send('DOM.discardSearchResults', { searchId: r.searchId }).catch(() => {});
    }

    // real Ctrl+F, type a term that only exists in a folded field
    await pressCtrlF(page);
    await sleep(300);
    await typeText(page, '性能预算');
    await sleep(500);
    const afterType = await page.eval(() => ({
      selection: String(window.getSelection()).slice(0, 40),
      open: [...document.querySelectorAll('#detail details[open]')].map((d) => (d.querySelector('.lab-grp-t') || {}).textContent),
      activeEl: (document.activeElement || {}).tagName,
      dialogOpen: !!document.querySelector('dialog, [role="dialog"]'),
    }));
    await pressEnter(page);
    await sleep(600);
    const afterEnter = await page.eval(() => {
      const d = document.getElementById('detail');
      const sel = window.getSelection();
      const selText = String(sel);
      let selVisible = null, selInClosed = null;
      if (sel.rangeCount) {
        const r = sel.getRangeAt(0).getClientRects();
        selVisible = r.length ? +r[0].height.toFixed(1) : 0;
        const node = sel.getRangeAt(0).startContainer.parentElement;
        selInClosed = !!(node && node.closest('details:not([open])'));
      }
      return {
        selText, selVisible, selInClosed,
        detailScrollTop: d.scrollTop,
        pageScrollY: window.scrollY,
        open: [...document.querySelectorAll('#detail details[open]')].map((x) => (x.querySelector('.lab-grp-t') || {}).textContent),
      };
    });

    out[variant + '-' + c.k] = { before, searches, afterType, afterEnter };
    console.log(`\n=== ${variant} ${c.k} ===`);
    console.log('  closed groups before:', JSON.stringify(before.closed));
    console.log('  DOM.performSearch counts:', JSON.stringify(searches));
    console.log('  after Ctrl+F + type 性能预算:', JSON.stringify(afterType));
    console.log('  after Enter:', JSON.stringify(afterEnter));
    await page.close();
  }
}

writeFileSync(join(LAB, 'findinpage.json'), JSON.stringify(out, null, 2));
await browser.close();
await srv.close();
