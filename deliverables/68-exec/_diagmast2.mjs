// What grew inside .mast-id at 1440? Compare HEAD version vs working tree.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();

const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
await sleep(500);
const info = await page.eval(() => {
  const walk = (el, d = 0) => {
    const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const out = [{ d, tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), h: +b.height.toFixed(1), top: +b.top.toFixed(1), fs: cs.fontSize, lh: cs.lineHeight, disp: cs.display }];
    if (d < 3) for (const c of el.children) out.push(...walk(c, d + 1));
    return out;
  };
  const mast = document.querySelector('.mast');
  const id = document.querySelector('.mast-id');
  const h1 = document.querySelector('h1');
  return {
    mast: walk(mast),
    h1: { fs: getComputedStyle(h1).fontSize, h: +h1.getBoundingClientRect().height.toFixed(1), lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)), w: +h1.getBoundingClientRect().width.toFixed(1), maxW: getComputedStyle(h1).maxWidth },
    label: (() => { const l = document.querySelector('.mast-label') || document.querySelector('.mast-kicker'); return l ? { cls: l.className, fs: getComputedStyle(l).fontSize, h: +l.getBoundingClientRect().height.toFixed(1) } : null; })(),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close(); server.close();
