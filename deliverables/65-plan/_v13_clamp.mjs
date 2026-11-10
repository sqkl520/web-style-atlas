// 裁决 3 决胜：把「硬截 34 字」换成「全文 + CSS 行数钳制」，桌面/mobile 各付多少
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';
import { readFileSync } from 'node:fs';

const dataTxt = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rowsData = JSON.parse(dataTxt.slice(dataTxt.indexOf('= ') + 2).replace(/;\s*$/, ''));
const families = {};
for (const r of rowsData) families[r.id] = r.family || '';

// clamp=N：全文写入 + -webkit-line-clamp:N；slice34 = 现状；name = 只有家族名
const apply = (arg) => {
  const { mode, map, n } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) continue;
    const full = (map[id] || '');
    const segs = full.split('。').filter((s) => s.trim());
    const name = (segs[0] || '').split('：').pop();
    if (mode === 'slice34') { fam.textContent = name.slice(0, 34); fam.style.cssText = ''; }
    else if (mode === 'clamp') {
      fam.textContent = full;
      fam.style.cssText = '-webkit-line-clamp:' + n + ';-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden;';
    } else if (mode === 'name') { fam.textContent = name; fam.style.cssText = ''; }
  }
  return true;
};
const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const r = row.getBoundingClientRect();
  const main = row.querySelector('.row-main');
  const fam = row.querySelector('.row-family');
  return {
    id: row.getAttribute('data-id'),
    rowH: +r.height.toFixed(1),
    mainH: +main.getBoundingClientRect().height.toFixed(1),
    famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : 0,
    famClipped: fam ? fam.scrollHeight > fam.clientHeight + 1 : false,
  };
});

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const R = {};
try {
  for (const vp of [{ l: '1440', w: 1440, h: 1000 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1100 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(500);
    for (const [mode, n] of [['slice34', 0], ['clamp', 2], ['clamp', 3], ['name', 0]]) {
      await page.eval(apply, { mode, map: families, n });
      await sleep(350);
      R[vp.l + ':' + mode + n] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

console.log('=== 桌面 1440 ===');
for (const k of Object.keys(R).filter((x) => x.startsWith('1440'))) {
  const g = R[k];
  const sum = g.reduce((a, x) => a + x.rowH, 0);
  const clipped = g.filter((x) => x.famClipped).length;
  const per = g.map((x) => x.rowH);
  console.log(`${k.padEnd(14)} 总高 ${sum.toFixed(0).padStart(6)}  行高 min/max ${Math.min(...per)}/${Math.max(...per)}  被钳制的案 ${clipped}/30`);
}
console.log('\n=== mobile 390 ===');
for (const k of Object.keys(R).filter((x) => x.startsWith('390'))) {
  const g = R[k];
  const sum = g.reduce((a, x) => a + x.rowH, 0);
  const clipped = g.filter((x) => x.famClipped).length;
  const per = g.map((x) => x.rowH);
  console.log(`${k.padEnd(14)} 总高 ${sum.toFixed(0).padStart(6)}  行高 min/max ${Math.min(...per)}/${Math.max(...per)}  被钳制的案 ${clipped}/30`);
}

console.log('\n=== 逐案：clamp2 vs 现状（增量 px）===');
for (const vp of ['1440', '390']) {
  const a = R[vp + ':slice340'], b = R[vp + ':clamp2'];
  let up = 0, tot = 0;
  for (let i = 0; i < a.length; i++) { const d = b[i].rowH - a[i].rowH; if (d > 0.5) up++; tot += d; }
  console.log(`${vp}: clamp2 使行高上升 ${up}/30 案，总增量 ${tot.toFixed(0)}px`);
}

console.log('\n=== clamp2 下能否读到「偷的机制」（可见字数）===');
const a = R['1440:clamp2'], s = R['1440:slice340'];
let famMore = 0;
for (let i = 0; i < a.length; i++) famMore += (a[i].famH - s[i].famH);
console.log('桌面 30 案 famH 合计: slice34 =', s.reduce((x, y) => x + y.famH, 0).toFixed(0), ' clamp2 =', a.reduce((x, y) => x + y.famH, 0).toFixed(0));
