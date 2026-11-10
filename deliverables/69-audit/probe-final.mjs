// 探针 15：收口复核 4 件事（全部是我报告里要引用的数字）
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── A. .detail 是不是滚动容器 / 「适用场景」真实滚动成本
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1600 });
  await page.eval(() => document.querySelector('#ledger > li[data-id="S21"]').click());
  await sleep(700);
  out.detailScroll = await page.eval(() => {
    const d = document.getElementById('detail');
    const body = document.getElementById('d-body');
    const cs = getComputedStyle(d);
    const dt = [...body.querySelectorAll('dt')].find(x => /适用场景/.test(x.textContent || ''));
    const before = { y: scrollY, dtTop: dt.getBoundingClientRect().top, docH: document.documentElement.scrollHeight };
    // 用页面滚动把 dt 顶到视口内
    const need = dt.getBoundingClientRect().top + scrollY - 80;
    scrollTo(0, Math.min(need, document.documentElement.scrollHeight));
    const after = { y: scrollY, dtTop: +dt.getBoundingClientRect().top.toFixed(1) };
    return { detailHeight: +d.getBoundingClientRect().height.toFixed(1), position: cs.position,
             overflowY: cs.overflowY, bodyClientH: body.clientHeight, bodyScrollH: body.scrollHeight,
             isScrollContainer: body.scrollHeight > body.clientHeight + 1,
             dtDocTop: +(dt.getBoundingClientRect().top + scrollY).toFixed(1),
             scrollNeededPx: +(need - before.y).toFixed(1),
             scrollNeededScreens: +((need - before.y) / innerHeight).toFixed(2),
             vh: innerHeight, docH: document.documentElement.scrollHeight, after };
  });
  await page.screenshot({ path: OUT + '/shots/1440-detail-S21-shiyong.png', format: 'png' });
  await page.close();
}

// ── B. 390 空状态（餐厅）：M02 卡与它的「打开 M02 ↗」到底在第几屏
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1700 });
  out.m390rest = await page.eval(() => {
    const q = document.getElementById('q'); q.value = '餐厅'; q.dispatchEvent(new Event('input', { bubbles: true }));
    scrollTo(0, 0);
    const vh = innerHeight;
    const etpl = document.getElementById('empty-tpl');
    const card = etpl.querySelector('.tpl-card');
    const link = card?.querySelector('.tpl-open');
    const allLinks = [...etpl.querySelectorAll('.tpl-open')];
    const p = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { docTop: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1),
               bottom: +(r.bottom + scrollY).toFixed(1),
               screens: +((r.top + scrollY) / vh).toFixed(2),
               fullyInFirstScreen: r.top >= 0 && r.bottom <= vh,
               visPx: +Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)).toFixed(1) }; };
    return { vh, nTplOpenLinks: allLinks.length,
             card: p(card), cardHeading: card?.querySelector('b')?.innerText,
             link: p(link), linkText: link?.innerText,
             cardSwatches: p(card?.querySelector('.swatches')),
             tplAll: p(etpl.querySelector('.tpl-all')),
             firstRowCard: p(document.querySelector('#ledger > li')),
             empty: p(document.getElementById('empty')) };
  });
  await page.screenshot({ path: OUT + '/shots/390-restaurant-first-measured.png', format: 'png' });
  await page.close();
}

// ── C. 1440 #self-gate 为什么是两行（解释 450 vs 任务书 430.5）
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 2500 });
  out.selfGate = await page.eval(() => {
    const e = document.getElementById('self-gate');
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const range = document.createRange(); range.selectNodeContents(e);
    const tr = range.getBoundingClientRect();
    const mastId = document.querySelector('.mast-id').getBoundingClientRect();
    const first = document.querySelector('#ledger > li').getBoundingClientRect();
    return { text: e.innerText, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
             mastIdW: +mastId.width.toFixed(1), lineHeight: cs.lineHeight, fontSize: cs.fontSize,
             textLines: +((tr.height / parseFloat(cs.lineHeight)).toFixed(2)),
             mastIdWText: tr.width, firstTop: +(first.top + scrollY).toFixed(1),
             reportDate: window.SELECTION_REPORT ? JSON.stringify(window.SELECTION_REPORT).slice(0, 200) : 'none' };
  });
  await page.close();
}

writeFileSync(OUT + '/probe-final.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
