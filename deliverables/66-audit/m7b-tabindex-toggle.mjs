// m7b-tabindex-toggle.mjs — 展开「还有 28 个只有近似的」之后重新数 Tab
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const COUNT = () => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const all = Array.from(document.querySelectorAll(sel)).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const p = el.closest('details:not([open])');
    if (p && !(p.querySelector(':scope > summary') || p).contains(el)) return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  });
  const detail = document.querySelector('#detail');
  const idx = all.findIndex((el) => detail.contains(el));
  return { total: all.length, firstInsideDetail: idx >= 0 ? idx + 1 : null, rail: all.filter((e) => e.closest('.rail')).length };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); if (r) r.click(); });
await new Promise((r) => setTimeout(r, 250));
out.collapsed = await p.eval(COUNT);
// 点开「还有 28 个只有近似的」
const clicked = await p.eval(() => {
  const b = document.querySelector('.scene-toggle');
  if (!b) return false;
  b.click();
  return true;
});
await new Promise((r) => setTimeout(r, 400));
out.expandedScenes = await p.eval(COUNT);
out.clickedToggle = clicked;
// 再把所有 details 展开
await p.eval(() => document.querySelectorAll('#detail details').forEach((d) => { d.open = true; }));
await new Promise((r) => setTimeout(r, 300));
out.allDetailsOpen = await p.eval(COUNT);
console.log(JSON.stringify(out, null, 1));
writeFileSync(join(HERE, 'data-m7b-tabindex.json'), JSON.stringify(out, null, 1));
await browser.close();
