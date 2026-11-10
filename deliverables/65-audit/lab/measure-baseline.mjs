// Baseline measurement of the selection bench detail panel (read-only; no repo file is touched).
// Everything printed here comes from a real Chromium via CDP.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './serve.mjs';

const OUT = resolve('deliverables/65-audit');
const LAB = join(OUT, 'lab');
const SHOTS = join(OUT, 'shots');
mkdirSync(LAB, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

// ── in-page probe ────────────────────────────────────────────────────────────
// Measures the detail panel as the user sees it: field tops/heights in the panel's
// own scroll coordinate space, plus how much of each field is inside the first screen.
function probePanel(arg) {
  const detail = document.getElementById('detail');
  const head = document.querySelector('.detail-head');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const headH = head ? head.getBoundingClientRect().height : 0;
  const clientH = detail.clientHeight;
  const clientW = detail.clientWidth;
  const contentH = detail.scrollHeight;

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), bottom: +(r.bottom - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
  };

  // char-exact count of glyphs inside a horizontal band of the panel
  function charsIn(el, bandTop, bandBottom) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let total = 0, inBand = 0;
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue || '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (!/\S/.test(ch)) continue;
        total++;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.height === 0 && r.width === 0) continue;
        const top = r.top - dRect.top, bottom = r.bottom - dRect.top;
        if (bottom > bandTop && top < bandBottom) inBand++;
      }
    }
    return { total, inBand };
  }

  const bands = {
    firstScreen: [0, clientH],                 // panel viewport at scrollTop = 0
    belowStickyHead: [headH, clientH],         // what is not covered by the sticky header
  };

  const fields = [...document.querySelectorAll('#d-body .field')].map((el, i) => {
    const b = box(el);
    const dt = el.querySelector('dt'), dd = el.querySelector('dd');
    const cs = dd ? getComputedStyle(dd) : null;
    const lh = cs ? parseFloat(cs.lineHeight) || 0 : 0;
    const chars = charsIn(dd || el, 0, 1e9).total;
    const over = Math.max(0, Math.min(b.bottom, clientH) - Math.max(b.top, headH));
    return {
      i, label: dt ? dt.textContent.trim() : '',
      top: b.top, bottom: b.bottom, height: b.h,
      ddHeight: dd ? +dd.getBoundingClientRect().height.toFixed(1) : 0,
      lineHeight: +lh.toFixed(1),
      lines: lh ? Math.round(dd.getBoundingClientRect().height / lh) : null,
      chars,
      charsInFirstScreen: charsIn(dd || el, headH, clientH).inBand,
      visibleInFirstScreen: +over.toFixed(1),
      visibility: b.top >= headH && b.bottom <= clientH ? 'full'
        : (b.bottom > headH && b.top < clientH ? 'partial' : 'none'),
    };
  });

  const blocks = [...document.querySelectorAll('#d-body > *')].map((el) => {
    const b = box(el);
    return { cls: el.className || el.tagName.toLowerCase(), tag: el.tagName.toLowerCase(), top: b.top, bottom: b.bottom, h: b.h };
  });

  // ── existing collapse / jump affordances inside the detail panel ──
  const q = (s) => [...detail.querySelectorAll(s)];
  const affordances = {
    details: q('details').length,
    summary: q('summary').length,
    ariaExpanded: q('[aria-expanded]').length,
    ariaControls: q('[aria-controls]').length,
    roleTab: q('[role="tab"]').length,
    roleTablist: q('[role="tablist"]').length,
    inPageAnchorLinks: q('a[href^="#"]').length,
    navElements: q('nav').length,
    headingInBody: q('h3,h4,h5,h6').length,
    elementsWithId: q('[id]').map((e) => '#' + e.id),
    buttons: q('button').map((b) => (b.textContent || '').trim().slice(0, 24)),
    stickyChildren: [...detail.children].map((c) => ({
      cls: c.className, position: getComputedStyle(c).position,
      stickyTop: getComputedStyle(c).top,
    })),
    // Does anything inside the panel scroll something into view? (only viewer stage resets)
    scrollContainers: q('*').filter((e) => {
      const s = getComputedStyle(e);
      return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2;
    }).map((e) => (e.id ? '#' + e.id : '.' + String(e.className).split(' ')[0])),
  };

  // ── scrolling cost ──
  const last = fields[fields.length - 1];
  const step = clientH - headH;                        // a screenful that keeps continuity under the sticky head
  const maxScroll = contentH - clientH;

  return {
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    panel: {
      rect: { x: +dRect.x.toFixed(1), w: +dRect.width.toFixed(1), h: +dRect.height.toFixed(1) },
      clientW, clientH, contentH, headH: +headH.toFixed(1),
      cssOverflowY: getComputedStyle(detail).overflowY,
      horizontalOverflow: detail.scrollWidth - detail.clientWidth,
      docHorizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    },
    bands,
    blocks,
    fields,
    affordances,
    scroll: {
      maxScroll,
      screens: +(contentH / clientH).toFixed(2),
      screenStepsToLastField: Math.max(0, Math.ceil((last.bottom - clientH) / step)),
      wheelNotches100: Math.ceil(maxScroll / 100),
      lastFieldBottom: last.bottom,
    },
    totals: {
      fieldChars: fields.reduce((a, f) => a + f.chars, 0),
      charsInFirstScreen: fields.reduce((a, f) => a + f.charsInFirstScreen, 0),
      fieldHeight: fields.reduce((a, f) => a + f.height, 0),
    },
  };
}

// Which schemes have the longest field text (so the audit uses a worst case, not a lucky one).
function rankByLength() {
  return (window.SCHEMES || []).map((r) => {
    const keys = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk'];
    const n = keys.reduce((a, k) => a + String(r[k] || '').length, 0);
    return { id: r.id, cn: r.cn, chars: n, landing: String(r.landing || '').length, layout: String(r.layout || '').length, visuals: String(r.visuals || '').length };
  }).sort((a, b) => b.chars - a.chars);
}

// ── run ──────────────────────────────────────────────────────────────────────
const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), url: srv.origin, viewports: [], ranking: null, notes: [] };

const CASES = [
  { label: 'desktop', w: 1440, h: 900, mobile: false, schemes: ['S15', 'S08'] },
  { label: 'mobile', w: 390, h: 844, mobile: true, schemes: ['S15'] },
];

try {
  for (const c of CASES) {
    for (const id of c.schemes) {
      const page = await browser.newPage({ width: c.w, height: c.h, dsf: 1, mobile: c.mobile });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 900 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      await sleep(500);
      if (c.label === 'desktop' && !out.ranking) {
        out.ranking = await page.eval(rankByLength);
      }
      // open the detail the way a user does: click the row
      const opened = await page.eval((sid) => {
        const row = document.querySelector('.row[data-id="' + sid + '"]');
        if (!row) return false;
        row.click();
        return !document.getElementById('detail').hidden;
      }, id);
      await sleep(700);
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      const m = await page.eval(probePanel);
      m.label = c.label; m.id = id; m.opened = opened;
      m.hash = await page.eval('location.hash');

      // screenshots: first screen, then one per screenful of the panel
      const shots = [];
      const dRect = m.panel.rect;
      const clip = c.label === 'desktop'
        ? { x: Math.round(innerWidthOf(c) - dRect.w), y: 0, width: Math.round(dRect.w), height: Math.round(dRect.h), scale: 1 }
        : undefined;
      const stops = [0];
      const stepPx = Math.round(m.panel.clientH - m.panel.headH);
      for (let s = stepPx; s < m.scroll.maxScroll; s += stepPx) stops.push(s);
      stops.push(m.scroll.maxScroll);
      for (let k = 0; k < stops.length; k++) {
        await page.eval((t) => { const d = document.getElementById('detail'); d.scrollTop = t; return d.scrollTop; }, stops[k]);
        await sleep(220);
        const file = join(SHOTS, `${c.label}-${c.w}-${id}-screen-${k}.jpg`);
        await page.screenshot({ path: file, quality: 80, clip });
        shots.push({ file: file.replace(/\\/g, '/').replace(resolve('.') + '/', ''), scrollTop: stops[k] });
      }
      m.shots = shots;
      out.viewports.push(m);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await srv.close();
}

function innerWidthOf() { return 1440; }

writeFileSync(join(LAB, 'baseline.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  ranking: (out.ranking || []).slice(0, 6),
  panels: out.viewports.map((v) => ({
    label: v.label, id: v.id, contentH: v.panel.contentH, clientH: v.panel.clientH,
    screens: v.scroll.screens, headH: v.panel.headH, hOverflow: v.panel.horizontalOverflow,
    fields: v.fields.map((f) => [f.i, f.label, f.top, f.height, f.chars, f.visibility, f.charsInFirstScreen]),
    blocks: v.blocks.map((b) => [b.cls, b.top, b.h]),
    affordances: v.affordances,
    scroll: v.scroll,
  })),
}, null, 2));
