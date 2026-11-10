// Replicates probe.mjs's body-size computation EXACTLY, then lists the elements that
// actually compete for "the size most of the running text is set in".
import { writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const label = process.argv[2] || 'now';
const OUT = 'deliverables/68-exec';
const { server, url } = await serve('D:/Web/style', 8311);

const BODY = () => {
  const round = (n, p = 1) => Math.round(n * 10 ** p) / 10 ** p;
  const firstFam = (ff) => ff.split(',')[0].replace(/["']/g, '').trim();
  // ---- verbatim from probe.mjs:47-88
  const srHidden = (el) => {
    for (let p = el, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) {
      const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(cs.clipPath) || (r.width <= 2 && r.height <= 2 && cs.overflow !== 'visible')) return true;
    }
    return false;
  };
  const all = [...document.body.querySelectorAll('*')].slice(0, 9000);
  const texts = [];
  for (const el of all) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
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
    texts.push({
      el, tag, text: direct, chars: direct.length, fam: firstFam(cs.fontFamily),
      size: round(size, 1), inCode: !!el.closest('pre, code, kbd, samp, textarea'), inUI: !!el.closest('[data-ui]'),
    });
  }
  // ---- verbatim from probe.mjs:225-230
  const bodyTexts = texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.inCode && !t.inUI);
  const bodyBy = new Map();
  for (const t of bodyTexts) { const k = t.fam + '|' + Math.round(t.size); bodyBy.set(k, (bodyBy.get(k) || 0) + t.chars); }
  const bodyTop = [...bodyBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const bodySample = bodyTop ? bodyTexts.find((t) => t.fam + '|' + Math.round(t.size) === bodyTop[0]) : null;
  const longest = bodyTexts.slice().sort((a, b) => b.chars - a.chars)[0];
  const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 52);
  return {
    body: bodySample ? { fam: bodySample.fam, size: bodySample.size, text: bodySample.text.slice(0, 50), el: label(bodySample.el) } : null,
    buckets: [...bodyBy.entries()].sort((a, b) => b[1] - a[1]).map(([k, chars]) => ({ key: k, chars })),
    // every element that qualifies, so the lever is visible
    qualifying: bodyTexts.map((t) => ({ el: label(t.el), size: t.size, chars: t.chars, fam: t.fam })).sort((a, b) => b.chars - a.chars).slice(0, 25),
    qualifiedChars: bodyTexts.reduce((a, t) => a + t.chars, 0),
    excluded: texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars < 60 && !t.inCode && !t.inUI).length,
  };
};

const browser = await Browser.launch();
const out = { label, at: new Date().toISOString() };
for (const [name, w, h] of [['1440', 1440, 900], ['768', 768, 1024], ['390', 390, 844]]) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
  await page.setViewport({ width: w, height: h, mobile: w < 600 });
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(500);
  out[name] = await page.eval(BODY);
  await page.close();
}
await browser.close(); server.close();
writeFileSync(`${OUT}/body-68-${label}.json`, JSON.stringify(out, null, 1));
for (const k of ['1440', '768', '390']) {
  console.log(`\n===== ${k} =====`);
  console.log('BODY:', JSON.stringify(out[k].body));
  console.log('buckets:', out[k].buckets.slice(0, 8).map((b) => `${b.key}=${b.chars}`).join('  '));
  console.log('top qualifying:');
  for (const q of out[k].qualifying.slice(0, 10)) console.log(`   ${String(q.chars).padStart(4)}  ${q.size}px  ${q.el}`);
}
