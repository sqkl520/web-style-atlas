// 校准：确认 innerHeight、字体就绪、以及 complete 计数口径；并测 mast 抖动来源。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const server = await serve(ROOT, 8407);
const url = server.url + '/prototypes/_selection/index.html';

const M = () => {
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')].map(rc);
  const vh = innerHeight;
  const parts = {};
  for (const s of ['.mast', '.mast-label', 'h1', '.mast-wizard', '#mast-fold', '.mast-claim', '.mast-exit', '#self-gate', '#facts']) {
    const e = document.querySelector(s); parts[s] = e ? rc(e) : null;
  }
  return {
    innerHeight: vh, innerWidth: innerWidth, dpr: devicePixelRatio, scrollY,
    complete: rows.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    total: rows.length, first: rows[0], last: rows[rows.length - 1],
    parts,
    fontsStatus: document.fonts.status,
    loadedFams: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))],
    h1Lines: Math.round(document.querySelector('h1').getBoundingClientRect().height / (parseFloat(getComputedStyle(document.querySelector('h1')).fontSize) * 1.14)),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.goto(url, { settleMs: 1500 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
for (const t of [0, 1500, 3000, 6000]) {
  if (t) await new Promise((r) => setTimeout(r, t === 1500 ? 1500 : t === 3000 ? 1500 : 3000));
  const m = await page.eval(M);
  console.log(`\n[t+${t}ms] vh=${m.innerHeight} vw=${m.innerWidth} dpr=${m.dpr} fonts=${m.fontsStatus} h1Lines=${m.h1Lines}`);
  console.log(`  complete=${m.complete}/${m.total} first=${m.first.top}/${m.first.h} bottom=${m.first.bottom}`);
  for (const [k, v] of Object.entries(m.parts)) if (v) console.log(`    ${k.padEnd(14)} top=${String(v.top).padStart(7)} h=${String(v.h).padStart(6)}`);
}
await browser.close().catch(() => {});
server.server.close();
