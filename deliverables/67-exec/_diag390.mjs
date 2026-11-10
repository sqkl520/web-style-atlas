// _diag390.mjs — 改后源码在 390 档的逐元素账：页头 / 工具条 / 首卡内部，找那 26.7px 的缺口
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(SRC, { settleMs: 1800 });
const r = await p.eval(() => {
  const box = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; };
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  const pick = (root, sels) => sels.map((s) => { const e = root.querySelector(s); return e ? { sel: s, ...box(e), display: getComputedStyle(e).display } : { sel: s, missing: true }; });
  const mast = document.querySelector('.mast');
  const bar = document.querySelector('.bar');
  const row = document.querySelector('.row');
  const rt = row.getBoundingClientRect().top;
  const rel = (e) => { const b = e.getBoundingClientRect(); return { top: +(b.top - rt).toFixed(1), h: +b.height.toFixed(1) }; };
  const rowParts = {};
  for (const s of ['.no', '.row-main', '.row-head', '.row-head h3', '.row-def', '.row-meta', '.row-family', '.swatches', '.shots', '.shots .shot:first-child', '.shots .shot:first-child img', '.shots figcaption', '.row-foot']) {
    const e = row.querySelector(s); if (e) rowParts[s] = rel(e);
  }
  return {
    mast: box(mast), mastParts: pick(mast, ['.mast-kicker', 'h1', '.mast-wizard', '.mast-wizard a', '.mast-fold', '.mast-fold-sum', '.mast-facts', '.mast-facts > div', '.mast-facts dt', '.mast-facts dd']),
    rail: box(document.querySelector('.rail')),
    bar: box(bar), barParts: pick(bar, ['.search', '.search input', '.count', '.bar-fold', '.bar-fold-sum']),
    ledger: box(document.querySelector('.ledger')),
    row: box(row), rowParts,
    mainPad: getComputedStyle(document.querySelector('.main')).padding,
  };
});
console.log(JSON.stringify(r, null, 1));
await p.close();
await browser.close();
