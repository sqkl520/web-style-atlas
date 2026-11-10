// p-1440.mjs — 1440×900 复核：当前树的折叠条是否在桌面档溢出/挤压，以及 R2 排版在桌面的影响
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const PROBE = () => {
  const d = document.getElementById('detail');
  const dl = d.querySelector('#d-body .fields');
  const cs = getComputedStyle;
  const sums = Array.from(dl.querySelectorAll('.field-long summary'));
  const overflow = sums.map((s) => ({
    h: +s.getBoundingClientRect().height.toFixed(1),
    scrollW: s.scrollWidth, clientW: s.clientWidth,
    over: s.scrollWidth - s.clientWidth,
  }));
  const dd = dl.querySelector('.field:not(.field-fold) dd');
  return {
    scrollH: d.scrollHeight, clientW: d.clientWidth,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    ddW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    ddLh: dd ? cs(dd).lineHeight : null,
    sumMaxOverflow: Math.max(0, ...overflow.map((x) => x.over)),
    sumHeights: overflow.map((x) => x.h),
    overX: d.scrollWidth - d.clientWidth,
    details: d.querySelectorAll('#d-body details').length,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1400 });
  const arr = [];
  for (const id of IDS) {
    await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
    await new Promise((r) => setTimeout(r, 110));
    arr.push(await p.eval(PROBE));
  }
  const sh = arr.map((x) => x.scrollH);
  out[vp.k] = {
    min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(sh.reduce((a, b) => a + b, 0) / sh.length),
    screensMax: Math.max(...arr.map((x) => x.screens)),
    ddW: arr[0].ddW, ddLh: arr[0].ddLh,
    sumMaxOverflow: Math.max(...arr.map((x) => x.sumMaxOverflow)),
    sumH: [...new Set(arr.flatMap((x) => x.sumHeights))].sort((a, b) => a - b),
    overX: Math.max(...arr.map((x) => x.overX)),
    details: arr[0].details,
  };
  console.log(vp.k, JSON.stringify(out[vp.k]));
  await p.close();
}
writeFileSync(join(HERE, 'data-1440.json'), JSON.stringify(out, null, 1));
await browser.close();
