import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('http://127.0.0.1:8100/prototypes/_selection/wizard.html', { settleMs: 1600 });
  res.wzWhy = await p.eval(() => {
    const els = [...document.querySelectorAll('.wz-card .wz-why')];
    return els.slice(0, 3).map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), bt: getComputedStyle(e).borderTopWidth }; }).concat([{ count: els.length }]);
  });
  await p.close();

  // M02: which 7 elements carry the hairlines, and are they table/formish?
  const t = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await t.goto('http://127.0.0.1:8100/templates/M02-warm-local/index.html', { settleMs: 1800 });
  res.m02 = await t.eval(() => {
    const hits = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
      const thinTop = bt > 0 && bt <= 1.5 && cs.borderTopStyle !== 'none';
      const thinBot = bb > 0 && bb <= 1.5 && cs.borderBottomStyle !== 'none';
      const thinL = bl > 0 && bl <= 1.5 && cs.borderLeftStyle !== 'none';
      const thinR = br > 0 && br <= 1.5 && cs.borderRightStyle !== 'none';
      const hit = (r.width >= 240 && (thinTop || thinBot)) || (r.height >= 240 && (thinL || thinR));
      if (!hit) continue;
      hits.push({
        tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 30),
        styles: [thinTop ? cs.borderTopStyle : null, thinBot ? cs.borderBottomStyle : null].filter(Boolean),
        w: Math.round(r.width), h: Math.round(r.height),
        isDl: !!el.closest('dl'), isTable: !!el.closest('table'), parentTag: el.parentElement?.tagName.toLowerCase(),
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
    return hits.slice(0, 14);
  });
  await t.close();

  // M03 numbering structure: is the work list an ol?
  const u = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await u.goto('http://127.0.0.1:8100/templates/M03-bold-creator/index.html', { settleMs: 1600 });
  res.m03 = await u.eval(() => ({
    olCount: document.querySelectorAll('ol').length,
    ulCount: document.querySelectorAll('ul').length,
    workItems: document.querySelectorAll('.work').length,
    workParentTag: document.querySelector('.work')?.parentElement.tagName.toLowerCase(),
    workParentCls: document.querySelector('.work')?.parentElement.className,
    secLabels: [...document.querySelectorAll('.sec-label')].map((e) => e.textContent.trim()).slice(0, 4),
  }));
  await u.close();
} finally {
  writeFileSync('deliverables/68-audit/probe-final.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(res, null, 1));
