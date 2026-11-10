import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
await page.eval(() => { location.hash = '#S01'; });
await sleep(600);
console.log('AFTER (natural):', JSON.stringify(await page.eval(() => {
  const d = document.getElementById('detail');
  const dr = d.getBoundingClientRect();
  const rel = (el) => el ? { top: +(el.getBoundingClientRect().top - dr.top + d.scrollTop).toFixed(1), h: +el.getBoundingClientRect().height.toFixed(1) } : null;
  return { viewer: rel(document.querySelector('#d-body .viewer')), folds: [...document.querySelectorAll('#d-body details')].map(x => ({ cls: x.className, open: x.open, ...rel(x) })) };
}), null, 1));
await page.eval(() => {
  const st = document.createElement('style'); st.id='__b';
  st.textContent = '.viewer-stage{max-height:62vh !important}.viewer{margin-bottom:22px !important}.open-proto{margin-bottom:20px !important}.fold{margin:0 !important;border-top:none !important}.fold > summary{display:none !important}.fold > .fold-body{padding:0 !important}.fold > .fold-body > .parts{border-top:2px solid var(--ink) !important;margin-bottom:18px !important}.fold > .fold-body > .gate-box{margin-bottom:20px !important}';
  document.head.appendChild(st);
  document.querySelectorAll('#d-body details').forEach(x => { if (x.classList.contains('fold')) x.open = true; });
  document.getElementById('detail').scrollTop = 0;
});
await sleep(300);
console.log('BEFORE (reconstruct):', JSON.stringify(await page.eval(() => {
  const d = document.getElementById('detail');
  const dr = d.getBoundingClientRect();
  const rel = (el) => el ? { top: +(el.getBoundingClientRect().top - dr.top + d.scrollTop).toFixed(1), h: +el.getBoundingClientRect().height.toFixed(1) } : null;
  return { viewer: rel(document.querySelector('#d-body .viewer')), blocks: [...document.querySelectorAll('#d-body > *')].map(x => ({ cls: x.className, ...rel(x) })) };
}), null, 1));
await page.close(); await browser.close(); await srv.close();
