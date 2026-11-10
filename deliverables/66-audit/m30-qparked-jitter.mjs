// m30-qparked-jitter.mjs — #q-parked 导致的布局抖动：同一视口多次加载，量 bar 高度与首卡 top
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }]) {
  out[vp.k] = [];
  for (let i = 0; i < 6; i++) {
    const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
    await p.goto(PAGE, { settleMs: 1200 + i * 200 });
    const m = await p.eval(() => {
      const qp = document.getElementById('q-parked');
      const bar = document.querySelector('.bar');
      return {
        barH: +bar.getBoundingClientRect().height.toFixed(1),
        qp: qp ? { h: +qp.getBoundingClientRect().height.toFixed(1), top: +qp.getBoundingClientRect().top.toFixed(1), disp: getComputedStyle(qp).display, hidden: qp.hidden } : null,
        firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
        fonts: document.fonts.status,
      };
    });
    m.settle = 1200 + i * 200;
    out[vp.k].push(m);
    console.log(`run${i} settle=${m.settle}ms bar=${m.barH} qp=${JSON.stringify(m.qp)} 首卡=${m.firstRowTop} fonts=${m.fonts}`);
    await p.close();
  }
}
writeFileSync(join(HERE, 'data-m30-jitter.json'), JSON.stringify(out, null, 1));
await browser.close();
