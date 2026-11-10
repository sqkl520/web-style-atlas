// P13 — 法证：19.4 屏到底从哪来。逐个候选精确复算。
import { Browser, openPage, settle, setSort, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const NOW = process.argv[2] || '8901';
const OLD = process.argv[3] || '8902';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = { candidates: [], forensic: [] };

async function rowSum(port, w, h, css, tag) {
  const page = await openPage(browser, { width: w, height: h, mobile: w < 700, dsf: 2 });
  await page.goto(`http://127.0.0.1:${port}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  if (css) {
    await page.eval(`(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(css)}; document.head.appendChild(s); return 1; })()`);
    await sleep(800);
  }
  const r = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')];
    const hs=rows.map(x=>+x.getBoundingClientRect().height.toFixed(1));
    const sum=+hs.reduce((a,b)=>a+b,0).toFixed(1);
    const dh=document.documentElement.scrollHeight, vh=innerHeight;
    return { n:hs.length, sum, mean:+(sum/hs.length).toFixed(1), min:Math.min(...hs), max:Math.max(...hs),
             docH:dh, vh:+vh, docScreens:+(dh/vh).toFixed(3), rowSumScreens:+(sum/vh).toFixed(3) };
  })()`);
  out.forensic.push({ tag, vp: `${w}x${h}`, ...r });
  console.log(tag.padEnd(46), `rows=${r.n} sum=${r.sum} mean=${r.mean} | docH=${r.docH}/${r.vh}=${r.docScreens} | rowSum/vh=${r.rowSumScreens}`);
  await page.close();
  return r;
}

// 复现 app.js 注释里那个 16,387（390×844，家族 16px、压缩落地之前）
await rowSum(OLD, 390, 844, null, 'OLD 1753f94 390 (基线)');
await rowSum(OLD, 390, 844, '.row-family{font-size:16px;line-height:1.45}', 'OLD + 家族 16px/1.45 (16,387 的候选现场)');
await rowSum(OLD, 390, 844, '.row-family{font-size:16px;line-height:1.45}', 'OLD + 家族 16px 再测(复现性)');
await rowSum(NOW, 390, 844, null, 'NOW 390 基线（当前默认）');
await rowSum(NOW, 360, 640, null, 'NOW 360x640');
await rowSum(NOW, 390, 892, null, 'NOW 390x892');
await rowSum(OLD, 390, 892, null, 'OLD 390x892');

// 候选表
const V = [
  { name: '(a) 今日 390×844 默认态', docH: 11564, vh: 844 },
  { name: '(a2) 今日 360×640 默认态', docH: 12424, vh: 640 },
  { name: '(a3) 今日 375×812 默认态', docH: 11848, vh: 812 },
  { name: '(b) 改动前 1753f94 390×844', docH: 17308, vh: 844 },
  { name: '(b2) 改动前 1753f94 390×892', docH: 17327, vh: 892 },
  { name: '(c) 历史记录「30 行总高 16,387」÷ 844', docH: 16387, vh: 844 },
  { name: '(c2) 改动前 1753f94 390×844 30 行合计 16,295.9 ÷ 844', docH: 16295.9, vh: 844 },
  { name: '(d) 今日 390×844 三块折叠全展开', docH: 13248, vh: 844 },
  { name: '(e) 今日 768×1024', docH: 15272, vh: 1024 },
  { name: '(f) 今日 1440×900', docH: 8835, vh: 900 },
];
for (const c of V) {
  out.candidates.push({ ...c, screens: +(c.docH / c.vh).toFixed(3), matches194: Math.abs(c.docH / c.vh - 19.4) < 0.05 });
  console.log(String(+(c.docH / c.vh).toFixed(3)).padStart(8), Math.abs(c.docH / c.vh - 19.4) < 0.05 ? '  <== 命中 19.4' : '', c.name);
}

writeFileSync('deliverables/69-audit/data-p13-forensic.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p13-forensic.json');
await browser.close();
