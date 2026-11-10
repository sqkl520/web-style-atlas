// 任务 4 收尾实测：2 行 vs 3 行 clamp，两档视口的行高代价与"实际能读到多少字"。
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');

const apply = (arg) => {
  const { mode } = arg;
  let st = document.getElementById('__probe_style');
  if (!st) { st = document.createElement('style'); st.id = '__probe_style'; document.head.appendChild(st); }
  const clamp = (n) => `.row-family{display:-webkit-box;-webkit-line-clamp:${n};-webkit-box-orient:vertical;overflow:hidden;flex:1 1 100%;min-width:0}`;
  st.textContent = mode === 'base'
    ? ''                                       // base 不注入：用仓库当前实现（改后 = 全文 + CSS）
    : mode === 'l2' ? clamp(2) : mode === 'l3' ? clamp(3) : clamp(1);
  return true;
};

// 量"用户实际能读到多少字"：按可见高度反推被渲染出来的字符数，而不是 textContent.length
const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const fam = row.querySelector('.row-family');
  const main = row.querySelector('.row-main');
  const rr = row.getBoundingClientRect();
  const fr = fam.getBoundingClientRect();
  const cs = getComputedStyle(fam);
  const lh = parseFloat(cs.lineHeight) || 1;
  let visibleChars = null;
  // 用 Range 逐字测：落在 fam 的可视矩形内才算读到
  const walker = document.createTreeWalker(fam, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  if (node) {
    const range = document.createRange();
    let n = 0;
    for (let i = 0; i < node.nodeValue.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.bottom <= fr.bottom + 0.5 && r.top >= fr.top - 0.5) n++;
    }
    visibleChars = n;
  }
  return {
    id: row.getAttribute('data-id'),
    rowH: +rr.height.toFixed(1),
    famH: +fr.height.toFixed(1),
    famW: +fr.width.toFixed(1),
    famLines: Math.round(fr.height / lh),
    famClientH: fam.clientHeight,
    famScrollH: fam.scrollHeight,
    clamped: fam.scrollHeight > fam.clientHeight + 1,
    totalChars: fam.textContent.length,
    visibleChars,
    mainOverflowX: main.scrollWidth - main.clientWidth,
    rowOverflowX: row.scrollWidth - row.clientWidth,
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
    for (const mode of ['base', 'l1', 'l2', 'l3']) {
      await page.eval(apply, { mode });
      await sleep(330);
      all[vp.l + ':' + mode] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

const st = (a) => ({ min: Math.min(...a), p50: a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], max: Math.max(...a) });
for (const vpl of ['1440', '390']) {
  console.log(`\n=== ${vpl} ===`);
  const base = all[vpl + ':base'];
  for (const mode of ['base', 'l1', 'l2', 'l3']) {
    const g = all[vpl + ':' + mode];
    const grows = g.filter((x, i) => x.rowH > base[i].rowH + 0.5).length;
    console.log(`  ${mode.padEnd(4)} 行高 ${JSON.stringify(st(g.map((x) => x.rowH))).padEnd(32)} 总高 ${String(g.reduce((a, x) => a + x.rowH, 0).toFixed(0)).padStart(6)} 上涨 ${String(grows).padStart(2)}/30 fam行 max ${Math.max(...g.map((x) => x.famLines))} 可见字 中位 ${st(g.map((x) => x.visibleChars))['p50']} 溢出 ${Math.max(...g.map((x) => x.mainOverflowX))}/${Math.max(...g.map((x) => x.rowOverflowX))} 被截 ${g.filter((x) => x.clamped).length}/30`);
  }
  console.log('  逐案 Δrow(l2-base)：' + base.map((x, i) => x.id + (all[vpl + ':l2'][i].rowH - x.rowH >= 0 ? '+' : '') + (all[vpl + ':l2'][i].rowH - x.rowH).toFixed(1)).join(' '));
  console.log('  逐案 Δrow(l3-base)：' + base.map((x, i) => x.id + (all[vpl + ':l3'][i].rowH - x.rowH >= 0 ? '+' : '') + (all[vpl + ':l3'][i].rowH - x.rowH).toFixed(1)).join(' '));
  console.log('  逐案可见字(l2)：' + all[vpl + ':l2'].map((x) => x.id + ':' + x.visibleChars + '/' + x.totalChars).join(' '));
}
console.log('\n全文总字数 ' + B.reduce((a, r) => a + (r.family || '').length, 0));
for (const vpl of ['1440', '390']) {
  for (const mode of ['base', 'l2']) {
    console.log(`  ${vpl} ${mode} 30 案合计可见 ${all[vpl + ':' + mode].reduce((a, x) => a + x.visibleChars, 0)} 字`);
  }
}
