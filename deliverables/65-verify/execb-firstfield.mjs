// 执行 B 目标核查：详情面板「首个字段」位置 ≤720px（1440 / 390），以及列表首个行卡位置
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [vp, w, h, m] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: m });
  await page.goto(PAGE, { settleMs: 2200 });
  const r = await page.eval(() => {
    const rows = [...document.querySelectorAll('.row')];
    const firstRowTop = rows[0] ? Math.round(rows[0].getBoundingClientRect().top) : null;
    // 打开第一案
    if (rows[0]) rows[0].click();
    const d = document.querySelector('#detail');
    const all = [...d.querySelectorAll('*')];
    // 找「一句话视觉定义」等字段标题，取第一个字段块
    const labels = ['一句话视觉定义', '美学家族与参考', '上站文案', '闸门与报告', '去 AI 味审查点'];
    const found = {};
    for (const lb of labels) {
      const el = all.find((e) => e.children.length === 0 && e.textContent.trim() === lb);
      if (el) found[lb] = Math.round(el.getBoundingClientRect().top);
    }
    const cta = document.querySelector('.prompt-cta');
    return { firstRowTop, fields: found, ctaTop: cta ? Math.round(cta.getBoundingClientRect().top) : null,
      detailScrollH: d.scrollHeight, vh: window.innerHeight };
  });
  out[vp] = r;
  console.log(`=== ${vp} (视口高 ${r.vh}) ===`);
  console.log(`  列表首个行卡 top: ${r.firstRowTop}  ${r.firstRowTop > r.vh ? '★首屏内看不到任何方案卡' : ''}`);
  console.log(`  复制按钮 top: ${r.ctaTop}`);
  for (const [k, v] of Object.entries(r.fields)) console.log(`  字段「${k}」 top: ${v}  ${v <= 720 ? '✓≤720' : '✗>720'}`);
  console.log(`  详情 scrollHeight: ${r.detailScrollH}`);
  await page.close?.();
}
writeFileSync(join(HERE, 'execb-firstfield.json'), JSON.stringify(out, null, 2), 'utf8');
await browser.close();
