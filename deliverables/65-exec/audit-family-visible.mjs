// 补测：clamp=1 / 2 / 3 下 30 案「可见字数」的合计（报告表格要用，必须是实测值）。
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const apply = (n) => {
  let st = document.getElementById('__probe_style');
  if (!st) { st = document.createElement('style'); st.id = '__probe_style'; document.head.appendChild(st); }
  st.textContent = `.row-family{display:-webkit-box;-webkit-line-clamp:${n};-webkit-box-orient:vertical;overflow:hidden;flex:1 1 100%;min-width:0;line-height:1.5}`;
  return true;
};

const probe = () => {
  let sum = 0, rows = 0, grown = 0;
  const base = [...document.querySelectorAll('.row')].map((r) => r.getBoundingClientRect().height);
  for (const row of [...document.querySelectorAll('.row')]) {
    const fam = row.querySelector('.row-family');
    const fr = fam.getBoundingClientRect();
    const walker = document.createTreeWalker(fam, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode();
    if (!node) continue;
    const range = document.createRange();
    let n = 0;
    for (let i = 0; i < node.nodeValue.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.bottom <= fr.bottom + 0.5 && r.top >= fr.top - 0.5) n++;
    }
    sum += n;
  }
  rows = base.length;
  return { sum, rows, totalH: [...document.querySelectorAll('.row')].reduce((a, r) => a + r.getBoundingClientRect().height, 0) };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
try {
  for (const vp of [{ l: '1440', w: 1440, h: 900 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1300 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(500);
    for (const n of [1, 2, 3]) {
      await page.eval(apply, n);
      await sleep(360);
      const r = await page.eval(probe);
      console.log(`${vp.l} clamp=${n}: 可见字数合计 ${r.sum} / 30 案，行总高 ${r.totalH.toFixed(0)}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
