// 探针 20：方案 5（零成本）—— 把空状态引导句里的模板名就地做成链接，量布局变化。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 390, height: 844 });
const out = {};

for (const spec of [{ w: 390, h: 844, mobile: true, dsf: 2, tag: '390' },
                    { w: 1440, h: 900, mobile: false, dsf: 1, tag: '1440' }]) {
  const page = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page.goto(BASE, { settleMs: 1700 });
  await page.eval(() => { const q = document.getElementById('q'); q.value = '餐厅';
    q.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(400);

  out[spec.tag] = await page.eval(() => {
    const vh = innerHeight;
    const head = document.querySelector('#empty-tpl .tpl-empty-head');
    const etpl = document.getElementById('empty-tpl');
    const before = { headH: +head.getBoundingClientRect().height.toFixed(1),
                     etplH: +etpl.getBoundingClientRect().height.toFixed(1),
                     docH: document.documentElement.scrollHeight };
    // 就地包一层 <a>：文字一个字不改
    const html = head.innerHTML;
    head.innerHTML = html.replace(/M02 暖调门店站/, '<a href="../../templates/M02-warm-local/" class="tpl-inline">M02 暖调门店站</a>');
    const after = { headH: +head.getBoundingClientRect().height.toFixed(1),
                    etplH: +etpl.getBoundingClientRect().height.toFixed(1),
                    docH: document.documentElement.scrollHeight,
                    linkTop: +(head.querySelector('a').getBoundingClientRect().top + scrollY).toFixed(1),
                    linkVisibleInFirstScreen: (() => { const r = head.querySelector('a').getBoundingClientRect();
                      return +Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)).toFixed(1); })() };
    return { vh, before, after, deltaH: +(after.etplH - before.etplH).toFixed(1),
             deltaDocH: after.docH - before.docH };
  });
  await page.screenshot({ path: `${OUT}/shots/${spec.tag}-plan5-inline-link.png`, format: 'png' });
  await page.close();
}
writeFileSync(OUT + '/probe-plan5.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
