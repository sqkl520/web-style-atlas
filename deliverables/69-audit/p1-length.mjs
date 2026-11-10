// P1 — 真实数字：当前 HEAD 在 390x844 下，五种排序各测一次。
// 也顺带测 768x1024 / 1440x900。
import { Browser, openPage, settle, measure, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const OUT = process.argv[3] || 'deliverables/69-audit/data-p1-length.json';
const VIEWPORTS = [
  { w: 390, h: 844, mobile: true, label: '390x844' },
  { w: 768, h: 1024, mobile: true, label: '768x1024' },
  { w: 1440, h: 900, mobile: false, label: '1440x900' },
];

const browser = await Browser.launch({ width: 1200, height: 900 });
const results = [];
for (const vp of VIEWPORTS) {
  const page = await openPage(browser, { width: vp.w, height: vp.h, mobile: vp.mobile, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  for (const [val, label] of SORTS) {
    await setSort(page, val);
    const m = await measure(page);
    results.push({
      vp: vp.label, sort: val, sortLabel: label,
      screens: m.screens, scrollHeight: m.scrollHeight, vh: m.vh,
      rows: m.rows, full: m.fullInFirst, part: m.partInFirst,
      firstId: m.firstId, firstTop: m.firstTop, firstH: m.firstH, slack: m.slack,
      ledgerScreens: m.ledgerScreens, ledgerSum: m.ledgerSum,
      mast: m.chrome.mast && m.chrome.mast.h, rail: m.chrome.rail && m.chrome.rail.h,
      bar: m.chrome.bar && m.chrome.bar.h,
      overflowX: m.overflowX,
      folds: m.folds.map((f) => (f ? f.open : null)),
      cards: m.cards.map((c) => ({ id: c.id, h: c.h, top: c.top })),
    });
    console.log(vp.label.padEnd(10), val.padEnd(6), 'screens=' + String(m.screens).padEnd(7),
      'sh=' + String(m.scrollHeight).padEnd(7), 'full=' + m.fullInFirst,
      'first=' + m.firstId, 'top=' + m.firstTop, 'h=' + m.firstH, 'slack=' + m.slack);
  }
  await page.close();
}
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log('wrote ' + OUT);
await browser.close();
