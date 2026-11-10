// 稳定性复测：同一状态连开 3 次新页，看 mast / self-gate / 首卡 top 是否有抖动；
// 并 dump #self-gate 的实际文本（它是别人新增的异步注入块）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const server = await serve(ROOT, 8408);
const url = server.url + '/prototypes/_selection/index.html';

const M = () => {
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')].map((e) => e.getBoundingClientRect());
  const vh = innerHeight;
  const sg = document.querySelector('#self-gate');
  return {
    vh,
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    foldH: +document.querySelector('#mast-fold').getBoundingClientRect().height.toFixed(1),
    sgH: sg ? +sg.getBoundingClientRect().height.toFixed(1) : null,
    sgText: sg ? sg.textContent.trim().slice(0, 120) : null,
    sgWrap: sg ? sg.getClientRects().length : null,
    firstTop: +rows[0].top.toFixed(1), firstH: +rows[0].height.toFixed(1),
    complete: [...rows].filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
for (let i = 1; i <= 3; i++) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(url, { settleMs: 2500 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  const m = await page.eval(M);
  console.log(`\n[load ${i}] mast=${m.mastH} fold=${m.foldH} self-gate=${m.sgH} (lines≈${m.sgWrap}) first=${m.firstTop}/${m.firstH} complete=${m.complete}`);
  console.log(`  self-gate text: ${m.sgText}`);
  await page.close();
}
await browser.close().catch(() => {});
server.server.close();
