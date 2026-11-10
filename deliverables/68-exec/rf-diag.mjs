// 诊断：为什么首卡 top 比任务书基线高？逐块 dump 卡片以上的高度构成。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const server = await serve(ROOT, 8403);
const url = server.url + '/prototypes/_selection/index.html';

const DUMP = () => {
  const rc = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; };
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  const rows = [...document.querySelectorAll('.row')];
  const main = document.querySelector('.main') || document.querySelector('main');
  const kids = (e) => e ? [...e.children].map((c) => ({ el: desc(c), ...rc(c), open: c.tagName === 'DETAILS' ? c.open : undefined })) : [];
  const mast = document.querySelector('.mast');
  const rail = document.querySelector('.rail');
  const bar = document.querySelector('.bar');
  const ledger = document.querySelector('.ledger');
  const detail = document.querySelector('#detail');
  return {
    vw: innerWidth, vh: innerHeight,
    docH: document.documentElement.scrollHeight,
    bodyKids: kids(document.body),
    mainKids: kids(main),
    rowCount: rows.length,
    firstRow: rows.length ? { ...rc(rows[0]), id: rows[0].dataset.id } : null,
    secondRow: rows.length > 1 ? { ...rc(rows[1]), id: rows[1].dataset.id } : null,
    mast: rc(mast), mastKids: kids(mast),
    mastIdKids: kids(document.querySelector('.mast-id')),
    mastFold: (() => { const d = document.querySelector('#mast-fold'); return d ? { open: d.open, ...rc(d) } : null; })(),
    mastFacts: (() => { const d = document.querySelector('#facts'); return d ? { ...rc(d), cs: getComputedStyle(d).borderTopWidth } : null; })(),
    rail: rail ? { ...rc(rail), open: document.querySelector('#rail-fold')?.open } : null,
    bar: bar ? { ...rc(bar), open: document.querySelector('#bar-fold')?.open } : null,
    ledger: rc(ledger),
    detailHidden: detail ? detail.hidden : null,
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ':' + f.weight).slice(0, 12),
    fontCount: [...document.fonts].length,
    bodyFont: getComputedStyle(document.body).fontFamily,
    h1: (() => { const h = document.querySelector('h1'); return h ? { size: getComputedStyle(h).fontSize, ...rc(h) } : null; })(),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
  const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
  await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
  await page.goto(url, { settleMs: 2000 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
  const d = await page.eval(DUMP);
  console.log('\n===== ' + vp.w + 'x' + vp.h + ' =====');
  console.log(JSON.stringify(d, null, 1));
  await page.close();
}
await browser.close().catch(() => {});
server.server.close();
