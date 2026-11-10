// How much did the LIVE page move while this audit ran?
// A concurrent agent is adding a "prompt fill" form into the detail preamble. This measures
// the live repo (not the snapshot) so the lead knows what the recommendation will land on.
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const LAB = resolve('deliverables/65-audit/lab');
// no overrides: serve the live repo
const srv = await startLabServer({ root: resolve('.'), labDir: join(LAB, 'variants'), overrides: [] });
const browser = await Browser.launch();
const out = {};

for (const c of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
  const page = await browser.newPage({ width: c.w, height: c.h, mobile: c.mobile });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval(() => document.querySelector('.row[data-id="S15"]').click());
  await sleep(900);
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
  await sleep(250);
  out[c.k] = await page.eval(() => {
    const d = document.getElementById('detail');
    const dRect = d.getBoundingClientRect();
    const headH = document.querySelector('.detail-head').getBoundingClientRect().height;
    const H = d.clientHeight;
    const top = (el) => +(el.getBoundingClientRect().top - dRect.top + d.scrollTop).toFixed(1);
    const kids = [...document.getElementById('d-body').children].map((el) => ({
      cls: String(el.className || el.tagName).split(' ')[0], top: top(el), h: +el.getBoundingClientRect().height.toFixed(1),
    }));
    const firstField = document.querySelector('#d-body .field');
    return {
      H, headH: +headH.toFixed(1), contentH: d.scrollHeight,
      screens: +(d.scrollHeight / H).toFixed(2),
      firstFieldTop: firstField ? top(firstField) : null,
      preambleHeight: firstField ? top(firstField) - headH : null,
      preambleShare: firstField ? +((top(firstField) - headH) / (H - headH) * 100).toFixed(1) : null,
      fields: document.querySelectorAll('#d-body .field').length,
      kids,
      hasPromptFill: !!document.querySelector('.prompt-fill, .prompt-f'),
    };
  });
  await page.close();
}
console.log(JSON.stringify(out, null, 2));
await browser.close();
await srv.close();
