// P3 — 19.4 屏的算术溯源：扫描多种 (视口, 版本, 折叠态) 组合，
// 找出哪一组实测值落在 19.40~19.45。
import { Browser, openPage, settle, measure, setFold, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const NOW = process.argv[2] || '8901';
const OLD = process.argv[3] || '8902';
const cases = [];
const browser = await Browser.launch({ width: 420, height: 900 });

const VPS = [
  [360, 640, '360x640'], [360, 780, '360x780'], [375, 667, '375x667'], [375, 812, '375x812'],
  [390, 844, '390x844'], [390, 892, '390x892'], [393, 873, '393x873'], [412, 915, '412x915'],
  [414, 896, '414x896'], [428, 926, '428x926'], [430, 932, '430x932'], [768, 1024, '768x1024'],
];

async function run(port, w, h, label, tag, folds) {
  const page = await openPage(browser, { width: w, height: h, mobile: w < 700, dsf: 2 });
  await page.goto(`http://127.0.0.1:${port}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  if (folds) {
    for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) await setFold(page, id, folds);
    await sleep(400);
  }
  const m = await measure(page);
  const rec = {
    tag, label, vp: `${w}x${h}[${h}]`, vh: m.vh,
    docH: m.scrollHeight, docScreens: m.screens,
    ledgerH: m.ledgerSum, ledgerScreens: m.ledgerScreens,
    ledgerBoxScreens: +(m.chrome.ledger.h / m.vh).toFixed(3),
    mast: m.chrome.mast && m.chrome.mast.h, rail: m.chrome.rail && m.chrome.rail.h,
    bar: m.chrome.bar && m.chrome.bar.h,
    firstTop: m.firstTop, slack: m.slack, full: m.fullInFirst,
  };
  cases.push(rec);
  console.log(tag.padEnd(4), rec.vp.padEnd(14), 'doc=' + String(rec.docScreens).padEnd(7),
    'ledgerSum=' + String(rec.ledgerScreens).padEnd(7), 'ledgerBox=' + String(rec.ledgerBoxScreens).padEnd(7),
    'full=' + rec.full, 'firstTop=' + rec.firstTop, 'slack=' + rec.slack);
  await page.close();
}

for (const [w, h, lab] of VPS) await run(NOW, w, h, lab, 'NOW');
for (const [w, h, lab] of VPS) await run(OLD, w, h, lab, 'OLD');
// OLD with rail expanded (no fold mechanism exists before d49ed74, but rail was max-height 40vh)
await run(NOW, 390, 844, '390x844', 'NOW+', { 'mast-fold': true, 'rail-fold': true, 'bar-fold': true });

writeFileSync('deliverables/69-audit/data-p3-sweep.json', JSON.stringify(cases, null, 2));
console.log('\n--- 候选：哪个实测值 ≈ 19.4 ---');
for (const c of cases) {
  for (const [k, v] of [['docScreens', c.docScreens], ['ledgerScreens', c.ledgerScreens], ['ledgerBoxScreens', c.ledgerBoxScreens]]) {
    if (v >= 19.3 && v <= 19.5) console.log('HIT', c.tag, c.vp, k, '=', v);
  }
}
await browser.close();
