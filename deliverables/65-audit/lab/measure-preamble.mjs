// What occupies the panel before the first field? (the reason folding fields alone cannot help)
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const LAB = resolve('deliverables/65-audit/lab');
const srv = await startLabServer({
  root: resolve('.'), labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();
const out = {};

for (const c of [
  { k: 'desktop', w: 1440, h: 900, mobile: false },
  { k: 'mobile', w: 390, h: 844, mobile: true },
]) {
  const page = await browser.newPage({ width: c.w, height: c.h, mobile: c.mobile });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 900 });
  await page.eval(() => document.querySelector('.row[data-id="S15"]').click());
  await sleep(900);
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  out[c.k] = await page.eval(() => {
    const d = document.getElementById('detail');
    const dRect = d.getBoundingClientRect();
    const headH = document.querySelector('.detail-head').getBoundingClientRect().height;
    const H = d.clientHeight;
    const top = (el) => +(el.getBoundingClientRect().top - dRect.top + d.scrollTop).toFixed(1);
    const inner = (sel) => [...document.querySelectorAll(sel)].map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').split(' ')[0],
      top: top(el),
      h: +el.getBoundingClientRect().height.toFixed(1),
      text: (el.textContent || '').trim().slice(0, 46),
    }));
    // every direct child of the body, plus the inner pieces of the preamble
    const bodyKids = [...document.getElementById('d-body').children].map((el) => ({
      cls: String(el.className || el.tagName).split(' ')[0],
      top: top(el),
      h: +el.getBoundingClientRect().height.toFixed(1),
    }));
    const firstField = document.querySelector('#d-body .field');
    const viewer = document.querySelector('.viewer');
    return {
      H, headH: +headH.toFixed(1),
      bodyKids,
      preamble: bodyKids.filter((b) => b.cls !== 'fields'),
      preambleHeight: firstField ? top(firstField) : null,
      preambleShareOfFirstScreen: firstField ? +((top(firstField) - headH) / (H - headH) * 100).toFixed(1) : null,
      viewerParts: viewer ? [...viewer.children].map((el) => ({
        cls: String(el.className).split(' ')[0], h: +el.getBoundingClientRect().height.toFixed(1),
      })) : [],
      partsItems: inner('.parts li'),
      viewerStage: viewer ? +viewer.querySelector('.viewer-stage').getBoundingClientRect().height.toFixed(1) : 0,
      viewerStrip: viewer ? +viewer.querySelector('.viewer-strip').getBoundingClientRect().height.toFixed(1) : 0,
      promptCta: inner('.prompt-cta'),
      gateBox: inner('.gate-box'),
    };
  });
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
await srv.close();
