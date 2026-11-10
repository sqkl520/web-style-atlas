// 探针 21：补两项 —— (a) 方案 4 那一行在 1440 的落点；(b) 把 29 词 note 的一句话搬进 #empty 的代价。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const spec of [{ w: 390, h: 844, mobile: true, dsf: 2, tag: '390' },
                    { w: 1440, h: 900, mobile: false, dsf: 1, tag: '1440' }]) {
  const page = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page.goto(BASE, { settleMs: 1700 });
  const r = {};

  // (a) 方案 4 落点
  r.plan4 = await page.eval(() => {
    const host = document.getElementById('flt-scene');
    const p = document.createElement('p');
    p.className = 'rail-hint';
    p.style.cssText = 'margin-top:8px';
    p.innerHTML = '不想挑风格？直接拿模板：M02 餐厅/门店 · M01 企业/律所 · M03 作品集';
    host.parentNode.insertBefore(p, host.nextSibling);
    return new Promise(res => setTimeout(() => {
      const rr = p.getBoundingClientRect();
      const vh = innerHeight;
      const foldOpen = document.getElementById('rail-fold').open;
      res({ docTop: +(rr.top + scrollY).toFixed(1), h: +rr.height.toFixed(1),
            screens: +((rr.top + scrollY) / vh).toFixed(2),
            visibleInFirstScreen: +Math.max(0, Math.min(vh, rr.bottom) - Math.max(0, rr.top)).toFixed(1),
            railFoldOpen: foldOpen,
            hiddenByFold: !foldOpen });
    }, 300));
  });

  // (b) 一句话搬进 #empty（零命中时）
  r.inlineNote = await page.eval(() => {
    const q = document.getElementById('q'); q.value = '电商'; q.dispatchEvent(new Event('input', { bubbles: true }));
    const empt = document.getElementById('empty');
    const etpl = document.getElementById('empty-tpl');
    const before = { emptyH: +empt.getBoundingClientRect().height.toFixed(1),
                     etplTop: +(etpl.getBoundingClientRect().top + scrollY).toFixed(1),
                     docH: document.documentElement.scrollHeight };
    const p = document.createElement('p');
    p.className = 'e-more';
    p.style.cssText = 'margin-top:10px';
    p.textContent = '另有 29 个行业这一层明确没有对应方案（电商、金融、医疗、政务、地产、汽车、母婴、时尚、美妆、家居、物流…），不是漏做。';
    empt.appendChild(p);
    return new Promise(res => setTimeout(() => {
      const vh = innerHeight;
      const after = { emptyH: +empt.getBoundingClientRect().height.toFixed(1),
                      addedH: +p.getBoundingClientRect().height.toFixed(1),
                      etplTop: +(etpl.getBoundingClientRect().top + scrollY).toFixed(1),
                      docH: document.documentElement.scrollHeight };
      res({ vh, before, after,
            deltaEmpty: +(after.emptyH - before.emptyH).toFixed(1),
            emptyStillFullyInFirstScreen: (empt.getBoundingClientRect().bottom <= vh) });
    }, 300));
  });
  await page.screenshot({ path: `${OUT}/shots/${spec.tag}-plan6-inline-note.png`, format: 'png' });
  out[spec.tag] = r;
  await page.close();
}
writeFileSync(OUT + '/probe-plan6.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
