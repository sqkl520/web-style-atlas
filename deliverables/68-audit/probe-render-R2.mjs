// Render probes for the LINT-TRUTH audit. Screenshots + computed-style evidence.
// Usage: node probe-render.mjs
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'deliverables/68-audit/shots';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8100';
const results = {};
const save = () => writeFileSync('deliverables/68-audit/render-probe.json', JSON.stringify(results, null, 1));

const b = await Browser.launch({ width: 1440, height: 900 });
try {
  // ---------- 1. selection desktop ----------
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 1800 });
  await p.eval(() => document.fonts.ready.then(() => true));
  await sleep(400);
  await p.screenshot({ path: join(OUT, 'sel-1440-top.png'), format: 'png' });

  results.mastKicker = await p.eval(() => {
    const el = document.querySelector('.mast-label');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const h1 = el.parentElement.querySelector('h1') || document.querySelector('h1');
    return {
      text: el.textContent.trim(),
      cssText: cs.cssText ? cs.cssText.slice(0, 200) : null,
      fontSize: cs.fontSize, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing,
      fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.slice(0, 60), color: cs.color,
      lineHeight: cs.lineHeight,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      h1: { text: h1.textContent.trim().slice(0, 40), fontSize: getComputedStyle(h1).fontSize, top: Math.round(h1.getBoundingClientRect().top) },
      gapToH1: Math.round(h1.getBoundingClientRect().top - r.bottom),
    };
  });

  // the row with aria-current + the inset shadow
  results.rowInset = await p.eval(() => {
    const rows = [...document.querySelectorAll('.row')];
    const cur = rows.find((r) => r.getAttribute('aria-current') === 'true') || rows[0];
    const cs = getComputedStyle(cur);
    const r = cur.getBoundingClientRect();
    return {
      totalRows: rows.length,
      ariaCurrentCount: rows.filter((x) => x.getAttribute('aria-current') === 'true').length,
      boxShadow: cs.boxShadow,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      text: cur.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
    };
  });

  // .detail overlay?
  results.detail = await p.eval(() => {
    const d = document.querySelector('.detail');
    if (!d) return null;
    const on = getComputedStyle(d);
    // open it if it is closed
    document.body.classList.add('detail-open');
    return new Promise((res) => setTimeout(() => {
      const cs = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      res({
        classes: d.className,
        positionClosed: on.position, displayClosed: on.display, visibilityClosed: on.visibility,
        positionOpen: cs.position, zIndex: cs.zIndex, displayOpen: cs.display,
        boxShadowOpen: cs.boxShadow, backgroundOpen: cs.backgroundColor,
        rectOpen: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        viewport: { w: innerWidth, h: innerHeight },
        role: d.getAttribute('role'), ariaModal: d.getAttribute('aria-modal'),
      });
    }, 600));
  });
  await sleep(900);
  await p.screenshot({ path: join(OUT, 'sel-1440-detail-open.png'), format: 'png' });
  await p.eval(() => document.body.classList.remove('detail-open'));
  await sleep(300);

  // empty shot gradient
  results.shotEmpty = await p.eval(() => {
    const els = [...document.querySelectorAll('.shot.is-empty')];
    if (!els.length) return { count: 0 };
    const el = els[0];
    const cs = getComputedStyle(el, '::before');
    const r = el.getBoundingClientRect();
    return {
      count: els.length,
      beforeBackground: cs.backgroundImage,
      beforeBgSize: cs.backgroundSize,
      content: cs.content,
      display: cs.display,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      parentText: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
    };
  });

  // all hairlines: find computed 1px borders and describe targets
  results.hairlines = await p.eval(() => {
    const out = [];
    const all = document.querySelectorAll('*');
    const want = ['.tpl-card', '.viewer-tabs button:last-child', '.field', '.field-fold', '.parts li', '.mast-fold'];
    for (const sel of want) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ sel, missing: true }); continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      out.push({
        sel, tag,
        borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
        borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor,
        borderRight: cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor,
        rect: { w: Math.round(r.width), h: Math.round(r.height) },
        role: el.getAttribute('role'), parent: el.parentElement?.className || el.parentElement?.tagName,
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
        siblings: el.parentElement ? el.parentElement.children.length : 0,
        parentTag: el.parentElement?.tagName.toLowerCase(),
      });
    }
    return out;
  });

  // emoji in rendered text?
  results.emojiRendered = await p.eval(() => {
    const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const m = n.textContent.match(re);
      if (m) hits.push({ chars: [...new Set(m)], text: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), parent: n.parentElement?.className || n.parentElement?.tagName });
    }
    return { hits, count: hits.length };
  });

  // numbering in rendered text?
  results.numberedRendered = await p.eval(() => {
    const re = /^[(\[\/#]?\s?0\d{1,2}\s?[)\]\/.:—–-]?$/;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length) continue;
      const t = el.textContent.trim();
      if (re.test(t)) out.push({ text: t, tag: el.tagName.toLowerCase(), cls: el.className, parent: el.parentElement?.className });
    }
    return out;
  });

  // h-screen / 100vh usage
  results.railH = await p.eval(() => {
    const rail = document.querySelector('.rail');
    if (!rail) return null;
    const cs = getComputedStyle(rail);
    return { position: cs.position, maxHeight: cs.maxHeight, overflowY: cs.overflowY, height: Math.round(rail.getBoundingClientRect().height), innerHeight, scrollH: rail.scrollHeight };
  });

  // "01" context at app.js:467 — what is the actual ID text?
  results.idText = await p.eval(() => {
    const rows = [...document.querySelectorAll('.row')].slice(0, 3).map((r) => r.textContent.trim().replace(/\s+/g, ' ').slice(0, 60));
    return { rows };
  });

  await p.close();

  // ---------- 2. selection mobile 390 (setViewport, NOT launch size) ----------
  const m = await b.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await m.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 1800 });
  await m.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await m.eval(() => document.fonts.ready.then(() => true));
  await sleep(500);
  await m.screenshot({ path: join(OUT, 'sel-390-top.png'), format: 'png' });
  results.mobile = await m.eval(() => ({
    innerWidth, innerHeight,
    mastKicker: (() => { const e = document.querySelector('.mast-label'); const c = getComputedStyle(e); return { fontSize: c.fontSize, textTransform: c.textTransform, letterSpacing: c.letterSpacing, color: c.color }; })(),
    h1: (() => { const e = document.querySelector('h1'); const c = getComputedStyle(e); return { fontSize: c.fontSize, lines: Math.round(e.getBoundingClientRect().height / parseFloat(c.lineHeight)) }; })(),
    rail: (() => { const r = document.querySelector('.rail'); if (!r) return null; const c = getComputedStyle(r); return { position: c.position, maxHeight: c.maxHeight, h: Math.round(r.getBoundingClientRect().height) }; })(),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  await m.close();

  // ---------- 3. wizard ----------
  const w = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await w.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 1800 });
  await w.eval(() => document.fonts.ready.then(() => true));
  await sleep(400);
  await w.screenshot({ path: join(OUT, 'wizard-1440-top.png'), format: 'png' });
  results.wizard = await w.eval(() => {
    const el = document.querySelector('.mast-label');
    const cs = el ? getComputedStyle(el) : null;
    const nav = document.querySelector('.wz-nav, .wizard-nav, footer, .wz-foot');
    const ncs = nav ? getComputedStyle(nav) : null;
    return {
      kicker: el ? { text: el.textContent.trim(), fontSize: cs.fontSize, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, color: cs.color, fontWeight: cs.fontWeight } : null,
      h1: (() => { const h = document.querySelector('h1'); const c = getComputedStyle(h); return { text: h.textContent.trim().slice(0, 40), fontSize: c.fontSize }; })(),
      navBorderTop: nav ? { sel: nav.className || nav.tagName, bt: ncs.borderTopWidth + ' ' + ncs.borderTopStyle + ' ' + ncs.borderTopColor } : null,
    };
  });
  await w.close();

  // ---------- 4. templates ----------
  for (const [id, path] of [['M01', 'templates/M01-clean-corporate/index.html'], ['M02', 'templates/M02-warm-local/index.html'], ['M03', 'templates/M03-bold-creator/index.html']]) {
    const t = await b.newPage({ width: 1440, height: 900, dsf: 1 });
    await t.goto(`${BASE}/${path}`, { settleMs: 2000 });
    await t.eval(() => document.fonts.ready.then(() => true));
    await sleep(500);
    await t.screenshot({ path: join(OUT, `${id}-1440-top.png`), format: 'png' });
    results[id] = await t.eval(() => {
      const out = { eyebrows: [], notes: [] };
      for (const el of document.querySelectorAll('.eyebrow')) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const next = el.nextElementSibling;
        out.eyebrows.push({
          text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
          fontSize: cs.fontSize, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing,
          fontWeight: cs.fontWeight, color: cs.color, marginBottom: cs.marginBottom,
          rect: { y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          nextTag: next?.tagName.toLowerCase(), nextText: next?.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
          gapToNext: next ? Math.round(next.getBoundingClientRect().top - r.bottom) : null,
          inHeaderNav: !!el.closest('header,nav'),
        });
      }
      for (const el of document.querySelectorAll('*')) {
        if (el.children.length) continue;
        const tx = el.textContent.trim();
        if (/^0[1-9]$/.test(tx)) {
          const cs = getComputedStyle(el);
          out.notes.push({ text: tx, tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), fontSize: cs.fontSize, family: cs.fontFamily.slice(0, 30), parentCls: String(el.parentElement?.className).slice(0, 40), parentText: el.parentElement?.textContent.trim().replace(/\s+/g, ' ').slice(0, 50) });
        }
      }
      return out;
    });
    await t.close();
  }

  // ---------- 5. M01 eyebrow section screenshots (clip) ----------
  const t2 = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await t2.goto(`${BASE}/templates/M01-clean-corporate/index.html`, { settleMs: 2000 });
  await t2.eval(() => document.fonts.ready.then(() => true));
  const y1 = await t2.eval(() => {
    const els = [...document.querySelectorAll('.eyebrow')];
    const r = els[0].getBoundingClientRect();
    return Math.max(0, Math.round(r.top + scrollY - 40));
  });
  await t2.eval((y) => scrollTo(0, y), y1);
  await sleep(400);
  await t2.screenshot({ path: join(OUT, 'M01-eyebrow-closeup.png'), format: 'png' });
  await t2.close();

  // ---------- 6. S16 kicker for precedent ----------
  const s16 = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await s16.goto(`${BASE}/prototypes/S16-velocity-slant-manifesto/index.html`, { settleMs: 2000 });
  await sleep(500);
  await s16.screenshot({ path: join(OUT, 'S16-kicker-1440.png'), format: 'png' });
  results.S16 = await s16.eval(() => {
    const el = document.querySelector('.kicker');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { text: el.textContent.trim().slice(0, 60), fontSize: cs.fontSize, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, cls: el.className };
  });
  await s16.close();
} finally {
  save();
  await b.close();
}
console.log('done');
