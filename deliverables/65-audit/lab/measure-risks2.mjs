// Round 2 of risk measurement, using only facts that are actually measurable here.
//  A) Is folded text *rendered*? (layout boxes + checkVisibility) — the underlying fact behind Ctrl+F.
//  B) Does find-in-page style text matching still reach it? (DOM.performSearch = the same DOM text index)
//  C) Scroll bleed: with the panel as an overlay, where does the page behind end up after closing?
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const LAB = resolve('deliverables/65-audit/lab');
const srv = await startLabServer({
  root: resolve('.'),
  labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();
const out = {};

for (const variant of ['base', 'ren']) {
  for (const c of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: c.w, height: c.h, mobile: c.mobile });
    const qs = variant === 'base' ? '' : '?lab=' + variant;
    await page.goto(srv.origin + '/prototypes/_selection/index.html' + qs, { settleMs: 900 });
    await page.eval(() => document.querySelector('.row[data-id="S15"]').click());
    await sleep(800);

    // ── A) rendered-ness of a folded field's text ──
    const rendered = await page.eval(() => {
      const probe = (term) => {
        // find the element whose text contains term (a field dd, or a group body)
        const all = [...document.querySelectorAll('#detail dd, #detail li, #detail p')];
        const host = all.find((e) => (e.textContent || '').includes(term));
        if (!host) return { found: false };
        const closedAncestor = host.closest('details:not([open])');
        const range = document.createRange();
        range.selectNodeContents(host);
        const rects = range.getClientRects();
        const boxes = [...rects].filter((r) => r.width > 0 && r.height > 0).length;
        return {
          found: true,
          inClosedDetails: !!closedAncestor,
          layoutBoxes: boxes,
          checkVisibility: host.checkVisibility ? host.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }) : null,
          textLen: (host.textContent || '').length,
        };
      };
      return {
        foldedLanding: probe('性能预算'),      // lives in 可落地要点
        foldedMotion: probe('cubic-bezier'),   // lives in 动效与交互
        openDef: probe('渔场'),
        detailsCount: document.querySelectorAll('#detail details').length,
        closedCount: document.querySelectorAll('#detail details:not([open])').length,
      };
    });

    // ── B) DOM text search (same index the browser's find uses) ──
    const domSearch = {};
    for (const [k, term] of [['folded', '性能预算'], ['open', '渔场平面簿']]) {
      try {
        const r = await page.send('DOM.performSearch', { query: term, includeUserAgentShadowDOM: false });
        let count = r.resultCount;
        domSearch[k] = { resultCount: count };
        if (r.searchId) await page.send('DOM.discardSearchResults', { searchId: r.searchId }).catch(() => {});
      } catch (e) { domSearch[k] = { error: e.message.slice(0, 80) }; }
    }

    // ── C) scroll bleed, end to end ──
    const beforeList = await page.eval(() => {
      const row = document.querySelector('.row[data-id="S15"]');
      const r = row.getBoundingClientRect();
      return { pageY: window.scrollY, rowTop: +r.top.toFixed(1), bodyClass: document.body.className };
    });
    await page.eval(() => { const d = document.getElementById('detail'); d.scrollTop = d.scrollHeight; });
    await page.wheel(600, { step: 200, pauseMs: 60 });
    await sleep(400);
    const mid = await page.eval(() => ({ pageY: window.scrollY, panelScrollTop: document.getElementById('detail').scrollTop }));
    await page.eval(() => document.getElementById('d-close').click());
    await sleep(400);
    const afterClose = await page.eval(() => {
      const row = document.querySelector('.row[data-id="S15"]');
      const r = row ? row.getBoundingClientRect() : null;
      return { pageY: window.scrollY, rowTop: r ? +r.top.toFixed(1) : null, detailHidden: document.getElementById('detail').hidden };
    });

    out[variant + '-' + c.k] = { rendered, domSearch, beforeList, mid, afterClose };
    console.log(`\n=== ${variant} ${c.k} ===`);
    console.log('  rendered:', JSON.stringify(rendered));
    console.log('  dom text search:', JSON.stringify(domSearch));
    console.log('  bleed: before', JSON.stringify(beforeList), '-> wheel at panel bottom', JSON.stringify(mid));
    console.log('  after close:', JSON.stringify(afterClose));
    await page.close();
  }
}

writeFileSync(join(LAB, 'risks2.json'), JSON.stringify(out, null, 2));
await browser.close();
await srv.close();
