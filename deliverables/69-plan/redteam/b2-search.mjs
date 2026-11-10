// B2/B3/B6: what does a user actually see when searching a zero-hit word?
// Runs the app's OWN match() over all 29 unsupported + all 44 scene terms, and captures
// the rendered empty-state + template-layer text at 390 and 1440.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';

const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.goto(BASE, { settleMs: 2000 });

// ---- 1. sweep every term through the real search box, record row count + empty-state text
const sweep = await page.eval(() => {
  const q = document.getElementById('q');
  const rowsEl = document.getElementById('ledger');
  const empty = document.getElementById('empty');
  const emptyTpl = document.getElementById('empty-tpl');
  const tplStrip = document.getElementById('tpl-strip');
  const countEl = document.getElementById('count');
  const P = window.STYLE_PROMPTS;
  const terms = Object.keys(P.sceneIndex).concat(P.unsupported);
  const res = [];
  for (const t of terms) {
    q.value = t;
    q.dispatchEvent(new Event('input', { bubbles: true }));
    const n = rowsEl.querySelectorAll('.row').length;
    res.push({
      term: t,
      isUnsupported: (P.unsupported || []).includes(t),
      direct: (P.sceneIndex[t] && P.sceneIndex[t].direct || []).length,
      near: (P.sceneIndex[t] && P.sceneIndex[t].near || []).length,
      rows: n,
      countText: (countEl.textContent || '').trim(),
      emptyShown: !empty.hidden,
      emptyTplShown: emptyTpl ? !emptyTpl.hidden : null,
      tplStripShown: tplStrip ? !tplStrip.hidden : null,
      emptyText: empty.hidden ? '' : (empty.textContent || '').replace(/\s+/g, ' ').trim(),
      emptyTplText: emptyTpl && !emptyTpl.hidden ? (emptyTpl.textContent || '').replace(/\s+/g, ' ').trim() : '',
    });
  }
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  return res;
});
writeFileSync(OUT + 'b2-sweep.json', JSON.stringify(sweep, null, 1));

const zero = sweep.filter((r) => r.rows === 0);
console.log('terms swept', sweep.length);
console.log('zero-row terms', zero.length, '=', zero.map((r) => r.term).join(' '));
console.log('unsupported with rows>0:', sweep.filter((r) => r.isUnsupported && r.rows > 0).map((r) => r.term + ':' + r.rows).join(' '));
console.log('sceneIndex-direct with rows=0:', sweep.filter((r) => !r.isUnsupported && r.direct > 0 && r.rows === 0).map((r) => r.term).join(' '));
console.log('sceneIndex-near with rows=0:', sweep.filter((r) => !r.isUnsupported && r.direct === 0 && r.rows === 0).map((r) => r.term).join(' '));
const sample = sweep.find((r) => r.term === '餐厅');
console.log('\n--- 餐厅 sample ---');
console.log(JSON.stringify(sample, null, 1));

await page.close();

// ---- 2. screenshot the 餐厅 empty state at both viewports
for (const vp of [{ w: 390, h: 844 }, { w: 1440, h: 900 }]) {
  const p2 = await b.newPage({ width: vp.w, height: vp.h, mobile: vp.w < 500 });
  await p2.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 500 });
  await p2.goto(BASE, { settleMs: 1800 });
  await p2.eval(() => {
    const q = document.getElementById('q');
    q.value = '餐厅';
    q.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 500));
  const shot = await p2.eval(() => {
    const empty = document.getElementById('empty');
    const tpl = document.getElementById('empty-tpl');
    const strip = document.getElementById('tpl-strip');
    const rect = (el) => { if (!el || el.hidden) return null; const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
    return {
      vh: window.innerHeight, docH: document.documentElement.scrollHeight,
      empty: rect(empty), emptyTpl: rect(tpl), tplStrip: rect(strip),
      tplLinks: tpl ? [...tpl.querySelectorAll('a')].map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')) : [],
      stripLinks: strip ? [...strip.querySelectorAll('a')].map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')) : [],
      emptyHTML: empty && !empty.hidden ? empty.outerHTML.slice(0, 3000) : '',
    };
  });
  await p2.screenshot({ path: OUT + `shots/b-restaurant-${vp.w}.jpg`, format: 'jpeg', quality: 76 });
  await p2.screenshot({ path: OUT + `shots/b-restaurant-${vp.w}-full.jpg`, format: 'jpeg', quality: 60, fullPage: true });
  console.log('\n=== 餐厅 @' + vp.w + ' ===');
  console.log(JSON.stringify(shot, null, 1));
  writeFileSync(OUT + `b2-restaurant-${vp.w}.json`, JSON.stringify(shot, null, 1));
  await p2.close();
}

await b.close();
