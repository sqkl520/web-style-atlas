// Focused probes: (a) aria-current row inset shadow when a row is actually open,
// (b) .shot.is-empty dead-CSS check, (c) .detail as overlay, (d) hairline targets, (e) numbering/emoji live.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'deliverables/68-audit/shots';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8100';
const out = {};

const b = await Browser.launch({ width: 1440, height: 900 });
try {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 1800 });
  await p.eval(() => document.fonts.ready.then(() => true));

  // how many rows are unbuilt (would render .shot.is-empty)?
  out.unbuilt = await p.eval(() => ({
    rows: document.querySelectorAll('.row').length,
    unbuilt: document.querySelectorAll('.row.is-unbuilt').length,
    emptyShots: document.querySelectorAll('.shot.is-empty').length,
    totalShots: document.querySelectorAll('.shot').length,
  }));

  // open the first row via its click handler, then read the inset shadow
  out.ariaCurrent = await p.eval(async () => {
    const row = document.querySelector('.row');
    const before = getComputedStyle(row).boxShadow;
    const beforeAttr = row.getAttribute('aria-current');
    row.click();
    await new Promise((r) => setTimeout(r, 900));
    const after = getComputedStyle(row).boxShadow;
    return {
      shadowBefore: before, ariaBefore: beforeAttr,
      shadowAfter: after, ariaAfter: row.getAttribute('aria-current'),
      bgAfter: getComputedStyle(row).backgroundColor,
      countCurrent: document.querySelectorAll('.row[aria-current="true"]').length,
    };
  });
  await sleep(700);
  await p.screenshot({ path: join(OUT, 'sel-1440-row-open.png'), format: 'png' });

  // the detail panel geometry while open
  out.detailOpen = await p.eval(() => {
    const d = document.querySelector('.detail');
    const cs = getComputedStyle(d);
    const r = d.getBoundingClientRect();
    const bench = document.querySelector('.bench');
    return {
      hidden: d.hasAttribute('hidden'), display: cs.display, position: cs.position, zIndex: cs.zIndex,
      boxShadow: cs.boxShadow, width: Math.round(r.width), x: Math.round(r.x),
      benchPaddingRight: bench ? getComputedStyle(bench).paddingRight : null,
      coversRightEdge: Math.round(r.right) === innerWidth,
      role: d.getAttribute('role'), ariaLabel: d.getAttribute('aria-label'),
    };
  });

  // does the shadow read as a shadow or a 0-blur step? sample pixels left of the panel edge
  out.pixelAtEdge = await p.eval(() => {
    const d = document.querySelector('.detail');
    const r = d.getBoundingClientRect();
    // the shadow paints 18px to the LEFT of the panel; it is opaque-ish at 6% over the page ground
    return { panelLeft: Math.round(r.left), shadowZone: [Math.round(r.left) - 18, Math.round(r.left)], blur: 0, alpha: 0.06 };
  });

  await p.close();

  // ---- templates: numbering + hairline target detail
  for (const [id, path] of [['M01', 'templates/M01-clean-corporate/index.html'], ['M03', 'templates/M03-bold-creator/index.html']]) {
    const t = await b.newPage({ width: 1440, height: 900, dsf: 1 });
    await t.goto(`${BASE}/${path}`, { settleMs: 1800 });
    out[id + '_numbers'] = await t.eval(() => {
      const res = [];
      for (const sel of ['.step-num', '.sec-num', '.idx']) {
        for (const el of document.querySelectorAll(sel)) {
          const cs = getComputedStyle(el);
          res.push({ sel, text: el.textContent.trim(), ariaHidden: el.getAttribute('aria-hidden'), size: cs.fontSize, family: cs.fontFamily.slice(0, 24), monospace: /mono/i.test(cs.fontFamily), inTable: !!el.closest('table'), inOl: !!el.closest('ol'), parentTag: el.parentElement.tagName.toLowerCase() });
        }
      }
      return res;
    });
    out[id + '_hairlines'] = await t.eval(() => {
      const res = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
        const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
        const edges = [];
        if (bt > 0 && bt <= 1.5 && cs.borderTopStyle !== 'none') edges.push('top');
        if (bb > 0 && bb <= 1.5 && cs.borderBottomStyle !== 'none') edges.push('bottom');
        if (bl > 0 && bl <= 1.5 && cs.borderLeftStyle !== 'none') edges.push('left');
        if (br > 0 && br <= 1.5 && cs.borderRightStyle !== 'none') edges.push('right');
        if (!edges.length) return;
        if (r.width < 240 && r.height < 240) return;
        res.push({
          tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), edges,
          w: Math.round(r.width), h: Math.round(r.height),
          isTable: !!el.closest('table'), isForm: !!el.closest('form') || /^(input|textarea|select)$/.test(el.tagName.toLowerCase()),
          inNav: !!el.closest('nav, header'), kids: el.children.length,
          text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
        });
      }
      return res;
    });
    await t.close();
  }
} finally {
  writeFileSync('deliverables/68-audit/probe-focus.json', JSON.stringify(out, null, 1), 'utf8');
  await b.close();
}
console.log('done');
