// 最终归因：1440 首卡 top 从 407 → 471.7 是谁造成的。
// 三态：现状 / 隐藏 #self-gate / 隐藏 #self-gate + 强制 row-family 13px
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const server = await serve(ROOT, 8406);
const url = server.url + '/prototypes/_selection/index.html';

const M = () => {
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1) }; };
  const g = (s) => { const e = document.querySelector(s); return e ? rc(e) : null; };
  const rows = [...document.querySelectorAll('.row')].map((e) => rc(e));
  const vh = innerHeight;
  return {
    mast: g('.mast'), mastId: g('.mast-id'), h1: g('h1'), fold: g('#mast-fold'),
    selfGate: g('#self-gate'), facts: g('#facts'),
    rail: g('.rail'), bar: g('.bar'), ledger: g('.ledger'),
    firstTop: rows[0]?.top, firstH: rows[0]?.h,
    complete: rows.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
  };
};

const cases = [
  { k: 'A 现状', css: '' },
  { k: 'B 隐藏#self-gate', css: '#self-gate{display:none!important}' },
  { k: 'C B+强制13px', css: '#self-gate{display:none!important}.row-family{font-size:13px!important;line-height:1.5!important}' },
];
const browser = await Browser.launch({ width: 1440, height: 900 });
for (const c of cases) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(url, { settleMs: 1500 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  if (c.css) await page.eval(`(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(c.css)}; document.head.appendChild(s); return true; })()`);
  await new Promise((r) => setTimeout(r, 700));
  const m = await page.eval(M);
  console.log(`\n[${c.k}]`);
  console.log(`  首卡 top=${m.firstTop} h=${m.firstH} 完整=${m.complete}`);
  console.log(`  mast=${m.mast.h} (mast-id=${m.mastId.h} h1=${m.h1.h} fold=${m.fold?.h ?? '-'} facts=${m.facts.h} self-gate=${m.selfGate ? m.selfGate.h : 'hidden'})`);
  console.log(`  rail=${m.rail.h} bar=${m.bar.h} ledger.top=${m.ledger.top}`);
  await page.close();
}
await browser.close().catch(() => {});
server.server.close();
