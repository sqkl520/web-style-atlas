// 探针 19：核一个可疑现象 —— rail-fold 关闭时 .scene-toggle 仍报 h=31 / top=484.9。
// 如果它其实可见，说明「要 2 次点击」这个说法不成立。同时核 390 首屏里空状态是否完整可见。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 390, height: 844 });
const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
await page.goto(BASE, { settleMs: 1800 });

const out = {};
out.initial = await page.eval(() => {
  const t = document.querySelector('.scene-toggle');
  const note = document.querySelector('.scene-unsupported');
  const rf = document.getElementById('rail-fold');
  const body = document.querySelector('.rail-fold-body');
  const info = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: +(r.top + scrollY).toFixed(1),
             display: cs.display, visibility: cs.visibility,
             innerText: (e.innerText || '').slice(0, 60) }; };
  return { railFoldOpen: rf.open, railFoldH: +rf.getBoundingClientRect().height.toFixed(1),
           bodyH: +body.getBoundingClientRect().height.toFixed(1),
           bodyDisplay: getComputedStyle(body).display,
           toggle: info(t), note: info(note),
           docH: document.documentElement.scrollHeight,
           elAtTogglePoint: (() => { const r = t.getBoundingClientRect();
             const el = document.elementFromPoint(Math.min(r.left + 5, 380), Math.min(r.top + 5, 800));
             return el ? (el.className || el.tagName) : null; })() };
});

out.searchEcom = await page.eval(() => {
  const q = document.getElementById('q'); q.value = '电商'; q.dispatchEvent(new Event('input', { bubbles: true }));
  scrollTo(0, 0);
  const vh = innerHeight;
  const seg = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
    return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1),
             visiblePx: +Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)).toFixed(1),
             pctVisible: +(Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) / r.height * 100).toFixed(1) }; };
  const etpl = document.getElementById('empty-tpl');
  return { vh, empty: seg(document.getElementById('empty')),
           etpl: seg(etpl),
           etplHead: seg(etpl.querySelector('.tpl-empty-head')),
           tplAll: seg(etpl.querySelector('.tpl-all')) };
});
await page.screenshot({ path: OUT + '/shots/390-ecom-first-verified.png', format: 'png' });
await page.close();
await b.close();
writeFileSync(OUT + '/probe-foldtruth.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
