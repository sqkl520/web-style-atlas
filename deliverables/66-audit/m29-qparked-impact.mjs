// m29-qparked-impact.mjs — #q-parked 假控件占掉的首屏高度（390/414/1440）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const bar = document.querySelector('.bar');
  const qp = document.getElementById('q-parked');
  return {
    barH: +bar.getBoundingClientRect().height.toFixed(1),
    qparkedH: qp ? +qp.getBoundingClientRect().height.toFixed(1) : null,
    qparkedDisplay: qp ? getComputedStyle(qp).display : null,
    firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
    docH: document.documentElement.scrollHeight,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = { before: await p.eval(M) };
  await p.eval(() => {
    const st = document.createElement('style'); st.setAttribute('data-lab', '1');
    st.textContent = '#q-parked[hidden]{display:none !important}';
    document.head.appendChild(st);
  });
  await new Promise((r) => setTimeout(r, 250));
  out[vp.k].after = await p.eval(M);
  out[vp.k].after.firstRowTopAfterFix = out[vp.k].after.firstRowTop;
  const delta = out[vp.k].before.firstRowTop - out[vp.k].after.firstRowTop;
  console.log(`[${vp.k}] bar ${out[vp.k].before.barH} → ${out[vp.k].after.barH}（省 ${(out[vp.k].before.barH - out[vp.k].after.barH).toFixed(1)}px） 首卡 top ${out[vp.k].before.firstRowTop} → ${out[vp.k].after.firstRowTop}（省 ${delta.toFixed(1)}px） docH ${out[vp.k].before.docH} → ${out[vp.k].after.docH}`);
  await p.close();
}
writeFileSync(join(HERE, 'data-m29-qparked-impact.json'), JSON.stringify(out, null, 1));
await browser.close();
