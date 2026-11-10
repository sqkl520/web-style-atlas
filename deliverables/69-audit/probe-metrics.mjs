// 探针 4：首屏指标复核（多次 settle / dsf=1）+ 完全可见卡数。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = { runs: [] };

const cases = [
  { w: 390, h: 844, mobile: true, dsf: 2, settle: 1200 },
  { w: 390, h: 844, mobile: true, dsf: 2, settle: 3000 },
  { w: 390, h: 844, mobile: false, dsf: 1, settle: 2500 },
  { w: 1440, h: 900, mobile: false, dsf: 1, settle: 1200 },
  { w: 1440, h: 900, mobile: false, dsf: 1, settle: 3000 },
  { w: 768, h: 1024, mobile: false, dsf: 1, settle: 2000 },
];

for (const c of cases) {
  const page = await b.newPage({ width: c.w, height: c.h, mobile: c.mobile, dsf: c.dsf });
  await page.goto(BASE, { settleMs: c.settle });
  const r = await page.eval(() => {
    const vh = innerHeight;
    const cards = [...document.querySelectorAll('#ledger > li')].map(li => {
      const b = li.getBoundingClientRect();
      return { top: +(b.top + scrollY).toFixed(1), bottom: +(b.bottom + scrollY).toFixed(1), h: +b.height.toFixed(1) };
    });
    const fully = cards.filter(c => c.top >= 0 && c.bottom <= vh);
    const partial = cards.filter(c => c.top < vh && c.bottom > vh);
    return {
      vh, docH: document.documentElement.scrollHeight, dpr: devicePixelRatio,
      nCards: cards.length,
      first: cards[0] || null,
      firstSlack: cards[0] ? +(vh - cards[0].bottom).toFixed(1) : null,
      fullyVisible: fully.length, partialVisible: partial.length,
      card0: cards[0], card1: cards[1],
      folds: ['mast-fold','rail-fold','bar-fold'].map(id => { const e = document.getElementById(id);
        return { id, open: e.open, h: +e.getBoundingClientRect().height.toFixed(1) }; }),
      railH: +document.querySelector('aside.rail').getBoundingClientRect().height.toFixed(1),
      mastH: +document.querySelector('header.mast').getBoundingClientRect().height.toFixed(1),
      barH: +document.querySelector('.bar').getBoundingClientRect().height.toFixed(1),
      bodyW: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth,
    };
  });
  out.runs.push({ spec: `${c.w}x${c.h} mobile=${c.mobile} dsf=${c.dsf} settle=${c.settle}`, ...r });
  await page.close();
}
writeFileSync(OUT + '/probe-metrics.json', JSON.stringify(out, null, 1));
for (const r of out.runs) {
  console.log(`${r.spec}\n  vh=${r.vh} dpr=${r.dpr} docH=${r.docH} first.top=${r.first?.top} h=${r.first?.h} slack=${r.firstSlack} fully=${r.fullyVisible} partial=${r.partialVisible} mast=${r.mastH} rail=${r.railH} bar=${r.barH} folds=${JSON.stringify(r.folds)}\n`);
}
await b.close();
