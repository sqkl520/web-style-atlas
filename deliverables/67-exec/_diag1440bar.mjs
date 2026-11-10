// _diag1440bar.mjs — 1440 档 .bar 为什么还是 93px（display:contents 到底生效了没）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 1440, height: 900 });
await p.goto(SRC, { settleMs: 1600 });
const r = await p.eval(() => {
  const bar = document.querySelector('.bar');
  const bf = document.getElementById('bar-fold');
  const cs = getComputedStyle(bf);
  const items = [...bar.children].map((e) => {
    const b = e.getBoundingClientRect();
    return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + e.className : ''),
      display: getComputedStyle(e).display, top: +b.top.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) };
  });
  const kids = [...bf.children].map((e) => {
    const b = e.getBoundingClientRect();
    return { el: e.tagName.toLowerCase() + (e.className ? '.' + e.className : ''),
      display: getComputedStyle(e).display, top: +b.top.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) };
  });
  return { barH: +bar.getBoundingClientRect().height.toFixed(1), barDisplay: getComputedStyle(bar).display,
    barFold: { display: cs.display, open: bf.open, h: +bf.getBoundingClientRect().height.toFixed(1), w: +bf.getBoundingClientRect().width.toFixed(1) },
    items, kids,
    mq981: matchMedia('(min-width: 981px)').matches };
});
console.log(JSON.stringify(r, null, 1));
await p.close();
await browser.close();
