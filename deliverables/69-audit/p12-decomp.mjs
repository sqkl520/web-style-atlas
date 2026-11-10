// P12 — 屏数构成拆解：页头 X 屏 + 筛选栏 Y + 工具条 Z + 30 张卡 W。
import { Browser, openPage, settle, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = [];

const TIERS = [
  { w: 360, h: 640, m: true, label: '360x640' },
  { w: 375, h: 812, m: true, label: '375x812' },
  { w: 390, h: 844, m: true, label: '390x844' },
  { w: 768, h: 1024, m: true, label: '768x1024' },
  { w: 1440, h: 900, m: false, label: '1440x900' },
];

for (const t of TIERS) {
  const page = await openPage(browser, { width: t.w, height: t.h, mobile: t.m, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await setSort(page, 'n');
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  const d = await page.eval(`(() => {
    const dh=document.documentElement.scrollHeight, vh=innerHeight;
    const box=(sel)=>{const e=document.querySelector(sel); if(!e)return null; const b=e.getBoundingClientRect(); return {top:+(b.top+scrollY).toFixed(1),h:+b.height.toFixed(1)};};
    const rows=[...document.querySelectorAll('#ledger .row')];
    const hs=rows.map(r=>+r.getBoundingClientRect().height.toFixed(1));
    const sum=hs.reduce((a,b)=>a+b,0);
    const mast=box('header.mast'), rail=box('aside.rail'), bar=box('.bar'), led=box('#ledger'), main=box('.main');
    // 卡间分隔线与 ledger 上下边框 = ledger 高度 - 卡片高度和
    const overhead = led ? +(led.h - sum).toFixed(1) : null;
    const S=(px)=> px==null?null:+(px/vh).toFixed(3);
    return { dh, vh, screens:+(dh/vh).toFixed(3),
      mast, rail, bar, led, main,
      cardSum:+sum.toFixed(1), cardMin:Math.min(...hs), cardMax:Math.max(...hs), cardMean:+(sum/hs.length).toFixed(1),
      ledgerOverhead: overhead,
      pct: { mast: S(mast.h), rail: S(rail.h), bar: S(bar.h), cards: S(sum), overhead: S(overhead), unusedViewport: 1 },
      sumCheck: +(mast.h+rail.h+(bar.top-(rail.top+rail.h))+bar.h+led.h).toFixed(1),
      bodyH: document.body.scrollHeight };
  })()`);
  out.push({ vp: t.label, ...d });
  console.log('=== ' + t.label + ' docH=' + d.dh + ' (' + d.screens + ' 屏) ===');
  console.log('  mast ' + d.mast.h + ' = ' + d.pct.mast + ' 屏 | rail ' + d.rail.h + ' = ' + d.pct.rail +
    ' | gap ' + (d.bar.top - (d.rail.top + d.rail.h)).toFixed(1) + ' | bar ' + d.bar.h + ' = ' + d.pct.bar +
    ' | ledger ' + d.led.h + ' = ' + (d.led.h / d.vh).toFixed(3));
  console.log('  卡合计 ' + d.cardSum + ' = ' + d.pct.cards + ' 屏 | 卡间/边框 ' + d.ledgerOverhead + ' = ' + d.pct.overhead +
    ' | 卡 min/mean/max ' + d.cardMin + '/' + d.cardMean + '/' + d.cardMax);
  console.log('  chrome 合计 ' + (d.mast.h + d.rail.h + d.bar.h + (d.bar.top - (d.rail.top + d.rail.h))) .toFixed(1) + 'px = ' +
    ((d.mast.h + d.rail.h + d.bar.h + (d.bar.top - (d.rail.top + d.rail.h))) / d.vh).toFixed(3) + ' 屏');
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p12-decomp.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p12-decomp.json');
await browser.close();
