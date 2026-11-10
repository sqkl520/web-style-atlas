// Enumerate every element the runtime gate (probe.mjs:332-341 + 351-357) counts as a hairline or
// outlined box, for the three templates. Fixed loop (no early return).
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const PAGE = () => {
  const rgba = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return { a: 0 }; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { a: p.length > 3 ? p[3] : 1 }; };
  const formish = (el) => el.matches('input, textarea, select, table, thead, tbody, tr, td, th, hr') || !!el.closest('table, [data-ui]');
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const all = [...document.body.querySelectorAll('*')];
  const hair = [], box = [];
  for (const el of all) {
    const tag = el.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(tag)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (r.width * r.height < 60 * 30) continue;
    const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const thin = (w, c, st) => w > 0 && w <= 1.5 && st !== 'none' && rgba(c).a > 0.02;
    const tL = thin(bt, cs.borderTopColor, cs.borderTopStyle), bL = thin(bb, cs.borderBottomColor, cs.borderBottomStyle);
    const lL = thin(bl, cs.borderLeftColor, cs.borderLeftStyle), rL = thin(br, cs.borderRightColor, cs.borderRightStyle);
    if (formish(el)) continue;
    const rec = { el: label(el), w: Math.round(r.width), h: Math.round(r.height), style: [cs.borderTopStyle, cs.borderBottomStyle].join('/'), inNav: !!el.closest('nav, header'), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44) };
    if (tL && bL && lL && rL) { if (r.width >= 150 && r.height >= 80) box.push(rec); }
    else if ((r.width >= 240 && (tL || bL)) || (r.height >= 240 && (lL || rL))) hair.push({ ...rec, which: [tL ? 'top' : '', bL ? 'bottom' : '', lL ? 'left' : '', rL ? 'right' : ''].filter(Boolean).join('+') });
  }
  return { hair, box };
};

const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  for (const [id, p] of [['M01', 'templates/M01-clean-corporate/index.html'], ['M02', 'templates/M02-warm-local/index.html'], ['M03', 'templates/M03-bold-creator/index.html']]) {
    const t = await b.newPage({ width: 1440, height: 900, dsf: 1 });
    await t.goto('http://127.0.0.1:8100/' + p, { settleMs: 1800 });
    res[id] = await t.eval(PAGE);
    await t.close();
  }
} finally {
  writeFileSync('deliverables/68-audit/probe-hairlines.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
for (const k of Object.keys(res)) {
  console.log(`\n===== ${k}  hairlines=${res[k].hair.length}  outlinedBoxes=${res[k].box.length}`);
  for (const h of res[k].hair) console.log(`  HAIR ${h.el} [${h.which}] ${h.w}x${h.h} style=${h.style} nav=${h.inNav} | ${h.text}`);
  for (const x of res[k].box) console.log(`  BOX  ${x.el} ${x.w}x${x.h} | ${x.text}`);
}
