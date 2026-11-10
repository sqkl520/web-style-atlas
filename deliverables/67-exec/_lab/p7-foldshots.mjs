// p7-foldshots.mjs — 折叠条本体与展开态的截图（2026-10-28）。
// 前面 p5 的三对是"整页高度对比"，这一支专拍折叠条本身：
// 收起时一行、展开后正文原样、以及展开后 4 条全开的阅读形态。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, openCase, sleep } from './lib.mjs';

const SHOTS = join(HERE, '..', 'shots-detail');
mkdirSync(SHOTS, { recursive: true });

const TO_FOLD = (openN) => {
  const d = document.getElementById('detail');
  const bars = [...document.querySelectorAll('#d-body .field-long > details')];
  for (let i = 0; i < openN; i++) if (bars[i]) bars[i].open = true;
  const el = bars[0];
  d.scrollTop = el.getBoundingClientRect().top - d.getBoundingClientRect().top + d.scrollTop - 60;
  return { n: bars.length, open: bars.filter((b) => b.open).length, scrollTop: d.scrollTop };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const rows = [];
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1700 });
  await openCase(p, 'S01');
  for (const [label, n] of [['collapsed', 0], ['one-open', 1], ['all-open', 4]]) {
    if (label === 'collapsed') await p.eval(() => { document.querySelectorAll('#d-body .field-long > details').forEach((d) => { d.open = false; }); });
    const info = await p.eval(TO_FOLD, n);
    await sleep(180);
    const file = join(SHOTS, `${vp.k}-S01-fold-${label}.png`);
    await p.screenshot({ path: file, format: 'png' });
    rows.push({ vp: vp.k, label, file, ...info });
    console.log(`[${vp.k}] ${label}: bars=${info.n} open=${info.open} → ${file.split('\\').pop()}`);
  }
  await p.close();
}
writeFileSync(join(HERE, 'p7-foldshots.json'), JSON.stringify(rows, null, 1));
await browser.close();
console.log('done');
