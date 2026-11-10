// _func.mjs — 功能回归：芯片筛选、搜索、排序、清空、首字折叠展开后交互，全部在折叠结构内
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m, reducedMotion: true });
  const errs = [];
  await p.goto(SRC, { settleMs: 1600 });

  // 1) 芯片筛选（rail 折叠态也能点：先展开）
  out[vp.k] = {};
  out[vp.k].chip = await p.eval(() => {
    document.getElementById('rail-fold').open = true;
    const btn = [...document.querySelectorAll('#flt-scene button')].find((b) => b.textContent.includes('咖啡店'));
    btn.click();
    const rows = document.querySelectorAll('.row').length;
    const count = document.getElementById('count').textContent.trim();
    const tpl = !document.getElementById('tpl-strip').hidden;
    btn.click();
    return { rowsAfterClick: rows, countText: count, tplStripShown: tpl, rowsRestored: document.querySelectorAll('.row').length };
  });

  // 2) 排序（bar 折叠内）
  out[vp.k].sort = await p.eval(() => {
    document.getElementById('bar-fold').open = true;
    const sel = document.getElementById('sort');
    const firstBefore = document.querySelector('.row').getAttribute('data-id');
    sel.value = 'gate';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const firstAfter = document.querySelector('.row').getAttribute('data-id');
    const visible = document.getElementById('bar-fold').open;
    sel.value = 'n';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { firstBefore, firstAfter, selectVisibleWhenOpen: visible, restored: document.querySelector('.row').getAttribute('data-id') };
  });

  // 3) 搜索
  out[vp.k].search = await p.eval(() => {
    const q = document.getElementById('q');
    q.value = 'S07';
    q.dispatchEvent(new Event('input', { bubbles: true }));
    return { rows: document.querySelectorAll('.row').length, count: document.getElementById('count').textContent.trim() };
  });

  // 4) 清空（bar 折叠内的 #reset）
  out[vp.k].reset = await p.eval(() => {
    const r = document.getElementById('reset');
    r.click();
    return { rows: document.querySelectorAll('.row').length, count: document.getElementById('count').textContent.trim(),
      q: document.getElementById('q').value };
  });

  // 5) 展开块里的元素尺寸（可点性）
  out[vp.k].sizes = await p.eval(() => {
    for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) document.getElementById(id).open = true;
    const g = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    return { sort: g('#sort'), reset: g('#reset'), search: g('#q'), chip: g('#flt-scene button'),
      exitLink: g('.mast-exit a'), wizard: g('.mast-wizard a'), summaryMast: g('.mast-fold-sum'),
      summaryRail: g('.rail-fold-sum'), summaryBar: g('.bar-fold-sum') };
  });

  out[vp.k].jsErrors = p.consoleErrors.slice();
  console.log(`\n[${vp.k}]`);
  console.log('  chip  :', JSON.stringify(out[vp.k].chip));
  console.log('  sort  :', JSON.stringify(out[vp.k].sort));
  console.log('  search:', JSON.stringify(out[vp.k].search));
  console.log('  reset :', JSON.stringify(out[vp.k].reset));
  console.log('  sizes :', JSON.stringify(out[vp.k].sizes));
  console.log('  errors:', out[vp.k].jsErrors.length ? out[vp.k].jsErrors : 'none');
  await p.close();
}
await browser.close();
