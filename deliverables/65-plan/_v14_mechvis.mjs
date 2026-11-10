// 裁决 3 收尾：机制句在行卡上到底能不能被看见（顺序问题）+ 按案统计
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';
import { readFileSync } from 'node:fs';

const dataTxt = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rowsData = JSON.parse(dataTxt.slice(dataTxt.indexOf('= ') + 2).replace(/;\s*$/, ''));
const families = {};
for (const r of rowsData) families[r.id] = r.family || '';

const apply = (arg) => {
  const { mode, map, n } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) continue;
    const full = (map[id] || '');
    const segs = full.split('。').filter((s) => s.trim());
    const name = (segs[0] || '').split('：').pop();
    const mech = segs.find((s, i) => i > 0 && /偷|拿的|机制/.test(s)) || '';
    if (mode === 'clampFull') { fam.textContent = full; fam.style.cssText = '-webkit-line-clamp:' + n + ';-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden;'; }
    else if (mode === 'nameMech') { fam.textContent = name + (mech ? '。' + mech : ''); fam.style.cssText = '-webkit-line-clamp:' + n + ';-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden;'; }
  }
  return true;
};
const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const r = row.getBoundingClientRect();
  const fam = row.querySelector('.row-family');
  const main = row.querySelector('.row-main');
  return {
    id: row.getAttribute('data-id'),
    rowH: +r.height.toFixed(1),
    mainH: +main.getBoundingClientRect().height.toFixed(1),
    famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : 0,
    famClipped: fam ? fam.scrollHeight > fam.clientHeight + 2 : false,
    famText: fam ? fam.textContent : '',
    famVisibleChars: (() => {
      if (!fam) return 0;
      // 用 Range 逐字判断是否落在 fam 的 client 盒内
      const box = fam.getBoundingClientRect();
      const walker = document.createTreeWalker(fam, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let vis = 0;
      while (walker.nextNode()) {
        const t = walker.currentNode.nodeValue || '';
        for (let i = 0; i < t.length; i++) {
          range.setStart(walker.currentNode, i); range.setEnd(walker.currentNode, i + 1);
          const rr = range.getBoundingClientRect();
          if (rr.height > 0 && rr.bottom <= box.bottom + 1 && rr.top >= box.top - 1) vis++;
        }
      }
      return vis;
    })(),
  };
});

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const R = {};
try {
  const page = await browser.newPage({ width: 1440, height: 1000, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1100 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(500);
  for (const [mode, n] of [['clampFull', 2], ['clampFull', 3], ['nameMech', 2], ['nameMech', 3]]) {
    await page.eval(apply, { mode, map: families, n });
    await sleep(300);
    R[mode + n] = await page.eval(probe);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }

for (const k of Object.keys(R)) {
  const g = R[k];
  console.log(`\n=== 桌面 ${k} ===`);
  console.log(`总高 ${g.reduce((a, x) => a + x.rowH, 0).toFixed(0)}  行高 max ${Math.max(...g.map(x=>x.rowH))}  被钳制 ${g.filter(x=>x.famClipped).length}/30`);
  const vis = g.map((x) => x.famVisibleChars).sort((a, b) => a - b);
  console.log(`可见字数 min/p50/max = ${vis[0]}/${vis[15]}/${vis[29]}`);
}

// 关键：机制句在 clampFull 下是否进入可见区
console.log('\n=== 关键：clamp 全文时，「偷的机制」句是否可见 ===');
const g = R['clampFull2'];
let mechVisible = 0;
for (const x of g) {
  const idx = x.famText.search(/偷|拿的|机制/);
  const visible = x.famVisibleChars;
  const ok = idx >= 0 && idx < visible;
  if (ok) mechVisible++;
  console.log(`  ${x.id} 机制句起于第 ${idx} 字 / 可见 ${visible} 字 → ${ok ? '可见' : '不可见'}`);
}
console.log(`\nclampFull2 下机制句可见的案: ${mechVisible}/30`);
