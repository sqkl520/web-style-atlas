// P16 — 复核任务书里剩下的两条断言：font-size < 13px 声明数、横向溢出。
import { Browser, openPage, settle, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = {};

for (const t of [{ w: 390, h: 844, m: true }, { w: 768, h: 1024, m: true }, { w: 1440, h: 900, m: false }]) {
  const page = await openPage(browser, { width: t.w, height: t.h, mobile: t.m, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  const r = await page.eval(`(() => {
    const all=[...document.querySelectorAll('*')];
    const tiny=[];
    for(const el of all){
      if(!el.getClientRects().length) continue;
      const fs=parseFloat(getComputedStyle(el).fontSize);
      if(fs<13) tiny.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,40), fs, text:(el.textContent||'').trim().slice(0,30)});
    }
    const sizes={};
    for(const el of all){ if(!el.getClientRects().length) continue; const fs=parseFloat(getComputedStyle(el).fontSize); sizes[fs]=(sizes[fs]||0)+1; }
    return { tinyCount: tiny.length, tinySample: tiny.slice(0,8), sizeHistogram: sizes,
      overflowX: document.documentElement.scrollWidth-innerWidth,
      bodyOverflowX: document.body.scrollWidth-innerWidth,
      minFont: Math.min(...Object.keys(sizes).map(Number)) };
  })()`);
  out[`${t.w}x${t.h}`] = r;
  console.log(`${t.w}x${t.h}`.padEnd(10), 'tiny<13px=' + r.tinyCount, 'minFont=' + r.minFont,
    'overflowX=' + r.overflowX, 'bodyOvf=' + r.bodyOverflowX,
    'sizes=' + JSON.stringify(r.sizeHistogram));
  if (r.tinyCount) console.log('   sample:', JSON.stringify(r.tinySample));
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p16-fonts.json', JSON.stringify(out, null, 2));
console.log('wrote data-p16-fonts.json');
await browser.close();
process.exit(0);
