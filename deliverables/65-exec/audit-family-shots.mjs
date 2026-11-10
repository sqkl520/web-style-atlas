// 任务 4 视觉判据：把三种候选形态各截一张行卡，直接看，不只看数字。
import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
import { readFileSync } from 'node:fs';

const OUT = resolve('deliverables/65-exec/shots-family');
mkdirSync(OUT, { recursive: true });

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const famMap = Object.fromEntries(B.map((r) => [r.id, r.family || '']));

const apply = (arg) => {
  const { mode, map } = arg;
  let st = document.getElementById('__probe_style');
  if (!st) { st = document.createElement('style'); st.id = '__probe_style'; document.head.appendChild(st); }
  const base = '.row-family{color:var(--ink-2)}';
  const v2 = '.row-family{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1 1 100%;min-width:0;line-height:1.5}';
  const v3 = '.row-family{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;flex:1 1 100%;min-width:0}';
  st.textContent = base + (mode === 'base' ? '' : mode === 'v2' ? v2 : v3);
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const el = row.querySelector('.row-family');
    if (!el) continue;
    el.textContent = mode === 'base' ? (map[id] || '').split('。')[0].split('：').pop().slice(0, 34) : (map[id] || '');
  }
  return true;
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
try {
  for (const vp of [{ l: '1440', w: 1440, h: 900 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    for (const mode of ['base', 'v2', 'v3']) {
      await page.eval(apply, { mode, map: famMap });
      await sleep(400);
      // 把 S13 / S15 滚到视口顶部，截三行做对照
      const clip = await page.eval(() => {
        const rows = [...document.querySelectorAll('.row')];
        const a = rows[12], b = rows[15];
        window.scrollTo(0, a.getBoundingClientRect().top + window.scrollY - 8);
        return null;
      });
      await sleep(300);
      // clip 用的是**页面坐标**（含滚动量），不是视口坐标 —— 第一版直接用
      // getBoundingClientRect 的值，三张截图的字节数完全相同，说明截的是同一块空区。
      const box = await page.eval(() => {
        const rows = [...document.querySelectorAll('.row')];
        const a = rows[12].getBoundingClientRect(), b = rows[15].getBoundingClientRect();
        const y = a.top + window.scrollY - 8;
        return { y, h: b.bottom + window.scrollY - y, x: 0, w: innerWidth };
      });
      await page.screenshot({
        path: join(OUT, `${vp.l}-${mode}.jpg`),
        quality: 88,
        clip: { x: box.x, y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h), scale: 1 },
      });
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log('wrote ' + OUT);
