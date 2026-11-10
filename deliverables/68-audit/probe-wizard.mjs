// Answer all five wizard questions, then measure the *produced* result cards (only then does .wz-why
// with its border-top exist). This tests whether wizard.css:72 is dead CSS or live-but-below-threshold.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const OUT = 'deliverables/68-audit/shots';
mkdirSync(OUT, { recursive: true });
const b = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('http://127.0.0.1:8100/prototypes/_selection/wizard.html', { settleMs: 1600 });
  res.before = await p.eval(() => ({ cards: document.querySelectorAll('.wz-card').length, why: document.querySelectorAll('.wz-why').length }));
  // click the first option of each of the five questions
  res.clicked = await p.eval(() => {
    const qs = [...document.querySelectorAll('.wz-q')];
    let n = 0;
    for (const q of qs) {
      const btn = q.querySelector('.wz-opts button');
      if (btn) { btn.click(); n++; }
    }
    return { questions: qs.length, clicked: n };
  });
  await sleep(1500);
  res.after = await p.eval(() => {
    const cards = [...document.querySelectorAll('.wz-card')];
    const whys = [...document.querySelectorAll('.wz-why')];
    return {
      cards: cards.length,
      why: whys.length,
      whyGeom: whys.slice(0, 4).map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), bt: cs.borderTopWidth, style: cs.borderTopStyle }; }),
      cardGeom: cards.slice(0, 2).map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }),
      outSel: document.querySelector('.wz-out, #wz-out')?.innerHTML.slice(0, 100),
    };
  });
  await p.eval(() => { const o = document.querySelector('.wz-card'); if (o) o.scrollIntoView({ block: 'center' }); });
  await sleep(600);
  await p.screenshot({ path: join(OUT, 'wizard-1440-results.png'), format: 'png' });
  await p.close();
} finally {
  writeFileSync('deliverables/68-audit/probe-wizard-results.json', JSON.stringify(res, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(res, null, 1));
