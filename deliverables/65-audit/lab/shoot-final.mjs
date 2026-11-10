// Final, evenly-named screenshot set for the report.
// Names: <viewport>-<scheme>-<variant>-fold.jpg / -s1.jpg ...
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const LAB = resolve('deliverables/65-audit/lab');
const SHOTS = resolve('deliverables/65-audit/shots');
mkdirSync(SHOTS, { recursive: true });
for (const f of readdirSync(SHOTS)) if (/\.jpg$/.test(f)) unlinkSync(join(SHOTS, f));

const VARIANTS = ['base', 'jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren'];
const srv = await startLabServer({
  root: resolve('.'), labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();
const index = [];

for (const variant of VARIANTS) {
  for (const c of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    // only the full walk for the interesting ones; single fold shot for the rest
    const full = ['base', 'ren'].includes(variant);
    const scheme = 'S15';
    const page = await browser.newPage({ width: c.w, height: c.h, dsf: 1, mobile: c.mobile });
    const qs = variant === 'base' ? '' : '?lab=' + variant;
    await page.goto(srv.origin + '/prototypes/_selection/index.html' + qs, { settleMs: 900 });
    await page.eval((s) => document.querySelector('.row[data-id="' + s + '"]').click(), scheme);
    await sleep(800);
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
    await sleep(250);

    const m = await page.eval(() => {
      const d = document.getElementById('detail');
      const r = d.getBoundingClientRect();
      const headH = document.querySelector('.detail-head').getBoundingClientRect().height;
      return {
        clientH: d.clientHeight, contentH: d.scrollHeight, headH: +headH.toFixed(1),
        panelX: +r.x.toFixed(1), panelW: +r.width.toFixed(1),
        maxScroll: d.scrollHeight - d.clientHeight,
      };
    });

    const clip = c.k === 'desktop'
      ? { x: m.panelX, y: 0, width: Math.round(m.panelW), height: c.h, scale: 1 }
      : { x: 0, y: 0, width: c.w, height: c.h, scale: 1 };

    const stops = [0];
    if (full) {
      const step = Math.round(m.clientH - m.headH);
      for (let s = step; s < m.maxScroll; s += step) stops.push(s);
      stops.push(m.maxScroll);
    }
    for (let k = 0; k < stops.length; k++) {
      await page.eval((t) => { document.getElementById('detail').scrollTop = t; return document.getElementById('detail').scrollTop; }, stops[k]);
      await sleep(200);
      const name = `${c.k}-${c.w}-${scheme}-${variant}-${k === 0 ? 'fold' : 's' + k}.jpg`;
      const path = join(SHOTS, name);
      await page.screenshot({ path, quality: 82, clip });
      index.push({ file: 'deliverables/65-audit/shots/' + name, variant, viewport: c.k, scheme, scrollTop: stops[k], contentH: m.contentH, clientH: m.clientH });
    }
    console.log(`${variant.padEnd(5)} ${c.k.padEnd(7)} contentH=${m.contentH} shots=${stops.length}`);
    await page.close();
  }
}

// S08 fold shots for base vs ren (second-longest scheme)
for (const variant of ['base', 'ren']) {
  const c = { k: 'desktop', w: 1440, h: 900 };
  const page = await browser.newPage({ width: c.w, height: c.h });
  const qs = variant === 'base' ? '' : '?lab=' + variant;
  await page.goto(srv.origin + '/prototypes/_selection/index.html' + qs, { settleMs: 900 });
  await page.eval(() => document.querySelector('.row[data-id="S08"]').click());
  await sleep(800);
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
  await sleep(250);
  const m = await page.eval(() => {
    const d = document.getElementById('detail'); const r = d.getBoundingClientRect();
    return { x: +r.x.toFixed(1), w: +r.width.toFixed(1), contentH: d.scrollHeight };
  });
  const name = `desktop-1440-S08-${variant}-fold.jpg`;
  await page.screenshot({ path: join(SHOTS, name), quality: 82, clip: { x: m.x, y: 0, width: Math.round(m.w), height: 900, scale: 1 } });
  index.push({ file: 'deliverables/65-audit/shots/' + name, variant, viewport: 'desktop', scheme: 'S08', scrollTop: 0, contentH: m.contentH });
  console.log(`${variant.padEnd(5)} S08 fold`);
  await page.close();
}

import { writeFileSync } from 'node:fs';
writeFileSync(join(LAB, 'shots-index.json'), JSON.stringify(index, null, 2));
await browser.close();
await srv.close();
