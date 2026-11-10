// V7 截图：1440×900 与 390×844，S01 / S13 / S26 三案的选型台首屏 + 详情面板
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots');

const browser = await Browser.launch({ width: 1440, height: 900 });

for (const [vp, w, h, mobile] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  // 首屏（未打开详情）
  const p0 = await browser.newPage({ width: w, height: h, dsf: 1, mobile });
  await p0.goto(PAGE, { settleMs: 2500 });
  await p0.screenshot({ path: join(SHOTS, `list-${vp}.jpg`), format: 'jpeg', quality: 82 });
  const info = await p0.eval(() => ({
    rows: document.querySelectorAll('.row').length,
    firstRowTop: document.querySelector('.row')?.getBoundingClientRect().top,
    firstFieldTop: (() => {
      const d = document.querySelector('#detail');
      return d && !d.hidden ? null : null;
    })(),
    scrollH: document.documentElement.scrollHeight,
  }));
  console.log(`${vp} 首屏: rows=${info.rows} 首个行卡 top=${info.firstRowTop} scrollH=${info.scrollH}`);
  await p0.close?.();

  for (const id of ['S01', 'S13', 'S26']) {
    const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile });
    await p.goto(PAGE + '#' + id, { settleMs: 2200 });
    // 点击行卡确保详情打开并滚到顶部
    await p.eval((sid) => {
      const row = document.querySelector('.row[data-id="' + sid + '"]');
      if (row) row.click();
      const d = document.querySelector('#detail');
      if (d) d.scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 900));
    const geo = await p.eval(() => {
      const d = document.querySelector('#detail');
      const btn = document.querySelector('.prompt-cta');
      const firstFold = document.querySelector('.field-fold');
      const top = d ? d.getBoundingClientRect().top : null;
      return {
        detailTop: top,
        ctaTop: btn ? Math.round(btn.getBoundingClientRect().top) : null,
        firstFoldTop: firstFold ? Math.round(firstFold.getBoundingClientRect().top) : null,
        scrollH: d ? d.scrollHeight : null,
      };
    });
    console.log(`  ${id}@${vp}: detailTop=${geo.detailTop} ctaTop=${geo.ctaTop} firstFoldTop=${geo.firstFoldTop} scrollH=${geo.scrollH}`);
    await p.screenshot({ path: join(SHOTS, `${id}-${vp}.jpg`), format: 'jpeg', quality: 82 });
    await p.close?.();
  }
}
await browser.close();
