// Decisive discoverability test: is a folded field still reachable by the browser's text index
// and by accessibility tools? Terms are chosen to appear in exactly ONE field.
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

// unique to one field only (verified from data.js dump)
const TERMS = [
  { k: 'landing', term: 'shape-rendering', field: '可落地要点' },
  { k: 'motion', term: '阻尼', field: '动效与交互' },
  { k: 'visuals', term: '毛口', field: '关键视觉元素' },
  { k: 'layout', term: '图例悬挂', field: '布局与网格' },
];

for (const variant of ['base', 'ren']) {
  for (const c of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: c.w, height: c.h, mobile: c.mobile });
    const qs = variant === 'base' ? '' : '?lab=' + variant;
    await page.goto(srv.origin + '/prototypes/_selection/index.html' + qs, { settleMs: 900 });
    await page.eval(() => document.querySelector('.row[data-id="S15"]').click());
    await sleep(800);

    await page.send('DOM.enable');
    const findIndex = {};
    for (const t of TERMS) {
      const r = await page.send('DOM.performSearch', { query: t.term }).catch((e) => ({ error: e.message }));
      findIndex[t.k] = r.resultCount ?? r.error;
      if (r.searchId) await page.send('DOM.discardSearchResults', { searchId: r.searchId }).catch(() => {});
    }

    // accessibility exposure
    const axTree = await page.send('Accessibility.getFullAXTree').catch((e) => ({ error: e.message }));
    const axText = axTree.nodes
      ? axTree.nodes.map((n) => (n.name && n.name.value) || '').join(' \u0001 ')
      : '';
    const axHits = {};
    for (const t of TERMS) axHits[t.k] = axText.includes(t.term);
    const axNodeCount = axTree.nodes ? axTree.nodes.length : null;

    // where each field actually lives (open vs closed) — what the user can reach by scrolling
    const reach = await page.eval(() => {
      const d = document.getElementById('detail');
      const res = {};
      [...d.querySelectorAll('.field')].forEach((f) => {
        const closed = f.closest('details:not([open])');
        res[f.querySelector('dt').textContent.trim()] = closed ? 'folded' : 'open';
      });
      return { fieldState: res, scrollable: d.scrollHeight, clientH: d.clientHeight };
    });

    out[variant + '-' + c.k] = { findIndex, axHits, axNodeCount, reach };
    console.log(`\n=== ${variant} ${c.k} ===`);
    console.log('  text index hits (1 = searchable):', JSON.stringify(findIndex));
    console.log('  in accessibility tree:', JSON.stringify(axHits), '| ax nodes:', axNodeCount);
    console.log('  field state:', JSON.stringify(reach.fieldState));
    await page.close();
  }
}

writeFileSync(join(LAB, 'reachability.json'), JSON.stringify(out, null, 2));
await browser.close();
await srv.close();
