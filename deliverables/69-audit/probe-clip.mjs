// 探针 13：折叠条文字有没有被纵向裁掉（44px 高的 summary 里塞 13px×3 行）+ 关键截图补拍。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const spec of [{ w: 390, h: 844, mobile: true, dsf: 2, tag: '390' },
                    { w: 1440, h: 900, mobile: false, dsf: 1, tag: '1440' }]) {
  const page = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page.goto(BASE, { settleMs: 1800 });
  out[spec.tag] = await page.eval(() => {
    const res = {};
    for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) {
      const s = document.querySelector('#' + id + ' > summary');
      if (!s) { res[id] = null; continue; }
      const r = s.getBoundingClientRect();
      const cs = getComputedStyle(s);
      const range = document.createRange();
      range.selectNodeContents(s);
      const tr = range.getBoundingClientRect();
      res[id] = {
        text: s.innerText.replace(/\n/g, '⏎'),
        boxH: +r.height.toFixed(1),
        textH: +tr.height.toFixed(1),
        clippedPx: +(Math.max(0, tr.bottom - r.bottom)).toFixed(1),
        lineHeight: cs.lineHeight, fontSize: cs.fontSize,
        display: cs.display, overflow: cs.overflow,
        docTop: +(r.top + scrollY).toFixed(1),
      };
    }
    return res;
  });
  // 390：搜餐厅并停在第 0 屏（模板卡下半截在折线外）
  if (spec.tag === '390') {
    await page.eval(() => { const q = document.getElementById('q'); q.value='餐厅';
      q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); });
    await sleep(400);
    await page.screenshot({ path: OUT + '/shots/390-restaurant-first-fold-line.png', format: 'png' });
    // 打开 rail-fold，看 toggle 与 29 词 note
    await page.eval(() => document.querySelector('#rail-fold > summary').click());
    await sleep(250);
    await page.screenshot({ path: OUT + '/shots/390-rail-open.png', format: 'png' });
    await page.eval(() => document.querySelector('.scene-toggle').click());
    await sleep(250);
    await page.screenshot({ path: OUT + '/shots/390-railtoggle-open-note.png', format: 'png' });
  } else {
    await page.eval(() => { const q = document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); });
    await sleep(300);
    await page.screenshot({ path: OUT + '/shots/1440-first-screen-clean.png', format: 'png' });
  }
  await page.close();
}

writeFileSync(OUT + '/probe-clip.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
