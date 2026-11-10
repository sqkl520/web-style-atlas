// For each of the 9 static hairlines at the reported line, find the matching DOM element and report
// whether it lives inside the (hidden) .detail panel, and its runtime visibility.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('http://127.0.0.1:8100/prototypes/_selection/index.html', { settleMs: 1800 });
  res.closed = await p.eval(() => {
    const sels = ['.tpl-card', '.viewer-tabs button:last-child', '.field', '.field-fold', '.parts li', '.prompt-fill', '.mast-fold', '.mast-facts', '.wz-card'];
    const out = [];
    for (const s of sels) {
      const els = [...document.querySelectorAll(s)];
      if (!els.length) { out.push({ s, count: 0 }); continue; }
      const el = els[0];
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const vis = (node) => { for (let n = node; n; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return n.className || n.tagName; } return null; };
      out.push({
        s, count: els.length,
        inDetail: !!el.closest('.detail'),
        hiddenBy: vis(el),
        w: Math.round(r.width), h: Math.round(r.height),
        borderTop: cs.borderTopWidth, borderBottom: cs.borderBottomWidth,
        passes240: Math.round(r.width) >= 240,
      });
    }
    return out;
  });
  // also: is the template strip / viewer only in the detail panel?
  res.layout = await p.eval(() => ({
    tplStrip: !!document.querySelector('.tpl-cards'),
    tplStripHiddenBy: (() => { const e = document.querySelector('.tpl-cards'); if (!e) return 'absent'; for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none') return n.className || n.tagName; } return null; })(),
    viewer: !!document.querySelector('.viewer'),
    viewerInDetail: !!document.querySelector('.viewer')?.closest('.detail'),
    fieldsInDetail: !!document.querySelector('.field')?.closest('.detail'),
    partsInDetail: !!document.querySelector('.parts')?.closest('.detail'),
    promptFillInDetail: !!document.querySelector('.prompt-fill')?.closest('.detail'),
    mastFold: !!document.querySelector('.mast-fold'),
    mastFoldVisible: (() => { const e = document.querySelector('.mast-fold'); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
  }));
} finally {
  writeFileSync('deliverables/68-audit/probe-locate.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(res, null, 1));
