// m20-determinism.mjs — 复现性：同一视口连测 3 轮，检查 scrollHeight 抖动；并核对 fonts.ready
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  out[vp.k] = [];
  for (let round = 0; round < 3; round++) {
    const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
    await p.goto(PAGE, { settleMs: 1600 });
    const fr = await p.eval(() => document.fonts.ready.then(() => document.fonts.status));
    const vals = {};
    for (const id of ['S01', 'S13', 'S29']) {
      await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
      await new Promise((r) => setTimeout(r, 200));
      vals[id] = await p.eval(() => document.getElementById('detail').scrollHeight);
    }
    out[vp.k].push({ round, fonts: fr, vals });
    await p.close();
  }
  console.log(`[${vp.k}] ` + out[vp.k].map((r) => `r${r.round}:${r.fonts} S01=${r.vals.S01} S13=${r.vals.S13} S29=${r.vals.S29}`).join(' | '));
}
writeFileSync(join(HERE, 'data-m20-determinism.json'), JSON.stringify(out, null, 1));
await browser.close();
