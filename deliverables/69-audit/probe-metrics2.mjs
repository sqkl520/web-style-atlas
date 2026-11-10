// 探针 5：把首屏指标拆开 —— 找出 1440 首卡 450 vs 任务书 430.5 的差、390 余量随排序变化。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── 1440：页头逐块高度 + self-gate 显隐 A/B
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 2500 });
  out.mastBreakdown = await page.eval(() => {
    const h = (sel) => { const e = document.querySelector(sel); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
    const t = (sel) => { const e = document.querySelector(sel); return e ? +(e.getBoundingClientRect().top + scrollY).toFixed(1) : null; };
    const first = document.querySelector('#ledger > li');
    return {
      mast: h('.mast'), mastId: h('.mast-id'), mastFacts: h('.mast-facts'), mastLabel: h('.mast-label'),
      h1: h('.mast h1'), wizard: h('.mast-wizard'), mastFold: h('.mast-fold'), foldSum: h('.mast-fold-sum'),
      claim: h('.mast-claim'), exit: h('.mast-exit'), selfGate: h('#self-gate'), selfGateText: document.getElementById('self-gate')?.innerText,
      bar: h('.bar'), rail: h('.rail'),
      firstTop: first ? +(first.getBoundingClientRect().top + scrollY).toFixed(1) : null,
      fontsLoaded: document.fonts.status,
      h1Font: getComputedStyle(document.querySelector('.mast h1')).fontSize,
    };
  });
  // A/B: 隐藏 self-gate
  out.ab_selfGateHidden = await page.eval(() => {
    document.getElementById('self-gate').style.display = 'none';
    return new Promise(r => setTimeout(() => {
      const first = document.querySelector('#ledger > li');
      r({ mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
          firstTop: +(first.getBoundingClientRect().top + scrollY).toFixed(1) });
    }, 150));
  });
  out.ab_selfGateShown = await page.eval(() => {
    document.getElementById('self-gate').style.display = '';
    return new Promise(r => setTimeout(() => {
      const first = document.querySelector('#ledger > li');
      r({ mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
          firstTop: +(first.getBoundingClientRect().top + scrollY).toFixed(1) });
    }, 150));
  });
  await page.screenshot({ path: OUT + '/shots/1440-first-screen.png', format: 'png' });
  await page.close();
}

// ── 390：五种排序下的首卡 top / slack
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 2000 });
  out.sorts390 = [];
  for (const s of ['n', 'fr', 'thr', 'gate', 'built']) {
    const r = await page.eval((sortVal) => {
      const sel = document.getElementById('sort');
      sel.value = sortVal; sel.dispatchEvent(new Event('change', { bubbles: true }));
      return new Promise(res => setTimeout(() => {
        const first = document.querySelector('#ledger > li');
        const b = first.getBoundingClientRect();
        res({ sort: sortVal, vh: innerHeight, top: +(b.top + scrollY).toFixed(1),
              h: +b.height.toFixed(1), slack: +(innerHeight - b.bottom).toFixed(1),
              fully: [...document.querySelectorAll('#ledger > li')].filter(li => {
                const r = li.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }).length });
      }, 200));
    }, s);
    out.sorts390.push(r);
  }
  await page.eval(() => { const sel = document.getElementById('sort'); sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.screenshot({ path: OUT + '/shots/390-first-screen.png', format: 'png' });
  await page.close();
}

// ── 390：rail 折叠条 summary 宽度（提词被裁？）+ 它读起来像什么
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 2000 });
  out.railFold390 = await page.eval(() => {
    const s = document.querySelector('#rail-fold > summary');
    const r = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return { text: s.innerText, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
             scrollW: s.scrollWidth, clientW: s.clientWidth, overflow: s.scrollWidth > s.clientWidth + 1,
             fontSize: cs.fontSize, lines: Math.round(r.height / parseFloat(cs.lineHeight || cs.fontSize)),
             docTop: +(r.top + scrollY).toFixed(1) };
  });
  // 390：mast-fold summary
  out.mastFold390 = await page.eval(() => {
    const s = document.querySelector('#mast-fold > summary');
    const r = s.getBoundingClientRect();
    return { text: s.innerText, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
             scrollW: s.scrollWidth, clientW: s.clientWidth, overflow: s.scrollWidth > s.clientWidth + 1,
             docTop: +(r.top + scrollY).toFixed(1) };
  });
  await page.close();
}

writeFileSync(OUT + '/probe-metrics2.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
