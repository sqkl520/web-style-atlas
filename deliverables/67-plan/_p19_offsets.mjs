// _p19_offsets.mjs — 任务书写「首字段=639px」（S01/S13/S26）、682（S15）、618（S30）。
// 我在 HEAD 上量到 627.5 / 669.6 / 606.4 —— 差恒为 ~11.5px。查这个偏移是谁。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const FROZEN = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');
const LIVE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const d = document.getElementById('detail');
  const dr = d.getBoundingClientRect();
  const f = document.querySelector('#d-body .fields > .field');
  const fb = f.getBoundingClientRect();
  const dl = document.querySelector('#d-body .fields');
  return {
    scrollTop: d.scrollTop,
    firstFieldTopNoScroll: +(fb.top - dr.top).toFixed(1),
    firstFieldTopWithScroll: +(fb.top - dr.top + d.scrollTop).toFixed(1),
    absoluteFirstFieldTop: +fb.top.toFixed(1),
    fieldsDlTop: +dl.getBoundingClientRect().top.toFixed(1),
    detailTop: +dr.top.toFixed(1),
    headH: +document.querySelector('.detail-head').getBoundingClientRect().height.toFixed(1),
    clientTop: d.clientTop,
  };
};

const out = {};
const browser = await Browser.launch({ width: 1440, height: 900 });
for (const [label, url] of [['FROZEN_HEAD', FROZEN], ['LIVE_WORKTREE', LIVE]]) {
  for (const [vp, w, h, m] of [['390-dsf1', 390, 844, true], ['390-dsf2', 390, 844, true], ['390-nomobile', 390, 844, false]]) {
    const dsf = vp.includes('dsf2') ? 2 : 1;
    const p = await browser.newPage({ width: w, height: h, dsf, mobile: m });
    await p.goto(url, { settleMs: 1600 });
    const res = {};
    for (const id of ['S01', 'S13', 'S15', 'S26', 'S30']) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0; window.scrollTo(0, 0);
      }, id);
      await new Promise((r) => setTimeout(r, 250));
      const mm = await p.eval(M);
      const sh = await p.eval(() => document.getElementById('detail').scrollHeight);
      res[id] = { ...mm, scrollH: sh };
    }
    out[`${label}|${vp}`] = res;
    console.log(`\n[${label} | ${vp}]`);
    for (const id of Object.keys(res)) {
      const x = res[id];
      console.log(`  ${id} scrollH=${String(x.scrollH).padStart(4)} 首字段(不减scrollTop)=${String(x.firstFieldTopNoScroll).padStart(6)} (加scrollTop)=${String(x.firstFieldTopWithScroll).padStart(6)} headH=${x.headH} clientTop=${x.clientTop}`);
    }
    await p.close();
  }
}
writeFileSync(join(HERE, '_p19_offsets.json'), JSON.stringify(out, null, 1));
await browser.close();
