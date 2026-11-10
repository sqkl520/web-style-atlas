// E1/B2/C2/E4: live measurements on the selection app at 390x844 and 1440x900.
// Answers: docH/844 on mobile, what a zero-hit search actually shows, what a hard scheme's
// detail panel says, and whether the "first screen holds 1 full card" is still true.
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';
mkdirSync(OUT + 'shots', { recursive: true });

const b = await Browser.launch({ width: 1440, height: 900 });
const result = {};

async function measure(viewport, tag) {
  const page = await b.newPage({ width: viewport.w, height: viewport.h, dsf: 1, mobile: viewport.w < 500 });
  await page.setViewport({ width: viewport.w, height: viewport.h, dsf: 1, mobile: viewport.w < 500 });
  await page.goto(BASE, { settleMs: 2200 });
  const r = await page.eval(() => {
    const de = document.documentElement;
    const scroller = document.querySelector('.ledger') || document.body;
    const rows = [...document.querySelectorAll('.ledger .row')];
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const vis = rows.filter((el) => {
      const b = el.getBoundingClientRect();
      return b.top < vh && b.bottom > 0;
    });
    const full = rows.filter((el) => {
      const b = el.getBoundingClientRect();
      return b.top >= 0 && b.bottom <= vh + 0.5;
    });
    const first = rows[0] ? rows[0].getBoundingClientRect() : null;
    return {
      docH: de.scrollHeight, bodyH: document.body.scrollHeight, vh, vw,
      screens: +(de.scrollHeight / vh).toFixed(2),
      rowCount: rows.length,
      visibleRows: vis.length,
      fullyVisibleRows: full.length,
      firstRow: first ? { top: +first.top.toFixed(2), bottom: +first.bottom.toFixed(2), h: +first.height.toFixed(2) } : null,
      firstRowSlackPx: first ? +(vh - first.bottom).toFixed(2) : null,
      rowHeights: rows.slice(0, 4).map((el) => +el.getBoundingClientRect().height.toFixed(1)),
      countText: (document.getElementById('count') || {}).textContent,
    };
  });
  await page.screenshot({ path: OUT + `shots/e-${tag}-fold.jpg`, format: 'jpeg', quality: 74 });
  await page.screenshot({ path: OUT + `shots/e-${tag}-full.jpg`, format: 'jpeg', quality: 60, fullPage: true });
  await page.close();
  return r;
}

result.m390 = await measure({ w: 390, h: 844 }, '390');
result.m1440 = await measure({ w: 1440, h: 900 }, '1440');
result.m768 = await measure({ w: 768, h: 1024 }, '768');

writeFileSync(OUT + 'e1-layout.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
await b.close();
