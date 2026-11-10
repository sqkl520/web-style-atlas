// m14-rail.mjs — rail 337.6px 与页头 488.6px 的构成拆解（390）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
const d = await p.eval(() => {
  const rel = (el, base) => { const b = el.getBoundingClientRect(), r0 = base.getBoundingClientRect(); return { top: +(b.top - r0.top).toFixed(1), h: +b.height.toFixed(1) }; };
  const rail = document.querySelector('.rail');
  const mast = document.querySelector('.mast');
  const bar = document.querySelector('.bar');
  const railKids = Array.from(rail.children).map((el) => ({
    tag: el.tagName, cls: (el.className || '').toString().slice(0, 26),
    ...rel(el, rail), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
  }));
  const blocks = Array.from(rail.querySelectorAll('.rail-block')).map((el) => {
    const h2 = el.querySelector('h2');
    return { label: h2 ? h2.textContent.trim() : '?', ...rel(el, rail), chips: el.querySelectorAll('.chips button').length };
  });
  const barKids = Array.from(bar.children).map((el) => ({ cls: (el.className || '').toString().slice(0, 22), ...rel(el, bar) }));
  return {
    rail: { h: +rail.getBoundingClientRect().height.toFixed(1), scrollH: rail.scrollHeight, clientH: rail.clientHeight, maxH: getComputedStyle(rail).maxHeight, pad: getComputedStyle(rail).padding },
    railKids, blocks, barKids,
    mastH: +mast.getBoundingClientRect().height.toFixed(1),
    barH: +bar.getBoundingClientRect().height.toFixed(1),
  };
});
console.log(JSON.stringify(d, null, 1));
writeFileSync(join(HERE, 'data-m14-rail.json'), JSON.stringify(d, null, 1));
await p.close();
await browser.close();
