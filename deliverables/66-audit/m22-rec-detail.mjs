// m22-rec-detail.mjs — 推荐方案的精确数字 + 窄屏 summary 触控尺寸
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HELPERS = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  function railToSummary(text, minH) {
    var rail = document.querySelector('.rail');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = text;
    s.style.cssText = 'display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 22px;min-height:' + (minH || 48) + 'px;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body); rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible'; rail.style.padding = '0 16px 6px'; rail.style.borderBottom = '2px solid var(--ink)';
    d.open = false;
  }
`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval((payload) => { new Function(payload.h + "railToSummary('筛选与场景反查 · 11 组 47 颗芯片', 48);")(); }, { h: HELPERS });
  await new Promise((r) => setTimeout(r, 300));
  out[vp.k] = await p.eval(() => {
    const s = document.querySelector('.rail summary');
    const sr = s.getBoundingClientRect();
    const rail = document.querySelector('.rail');
    return {
      summaryH: +sr.height.toFixed(1), summaryW: +sr.width.toFixed(1),
      railH: +rail.getBoundingClientRect().height.toFixed(1),
      firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
      tapOk44: sr.height >= 44,
    };
  });
  console.log(`[${vp.k}] rail summary ${out[vp.k].summaryH}px 高 × ${out[vp.k].summaryW}px 宽，rail 总高 ${out[vp.k].railH}，首卡 top ${out[vp.k].firstRowTop}，达 44px=${out[vp.k].tapOk44}`);
  await p.close();
}
writeFileSync(join(HERE, 'data-m22-rec.json'), JSON.stringify(out, null, 1));
await browser.close();
