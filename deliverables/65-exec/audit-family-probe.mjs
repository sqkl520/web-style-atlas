// 任务 4 实测：row-family 显示更多字，会不会撑坏行卡？
// 只在页面里改 DOM 文本（不落盘），三种口径对比：
//   cur  = 现状：split('。')[0].split('：').pop().slice(0,34)
//   s60  = 放宽到 60 字
//   full = 完整 family 全文
// 关键判据不是"文字变多"，而是：行高会不会涨（涨 = 30 行列表变长）、
// 文本会不会溢出列宽、行内是否出现裁切。
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const famMap = Object.fromEntries(B.map((r) => [r.id, r.family || '']));

const apply = (arg) => {
  const { mode, map } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const el = row.querySelector('.row-family');
    if (!el) continue;
    const full = map[id] || '';
    const head = full.split('。')[0].split('：').pop();
    el.textContent = mode === 'full' ? full : mode === 's60' ? head.slice(0, 60) : head.slice(0, 34);
  }
  return true;
};

const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const main = row.querySelector('.row-main');
  const fam = row.querySelector('.row-family');
  const def = row.querySelector('.row-def');
  const meta = row.querySelector('.row-meta');
  const rr = row.getBoundingClientRect();
  const mr = main.getBoundingClientRect();
  const fr = fam.getBoundingClientRect();
  const cs = getComputedStyle(fam);
  return {
    id: row.getAttribute('data-id'),
    rowH: +rr.height.toFixed(1),
    mainH: +mr.height.toFixed(1),
    famH: +fr.height.toFixed(1),
    famW: +fr.width.toFixed(1),
    metaH: +meta.getBoundingClientRect().height.toFixed(1),
    defH: +def.getBoundingClientRect().height.toFixed(1),
    // 列宽溢出（文本撑出 .row-main 的可视宽度）
    mainOverflowX: main.scrollWidth - main.clientWidth,
    rowOverflowX: row.scrollWidth - row.clientWidth,
    // 文本被 CSS 裁掉了吗：scrollWidth > clientWidth 才叫裁
    famClipped: fam.scrollWidth > fam.clientWidth + 1,
    famLines: Math.round(fr.height / (parseFloat(cs.lineHeight) || 1)),
    text: fam.textContent,
  };
});

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const all = {};
try {
  for (const vp of [{ l: '1440', w: 1440, h: 900 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1300 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(500);
    for (const mode of ['cur', 's60', 'full']) {
      await page.eval(apply, { mode, map: famMap });
      await sleep(320);
      all[vp.l + ':' + mode] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

const stat = (arr) => ({ min: Math.min(...arr), p50: arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)], max: Math.max(...arr) });
for (const vpl of ['1440', '390']) {
  const cur = all[vpl + ':cur'], s60 = all[vpl + ':s60'], full = all[vpl + ':full'];
  console.log(`\n=== ${vpl} ===`);
  console.log('  行高 cur ' + JSON.stringify(stat(cur.map((x) => x.rowH))) +
    ' / s60 ' + JSON.stringify(stat(s60.map((x) => x.rowH))) +
    ' / full ' + JSON.stringify(stat(full.map((x) => x.rowH))));
  console.log('  30 行总高 cur ' + cur.reduce((a, x) => a + x.rowH, 0).toFixed(0) +
    ' / s60 ' + s60.reduce((a, x) => a + x.rowH, 0).toFixed(0) +
    ' / full ' + full.reduce((a, x) => a + x.rowH, 0).toFixed(0));
  const grewS60 = cur.filter((x, i) => s60[i].rowH > x.rowH + 0.5).length;
  const grewFull = cur.filter((x, i) => full[i].rowH > x.rowH + 0.5).length;
  console.log('  行高上涨的案数：s60 ' + grewS60 + '/30，full ' + grewFull + '/30');
  console.log('  famH cur ' + JSON.stringify(stat(cur.map((x) => x.famH))) +
    ' / s60 ' + JSON.stringify(stat(s60.map((x) => x.famH))) +
    ' / full ' + JSON.stringify(stat(full.map((x) => x.famH))));
  console.log('  fam 行数 cur ' + JSON.stringify(stat(cur.map((x) => x.famLines))) +
    ' / s60 ' + JSON.stringify(stat(s60.map((x) => x.famLines))) +
    ' / full ' + JSON.stringify(stat(full.map((x) => x.famLines))));
  console.log('  列宽溢出(max) cur ' + Math.max(...cur.map((x) => x.mainOverflowX)) +
    ' / s60 ' + Math.max(...s60.map((x) => x.mainOverflowX)) +
    ' / full ' + Math.max(...full.map((x) => x.mainOverflowX)));
  console.log('  fam 被裁的案数 cur ' + cur.filter((x) => x.famClipped).length +
    ' / s60 ' + s60.filter((x) => x.famClipped).length +
    ' / full ' + full.filter((x) => x.famClipped).length);
  console.log('  defH cur ' + JSON.stringify(stat(cur.map((x) => x.defH))) + ' / full ' + JSON.stringify(stat(full.map((x) => x.defH))));
  console.log('  逐案 Δrow(full-cur)：' + cur.map((x, i) => x.id + (full[i].rowH - x.rowH >= 0 ? '+' : '') + (full[i].rowH - x.rowH).toFixed(1)).join(' '));
}
