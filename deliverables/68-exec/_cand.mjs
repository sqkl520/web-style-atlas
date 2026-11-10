// Candidate sweep: inject CSS overrides, measure the real cost of each fix for body-size.
//   node _cand.mjs
import { writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const OUT = 'deliverables/68-exec';
const { server, url } = await serve('D:/Web/style', 8311);

// Each candidate is a CSS string appended as an author-level <style> (last in the cascade).
const CANDIDATES = {
  base: '',

  // A — the one selector that owns 96% of the mass, moved onto the body step.
  A_fam15: '.row-family{font-size:var(--s-15)}',
  A_fam16: '.row-family{font-size:var(--s-16)}',

  // B — 16px but tighter leading so the 2-line clamp costs less
  B_fam16_lh14: '.row-family{font-size:var(--s-16);line-height:1.4}',
  B_fam16_lh135: '.row-family{font-size:var(--s-16);line-height:1.35}',
  B_fam15_lh14: '.row-family{font-size:var(--s-15);line-height:1.4}',

  // C — 16px plus a real measure cap (fixes the 109-char line at the same time)
  C_fam16_60ch: '.row-family{font-size:var(--s-16);line-height:1.45;max-width:60ch}',

  // D — 16px on every device, and give back the mobile pixels elsewhere
  D_fam16: '.row-family{font-size:var(--s-16);line-height:1.45}',
  D_fam16_cap: '.row-family{font-size:var(--s-16);line-height:1.42}',

  // E — 16px + claw back the mobile pixels from leading/padding so the gate slack survives
  E_fam16_claw: '.row-family{font-size:var(--s-16);line-height:1.45}@media(max-width:620px){.row-family{line-height:1.34}.row{padding:5px 0}.row-meta{margin-top:4px}}',
  F_fam15_claw: '.row-family{font-size:var(--s-15);line-height:1.45}@media(max-width:620px){.row-family{line-height:1.36}.row{padding:5px 0}.row-meta{margin-top:4px}}',
  G_fam16_lh14_global: '.row-family{font-size:var(--s-16);line-height:1.4}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}}',
};

const BODY = () => {
  const round = (n, p = 1) => Math.round(n * 10 ** p) / 10 ** p;
  const firstFam = (ff) => ff.split(',')[0].replace(/["']/g, '').trim();
  const srHidden = (el) => {
    for (let p = el, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) {
      const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(cs.clipPath) || (r.width <= 2 && r.height <= 2 && cs.overflow !== 'visible')) return true;
    }
    return false;
  };
  const texts = [];
  for (const el of [...document.body.querySelectorAll('*')].slice(0, 9000)) {
    const tag = el.tagName;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(tag)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    let direct = '';
    for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    direct = direct.replace(/\s+/g, ' ').trim();
    if (!direct) continue;
    if (tag === 'OPTION' || el.closest('svg') || srHidden(el)) continue;
    const size = parseFloat(cs.fontSize);
    if (!size || size < 6) continue;
    texts.push({ el, text: direct, chars: direct.length, fam: firstFam(cs.fontFamily), size: round(size), w: r.width,
      inCode: !!el.closest('pre, code, kbd, samp, textarea'), inUI: !!el.closest('[data-ui]') });
  }
  const bodyTexts = texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.inCode && !t.inUI);
  const by = new Map();
  for (const t of bodyTexts) { const k = t.fam + '|' + Math.round(t.size); by.set(k, (by.get(k) || 0) + t.chars); }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  const sample = top ? bodyTexts.find((t) => t.fam + '|' + Math.round(t.size) === top[0]) : null;
  const longest = bodyTexts.slice().sort((a, b) => b.chars - a.chars)[0];
  // probe.mjs measureChars
  const measureChars = longest ? Math.round(longest.w / (longest.size * 0.5)) : null;
  const under13blocks = texts.filter((t) => t.size < 13 && t.chars >= 12 && !t.inUI && !t.inCode).length;
  return {
    bodySize: sample ? sample.size : null, bodyFam: sample ? sample.fam : null,
    buckets: [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + '=' + v),
    measureChars, under13blocks,
  };
};

const LAYOUT = () => {
  const H = innerHeight;
  const rows = [...document.querySelectorAll('#ledger .row')];
  const rects = rows.map((r) => { const b = r.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  const h1 = document.querySelector('h1');
  return {
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    docH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    firstTop: rects[0]?.top, firstH: rects[0]?.h, full: rects.filter((r) => r.top >= -0.5 && r.bottom <= H + 0.5).length,
    worst: Math.max(...rects.map((r) => r.h)), h1: +parseFloat(getComputedStyle(h1).fontSize).toFixed(1),
    railH: +document.querySelector('.rail').getBoundingClientRect().height.toFixed(1),
    familyH: document.querySelector('.row-family') ? +document.querySelector('.row-family').getBoundingClientRect().height.toFixed(1) : null,
  };
};

const browser = await Browser.launch();
const out = {};

for (const [name, css] of Object.entries(CANDIDATES)) {
  const r = { css };

  // ── 1440
  {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1000 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    if (css) { await page.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css); await sleep(300); }
    r.d1440 = await page.eval(LAYOUT);
    r.b1440 = await page.eval(BODY);
    await page.close();
  }
  // ── 390: all five sorts
  {
    const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
    await page.setViewport({ width: 390, height: 844, mobile: true });
    await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1000 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    if (css) { await page.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css); await sleep(300); }
    r.b390 = await page.eval(BODY);
    r.sorts = await page.eval(() => {
      const o = {}; const sel = document.querySelector('#sort'); const H = innerHeight;
      for (const v of ['n', 'fr', 'thr', 'gate', 'built']) {
        sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
        const rs = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { id: (x.querySelector('h3') || {}).textContent?.slice(0, 2), top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
        o[v] = { firstId: rs[0].id, firstTop: rs[0].top, firstH: rs[0].h, full: rs.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length, slack: +(H - rs[0].bottom).toFixed(1) };
      }
      return o;
    });
    await sleep(150);
    r.panel = await page.eval(() => {
      const sel = document.querySelector('#sort'); sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      const rows = [...document.querySelectorAll('#ledger .row')]; const o = [];
      for (const i of [0, 12, 25, 28]) {
        rows[i].click();
        const d = document.querySelector('#detail');
        o.push({ i, scrollH: Math.round(d.scrollHeight) });
        document.querySelector('#d-close').click();
      }
      return o;
    });
    await page.close();
  }
  // ── 768
  {
    const page = await browser.newPage({ width: 768, height: 1024, dsf: 1 });
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1000 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    if (css) { await page.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css); await sleep(300); }
    r.d768 = await page.eval(LAYOUT);
    r.b768 = await page.eval(BODY);
    await page.close();
  }
  out[name] = r;
  console.log(`${name.padEnd(15)} body1440=${r.b1440.bodySize} body390=${r.b390.bodySize} body768=${r.b768.bodySize} measure=${r.b1440.measureChars} firstH390=${r.d1440 ? '' : ''}gateSlack=${r.sorts.gate.slack} gateFull=${r.sorts.gate.full} d1440.firstH=${r.d1440.firstH} under13=${r.b1440.under13blocks}`);
}

await browser.close(); server.close();
writeFileSync(`${OUT}/cand-68.json`, JSON.stringify(out, null, 1));

console.log('\n--- detail table ---');
for (const [k, v] of Object.entries(out)) {
  console.log(`${k.padEnd(15)} | 1440 top=${v.d1440.firstTop} h=${v.d1440.firstH} full=${v.d1440.full} famH=${v.d1440.familyH} docH=${v.d1440.docH} | 768 top=${v.d768.firstTop} h=${v.d768.firstH} full=${v.d768.full} | 390 gate slack=${v.sorts.gate.slack} worstH=${v.sorts.gate.firstH} | panel=${v.panel.map((p) => p.scrollH).join('/')} | measure=${v.b1440.measureChars} under13=${v.b1440.under13blocks}`);
}
