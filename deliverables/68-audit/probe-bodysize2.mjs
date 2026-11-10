// What is the 13px "body text" on _selection, and what is the 109-char measure line?
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('http://127.0.0.1:8100/prototypes/_selection/index.html', { settleMs: 1800 });
  // replicate probe's bodyBy: size 10..24, chars>=60, not inCode/inUI
  res.body = await p.eval(() => {
    const m = new Map();
    const detail = [];
    for (const el of document.querySelectorAll('body *')) {
      let direct = '';
      for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
      direct = direct.replace(/\s+/g, ' ').trim();
      if (direct.length < 60) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (!(size >= 10 && size <= 24)) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      if (el.closest('svg') || el.closest('pre, code')) continue;
      const k = cs.fontFamily.split(',')[0] + '|' + Math.round(size);
      m.set(k, (m.get(k) || 0) + direct.length);
      detail.push({ cls: String(el.className).slice(0, 24), tag: el.tagName.toLowerCase(), size, chars: direct.length, text: direct.slice(0, 60) });
    }
    return { byKey: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), top: detail.sort((a, b) => b.chars - a.chars).slice(0, 4) };
  });
  // the widest paragraph
  res.measure = await p.eval(() => {
    let best = null;
    for (const el of document.querySelectorAll('p, li, blockquote')) {
      let direct = '';
      for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
      direct = direct.replace(/\s+/g, ' ').trim();
      if (direct.length < 60) continue;
      const cs = getComputedStyle(el);
      const w = el.getBoundingClientRect().width;
      const ch = parseFloat(cs.fontSize) * 0.5;
      const perLine = Math.round(w / ch);
      if (!best || perLine > best.perLine) best = { cls: String(el.className), perLine, w: Math.round(w), size: cs.fontSize, maxWidth: cs.maxWidth, text: direct.slice(0, 60) };
    }
    return best;
  });
  // the .cap 13px claim
  res.cap = await p.eval(() => {
    const e = document.querySelector('.cap');
    if (!e) return null;
    const cs = getComputedStyle(e);
    return { size: cs.fontSize, text: e.textContent.trim().slice(0, 30) };
  });
  await p.close();
} finally {
  writeFileSync('deliverables/68-audit/probe-bodysize-sel.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(res, null, 1));
