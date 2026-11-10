// A/B measurement harness for prototypes/_selection.
//   node _measure.mjs <label> [--shot]
// Writes deliverables/68-exec/data-68-<label>.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const label = process.argv[2] || 'now';
const wantShots = process.argv.includes('--shot');
const OUT = 'deliverables/68-exec';
mkdirSync(OUT + '/shots-' + label, { recursive: true });

const { server, url } = await serve('D:/Web/style', 8311);

/* ---- in-page: font-size census + per-selector breakdown of the 13px band ---- */
const CENSUS = () => {
  const vis = (el) => {
    for (let p = el, i = 0; p && p !== document.documentElement && i < 40; p = p.parentElement, i++) {
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      if (p.tagName === 'DETAILS' && !p.open) return false;           // closed fold: not on screen
    }
    return el.getClientRects().length > 0;
  };
  const sel = (el) => {
    const parts = [];
    let p = el;
    for (let i = 0; i < 3 && p && p !== document.body; i++, p = p.parentElement) {
      let s = p.tagName.toLowerCase();
      if (p.id) s += '#' + p.id;
      if (typeof p.className === 'string' && p.className.trim()) s += '.' + p.className.trim().split(/\s+/).slice(0, 2).join('.');
      parts.unshift(s);
    }
    return parts.join('>');
  };
  const bySize = new Map(); const bySel13 = new Map(); const bySelAll = new Map();
  let total = 0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement;
    if (!el) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName)) continue;
    if (el.closest('svg') || el.closest('pre, code, kbd, samp')) continue;
    const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (!vis(el)) continue;
    const size = Math.round(parseFloat(getComputedStyle(el).fontSize));
    // visible characters only: how much of this node actually has layout boxes
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()];
    const shown = rects.length ? t.length : 0;   // clamped text still has rects; approximated by length
    const chars = shown;
    if (!chars) continue;
    total += chars;
    bySize.set(size, (bySize.get(size) || 0) + chars);
    const k = size + 'px  ' + sel(el);
    bySelAll.set(k, (bySelAll.get(k) || 0) + chars);
    if (size === 13) { const k13 = sel13key(el); bySel13.set(k13, (bySel13.get(k13) || 0) + chars); }
  }
  function sel13key(el) {
    // group by the nearest selectors that own font-size
    const chain = [];
    for (let p = el, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) {
      const s = p.tagName.toLowerCase() + (typeof p.className === 'string' && p.className.trim() ? '.' + p.className.trim().split(/\s+/)[0] : '');
      chain.push(s);
    }
    return chain.slice(0, 2).join(' < ');
  }
  return {
    total,
    sizes: [...bySize.entries()].sort((a, b) => b[1] - a[1]).map(([size, chars]) => ({ size, chars, share: +(chars / total).toFixed(4) })),
    sel13: [...bySel13.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24),
    selAll: [...bySelAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
  };
};

/* ---- in-page: layout + the hard baseline numbers ---- */
const LAYOUT = () => {
  const H = innerHeight, W = innerWidth;
  const q = (s) => document.querySelector(s);
  const rows = [...document.querySelectorAll('#ledger .row')];
  const rects = rows.map((r) => { const b = r.getBoundingClientRect(); return { id: (r.querySelector('h3') || {}).textContent?.slice(0, 3) || '', top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  const full = rects.filter((r) => r.top >= -0.5 && r.bottom <= H + 0.5).length;
  const partial = rects.filter((r) => r.top < H && r.bottom > 0).length;
  const h1 = q('h1');
  const rail = q('.rail');
  const doc = document.documentElement;
  // font-size declarations below 13px in computed styles
  let under13 = 0; const under13samples = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const f = parseFloat(cs.fontSize);
    if (f && f < 13) { under13++; if (under13samples.length < 6) under13samples.push(el.tagName.toLowerCase() + '.' + (el.className || '') + ' ' + f); }
  }
  return {
    viewport: { w: W, h: H },
    scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth,
    overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth),
    docH: Math.max(doc.scrollHeight, document.body.scrollHeight),
    h1: h1 ? { size: +parseFloat(getComputedStyle(h1).fontSize).toFixed(1), lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) } : null,
    railH: rail ? +rail.getBoundingClientRect().height.toFixed(1) : null,
    mastH: q('.mast') ? +q('.mast').getBoundingClientRect().height.toFixed(1) : null,
    rowCount: rows.length,
    firstTop: rects[0]?.top ?? null, firstH: rects[0]?.h ?? null,
    firstId: rects[0]?.id ?? null,
    full, partial,
    under13: under13, under13samples,
    rowHeights: rects.slice(0, 6).map((r) => r.h),
  };
};

const browser = await Browser.launch();
const result = { label, at: new Date().toISOString(), runs: {} };

async function openPage(w, h) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
  await page.setViewport({ width: w, height: h, mobile: w < 600 });     // ⚠️ launch() does not move the viewport
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(600);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(250);
  return page;
}

// ── 1440 ──────────────────────────────────────────────────────────────
{
  const page = await openPage(1440, 900);
  result.runs.desktop = { layout: await page.eval(LAYOUT), census: await page.eval(CENSUS) };
  if (wantShots) await page.screenshot({ path: `${OUT}/shots-${label}/1440-fold.jpg`, quality: 80 });
  await page.close();
}

// ── 768 ───────────────────────────────────────────────────────────────
{
  const page = await openPage(768, 1024);
  result.runs.tablet = { layout: await page.eval(LAYOUT), census: await page.eval(CENSUS) };
  // which elements still draw 1px rules (probe.mjs 'hairline' logic, replicated)
  result.runs.tablet.rules = await page.eval(() => {
    const out = [];
    const formish = (el) => el.matches('input, textarea, select, table, thead, tbody, tr, td, th, hr') || !!el.closest('table, [data-ui]');
    const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 60);
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
      const thin = (w2, style) => w2 > 0 && w2 <= 1.5 && style !== 'none';
      const topLine = thin(bt, cs.borderTopStyle), botLine = thin(bb, cs.borderBottomStyle);
      const leftLine = thin(bl, cs.borderLeftStyle), rightLine = thin(br, cs.borderRightStyle);
      const area = r.width * r.height;
      if (area < 60 * 30) continue;                                  // probe only inspects 'big'
      if (!formish(el) && ((r.width >= 240 && (topLine || botLine)) || (r.height >= 240 && (leftLine || rightLine)))) {
        out.push({ el: label(el), w: Math.round(r.width), top: cs.borderTopWidth, bottom: cs.borderBottomWidth, left: cs.borderLeftWidth, right: cs.borderRightWidth });
      }
    }
    return out;
  });
  if (wantShots) await page.screenshot({ path: `${OUT}/shots-${label}/768-fold.jpg`, quality: 80 });
  await page.close();
}

// ── 390, all five sort orders + detail panel ──────────────────────────
{
  const page = await openPage(390, 844);
  const sorts = {};
  for (const s of ['n', 'fr', 'thr', 'gate', 'built']) {
    sorts[s] = await page.eval((val) => {
      const sel = document.querySelector('#sort');
      sel.value = val; sel.dispatchEvent(new Event('change', { bubbles: true }));
      const rows = [...document.querySelectorAll('#ledger .row')];
      const H = innerHeight;
      const rects = rows.map((r) => { const b = r.getBoundingClientRect(); return { id: (r.querySelector('h3') || {}).textContent?.slice(0, 3) || '', top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
      return {
        sort: val, count: rows.length, firstId: rects[0]?.id, firstTop: rects[0]?.top, firstH: rects[0]?.h,
        full: rects.filter((r) => r.top >= -0.5 && r.bottom <= H + 0.5).length,
        slack: rects[0] ? +(H - rects[0].bottom).toFixed(1) : null,
        overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      };
    }, s);
    await sleep(120);
  }
  result.runs.mobile = { sorts, layout: await page.eval(LAYOUT), census: await page.eval(CENSUS) };
  if (wantShots) await page.screenshot({ path: `${OUT}/shots-${label}/390-fold.jpg`, quality: 80 });

  // detail panel: open the first row, measure scrollHeight across several cases
  const panel = await page.eval(() => {
    const sel = document.querySelector('#sort'); sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = [...document.querySelectorAll('#ledger .row')];
    const out = [];
    for (const idx of [0, 12, 25, 28]) {
      const row = rows[idx]; if (!row) continue;
      row.click();
      const d = document.querySelector('#detail');
      const body = d && d.querySelector('.detail-body');
      out.push({
        idx, open: d && !d.hidden,
        scrollH: d ? Math.round(d.scrollHeight) : null,
        clientH: d ? Math.round(d.clientHeight) : null,
        bodyH: body ? Math.round(body.scrollHeight) : null,
      });
      const close = document.querySelector('#d-close'); if (close) close.click();
    }
    return out;
  });
  result.runs.mobile.panel = panel;
  await sleep(200);
  await page.close();
}

await browser.close();
server.close();

writeFileSync(`${OUT}/data-68-${label}.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
