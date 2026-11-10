// 探针 16：详情面板真正的滚动容器是 #detail（position:fixed, overflow-y:auto）。
// 量「滚到「适用场景」要滚多少」——用 #detail.scrollTop，不是 window.scrollY。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const spec of [{ w: 1440, h: 900, mobile: false, dsf: 1, tag: '1440' },
                    { w: 390, h: 844, mobile: true, dsf: 2, tag: '390' }]) {
  const page = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page.goto(BASE, { settleMs: 1700 });
  await page.eval(() => document.querySelector('#ledger > li[data-id="S21"]').click());
  await sleep(800);
  out[spec.tag] = await page.eval(() => {
    const d = document.getElementById('detail');
    const body = document.getElementById('d-body');
    const dt = [...body.querySelectorAll('dt')].find(x => /适用场景/.test(x.textContent || ''));
    const vh = innerHeight;
    const dRect = d.getBoundingClientRect();
    const cs = getComputedStyle(d);
    const dtRect0 = dt.getBoundingClientRect();
    // 滚 #detail 直到 dt 进视口
    const want = dtRect0.top - dRect.top + d.scrollTop - 80;
    d.scrollTop = Math.max(0, want);
    const dtRect1 = dt.getBoundingClientRect();
    return {
      vh, detail: { h: +dRect.height.toFixed(1), top: +dRect.top.toFixed(1),
                    overflowY: cs.overflowY, scrollH: d.scrollHeight, clientH: d.clientHeight },
      bodyScrollH: body.scrollHeight, bodyClientH: body.clientHeight,
      dtOffsetInDetail: +(dtRect0.top - dRect.top + d.scrollTop).toFixed(1),
      scrollNeededPx: +Math.max(0, want).toFixed(1),
      scrollNeededPanes: +(Math.max(0, want) / d.clientHeight).toFixed(2),
      afterScroll: { scrollTop: +d.scrollTop.toFixed(1), dtTopInViewport: +dtRect1.top.toFixed(1),
                     nowVisible: dtRect1.top >= 0 && dtRect1.top < vh },
      dtText: dt.innerText,
      // 「适用场景」那条 dd 里有没有提到模板
      ddText: (dt.nextElementSibling?.innerText || '').slice(0, 400),
    };
  });
  await page.screenshot({ path: `${OUT}/shots/${spec.tag}-detail-S21-shiyong-scrolled.png`, format: 'png' });
  await page.close();
}
writeFileSync(OUT + '/probe-detail-scroll.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
