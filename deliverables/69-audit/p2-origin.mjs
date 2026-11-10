// P2 — 19.4 屏的来源追踪。
// 对同一页面分别测量：当前 HEAD（8901）、改动前 1753f94（8902 overlay）、
// 以及 HEAD 在折叠块展开状态下的各种组合。
import { Browser, openPage, settle, measure, setFold, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const NOW = process.argv[2] || '8901';
const OLD = process.argv[3] || '8902';
const out = { at: new Date().toISOString(), cases: [] };

const browser = await Browser.launch({ width: 390, height: 844 });

async function caseOf({ label, port, w = 390, h = 844, mobile = true, folds = null, sort = 'n', path = 'prototypes/_selection/' }) {
  const page = await openPage(browser, { width: w, height: h, mobile, dsf: 2 });
  await page.goto(`http://127.0.0.1:${port}/${path}`, { settleMs: 1200 });
  await settle(page, 1500);
  if (folds) {
    for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) {
      if (id in folds) await setFold(page, id, folds[id]);
    }
    await sleep(400);
  }
  if (sort !== 'n') await setSort(page, sort);
  const m = await measure(page);
  const rec = {
    label, port, vp: `${w}x${h}`, sort,
    screens: m.screens, scrollHeight: m.scrollHeight, vh: m.vh,
    mast: m.chrome.mast && m.chrome.mast.h,
    rail: m.chrome.rail && m.chrome.rail.h,
    bar: m.chrome.bar && m.chrome.bar.h,
    ledger: m.chrome.ledger && m.chrome.ledger.h,
    ledgerSum: m.ledgerSum, ledgerScreens: m.ledgerScreens,
    firstId: m.firstId, firstTop: m.firstTop, firstH: m.firstH, slack: m.slack,
    full: m.fullInFirst, part: m.partInFirst,
    overflowX: m.overflowX,
    cardH: { min: Math.min(...m.cards.map((c) => c.h)), mean: +(m.cards.reduce((a, c) => a + c.h, 0) / m.cards.length).toFixed(1), max: Math.max(...m.cards.map((c) => c.h)) },
  };
  out.cases.push(rec);
  console.log(label.padEnd(38), 'screens=' + String(rec.screens).padEnd(7), 'sh=' + String(rec.scrollHeight).padEnd(6),
    'mast=' + rec.mast, 'rail=' + rec.rail, 'bar=' + rec.bar, 'ledger=' + rec.ledger,
    'firstTop=' + rec.firstTop, 'slack=' + rec.slack, 'full=' + rec.full);
  await page.close();
  return rec;
}

// 1) 当前 HEAD，折叠默认（= 窄档自动收起）
await caseOf({ label: 'NOW 390 default(folded)', port: NOW });
// 2) 当前 HEAD，三块全展开（用户手动点开）
await caseOf({ label: 'NOW 390 all folds OPEN', port: NOW, folds: { 'mast-fold': true, 'rail-fold': true, 'bar-fold': true } });
// 3) 只开 rail
await caseOf({ label: 'NOW 390 rail OPEN', port: NOW, folds: { 'rail-fold': true } });
// 4) 只开 mast
await caseOf({ label: 'NOW 390 mast OPEN', port: NOW, folds: { 'mast-fold': true } });
// 5) 只开 bar
await caseOf({ label: 'NOW 390 bar OPEN', port: NOW, folds: { 'bar-fold': true } });
// 6) 改动前 1753f94（无折叠机制，全部内容常驻；390 档 rail 有 40vh 限高）
await caseOf({ label: 'OLD 1753f94 390', port: OLD });
// 7) 改动前 1753f94 在 768 档
await caseOf({ label: 'OLD 1753f94 768x1024', port: OLD, w: 768, h: 1024 });
// 8) 改动前 1753f94 在 1440 档
await caseOf({ label: 'OLD 1753f94 1440x900', port: OLD, w: 1440, h: 900, mobile: false });
// 9) 当前 HEAD 768 全展开
await caseOf({ label: 'NOW 768 all folds OPEN', port: NOW, w: 768, h: 1024, folds: { 'mast-fold': true, 'rail-fold': true, 'bar-fold': true } });
// 10) 当前 HEAD 1440（无折叠条）
await caseOf({ label: 'NOW 1440x900', port: NOW, w: 1440, h: 900, mobile: false });

// 11) 五种排序（折叠默认态）
for (const [val, lbl] of SORTS) {
  await caseOf({ label: `NOW 390 default sort=${val}(${lbl})`, port: NOW, sort: val });
}

writeFileSync('deliverables/69-audit/data-p2-origin.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p2-origin.json');
await browser.close();
