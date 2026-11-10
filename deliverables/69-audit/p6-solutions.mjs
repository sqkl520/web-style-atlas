// P6 — 解法成本/效果实测。全部用“只读注入”的方式模拟，不碰任何文件。
// 每个变体：5 种排序下的 full 卡数 + 最坏余量 + 总屏数。
import { Browser, openPage, settle, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });

const VARIANTS = {
  'V0 现状': null,

  // 解法1a：家族 clamp 2 行 → 1 行
  'V1a 家族 2行→1行': `.row-family{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}`,

  // 解法1b：1a + 缩略图 152→120
  'V1b 1a+图152→120': `.row-family{-webkit-line-clamp:1;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
                       .shots .shot:first-child{max-width:120px}`,

  // 解法1c：1b + 行脚注收到 2 行（截断）
  'V1c 1b+脚注2行': `.row-family{-webkit-line-clamp:1;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
                     .shots .shot:first-child{max-width:120px}
                     .row-foot{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-height:2.9em}`,

  // 解法1d：极限瘦身（去定义句、去家族、图 100）
  'V1d 极限(去定义/家族/图100)': `.row-def{display:none}
                     .row-family{display:none}
                     .shots .shot:first-child{max-width:100px}
                     .row-foot{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`,

  // 解法3：密集列表视图（无缩略图，单行）
  'V3 密集列表视图': `.shots{display:none!important}
                     .row{grid-template-columns:46px minmax(0,1fr)!important;gap:6px;padding:7px 0}
                     .row-head h3{font-size:16px}
                     .row-def{font-size:14px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
                     .row-family{display:none}
                     .row-meta{margin-top:2px;font-size:12px}
                     .row-foot{font-size:12px;line-height:1.35}`,

  // 解法3b：密集 + 保留小图
  'V3b 密集带小图': `.row{grid-template-columns:46px minmax(0,1fr)!important;gap:6px;padding:6px 0}
                     .shots .shot:first-child{max-width:84px}
                     .row-family{display:none}
                     .row-def{font-size:14px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
                     .row-meta{margin-top:2px}
                     .row-foot{font-size:12px;line-height:1.35}`,

  // 解法4：CSS 虚拟滚动 / 懒渲染（content-visibility）
  'V4 content-visibility': `#ledger .row{content-visibility:auto;contain-intrinsic-size:auto 390px}`,
};

const results = [];

async function runVariant(label, css) {
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  if (css) {
    await page.eval(`(() => { const s=document.createElement('style'); s.id='__v'; s.textContent=${JSON.stringify(css)}; document.head.appendChild(s); return 1; })()`);
    await sleep(800);
  }
  const perSort = {};
  for (const [val] of SORTS) {
    await setSort(page, val);
    await page.eval('window.scrollTo(0,0)');
    await sleep(250);
    const r = await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')];
      const vh=innerHeight;
      const ft=rows[0].getBoundingClientRect().top+scrollY;
      const hs=rows.map(el=>({id:el.dataset.id,h:+el.getBoundingClientRect().height.toFixed(1)}));
      const sl=hs.map(d=>({id:d.id,slack:+(vh-(ft+d.h)).toFixed(1)})).sort((a,b)=>a.slack-b.slack);
      const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length;
      const part=rows.filter(el=>{const b=el.getBoundingClientRect();return b.bottom>0&&b.top<vh;}).length;
      return {full, part, sh:document.documentElement.scrollHeight, vh:+vh, firstTop:+ft.toFixed(1),
              worst:sl[0], minH:Math.min(...hs.map(d=>d.h)), meanH:+(hs.reduce((a,d)=>a+d.h,0)/hs.length).toFixed(1)};
    })()`);
    perSort[val] = r;
  }
  // 密集视图额外：首屏能完整看到多少「案」
  const density = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
    return { full: rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length,
             visibleIds: rows.filter(el=>{const b=el.getBoundingClientRect();return b.bottom>0&&b.top<vh;}).map(el=>el.dataset.id) };
  })()`);
  const nFull = Object.values(perSort).map((x) => x.full);
  const rec = {
    label, css: !!css,
    screens: perSort.n.sh / perSort.n.vh, screensRounded: +(perSort.n.sh / perSort.n.vh).toFixed(3),
    fullAll: nFull, fullMin: Math.min(...nFull),
    worstSlack: perSort.gate.worst,
    minCardH: perSort.n.minH, meanCardH: perSort.n.meanH,
    perSort, density,
  };
  results.push(rec);
  console.log(label.padEnd(26), 'screens=' + String(rec.screensRounded).padEnd(7),
    'full=' + JSON.stringify(nFull), 'worst=' + rec.worstSlack.id + '/' + rec.worstSlack.slack,
    'minH=' + rec.minCardH, 'meanH=' + rec.meanCardH, 'firstScreenIds=' + density.visibleIds.join(','));
  await page.close();
}

for (const [label, css] of Object.entries(VARIANTS)) await runVariant(label, css);

writeFileSync('deliverables/69-audit/data-p6-solutions.json', JSON.stringify(results, null, 2));
console.log('\nwrote data-p6-solutions.json');
await browser.close();
