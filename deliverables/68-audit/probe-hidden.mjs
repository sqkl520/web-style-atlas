// Why does the runtime gate see 0 hairlines at 1440 while the static lint sees 9?
// Replicates probe.mjs hairline/outlined/shadow logic (lines 332-341, 317-319) in BOTH states:
//   (a) default (detail panel hidden)  (b) after opening a row (detail panel visible)
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'deliverables/68-audit/shots';
mkdirSync(OUT, { recursive: true });

const MEASURE = () => {
  const rgba = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return { a: 0 };
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { a: p.length > 3 ? p[3] : 1 };
  };
  const formish = (el) => el.matches('input, textarea, select, table, thead, tbody, tr, td, th, hr') || !!el.closest('table, [data-ui]');
  const isOverlay = (el) => { for (let p = el, i = 0; p && i < 4; p = p.parentElement, i++) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return true; if (p.matches('dialog, [role="dialog"], [role="menu"], [role="tooltip"], [popover]')) return true; } return false; };
  const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 60);
  const all = [...document.body.querySelectorAll('*')];
  const big = [];
  for (const el of all) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (r.width * r.height >= 60 * 30) big.push({ el, r, cs });
  }
  let hairlines = 0, outlinedBoxes = 0, shadowStatic = 0;
  const hairSamples = [], outSamples = [], shadowSamples = [];
  for (const b of big) {
    const { cs, r, el } = b;
    const sh = cs.boxShadow;
    if (sh !== 'none' && !/^rgba?\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(sh)) {
      const outer = sh.split(/,(?![^(]*\))/).some((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p));
      if (outer && !(isOverlay(el) || el.closest('[data-ui]'))) { shadowStatic++; if (shadowSamples.length < 6) shadowSamples.push(label(el) + ' → ' + sh.slice(0, 60)); }
      if (outer && (isOverlay(el) || el.closest('[data-ui]'))) { if (shadowSamples.length < 12) shadowSamples.push('[OVERLAY] ' + label(el) + ' → ' + sh.slice(0, 60)); }
    }
    const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const thin = (w, c, style) => w > 0 && w <= 1.5 && style !== 'none' && rgba(c).a > 0.02;
    const tL = thin(bt, cs.borderTopColor, cs.borderTopStyle), bL = thin(bb, cs.borderBottomColor, cs.borderBottomStyle);
    const lL = thin(bl, cs.borderLeftColor, cs.borderLeftStyle), rL = thin(br, cs.borderRightColor, cs.borderRightStyle);
    if (!formish(el)) {
      if (tL && bL && lL && rL) { if (r.width >= 150 && r.height >= 80) { outlinedBoxes++; if (outSamples.length < 8) outSamples.push(label(el)); } }
      else if ((r.width >= 240 && (tL || bL)) || (r.height >= 240 && (lL || rL))) { hairlines++; if (hairSamples.length < 8) hairSamples.push(label(el) + ' ' + Math.round(r.width) + 'px'); }
    }
  }
  // 1px-tall elements
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const horiz = r.height > 0 && r.height <= 1.5 && r.width >= 160, vert = r.width > 0 && r.width <= 1.5 && r.height >= 160;
    if (!horiz && !vert) continue;
    if (formish(el) && (el.tagName !== 'HR' || el.closest('[data-ui]'))) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.03) continue;
    if (rgba(cs.backgroundColor).a > 0.02 || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.backgroundImage !== 'none') { hairlines++; if (hairSamples.length < 10) hairSamples.push(label(el) + ' ' + Math.round(Math.max(r.width, r.height)) + 'px RULE-ELEMENT'); }
  }
  return {
    bigCount: big.length, hairlines, outlinedBoxes, shadowStatic,
    hairSamples, outSamples, shadowSamples,
    detailHidden: document.querySelector('.detail')?.hasAttribute('hidden') ?? null,
  };
};

const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  for (const [tag, w, h, mob] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
    const p = await b.newPage({ width: w, height: h, dsf: 1, mobile: mob });
    await p.goto('http://127.0.0.1:8100/prototypes/_selection/index.html', { settleMs: 1800 });
    res[tag + '_closed'] = await p.eval(MEASURE);
    // open the first row
    await p.eval(() => document.querySelector('.row').click());
    await sleep(1100);
    res[tag + '_open'] = await p.eval(MEASURE);
    if (tag === '1440') await p.screenshot({ path: join(OUT, 'sel-1440-detail-measured.png'), format: 'png' });
    await p.close();
  }
} finally {
  writeFileSync('deliverables/68-audit/probe-hidden.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(res, null, 1));
