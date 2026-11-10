// 探针 3：390 档「搜一个零命中的词」走查 —— 点几次、滚几屏才看到「没有」。
// 同时核查 1440 档 .bar-fold 高度 0 是否把「排序 / 清空」藏掉了。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── A. 390：搜「电商」（零命中、且不在 44 词里）
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1500 });
  out.m390_ecom = await page.eval(() => {
    const q = document.getElementById('q');
    q.value = '电商'; q.dispatchEvent(new Event('input', { bubbles: true }));
    const vh = innerHeight;
    const pos = (sel) => { const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!e) return null; const r = e.getBoundingClientRect();
      return { top: +(r.top + scrollY).toFixed(1), bottom: +(r.bottom + scrollY).toFixed(1),
               h: +r.height.toFixed(1), screens: +((r.top + scrollY) / vh).toFixed(2),
               text: (e.innerText || '').slice(0, 120).replace(/\s+/g, ' ') }; };
    const empt = document.getElementById('empty');
    const etpl = document.getElementById('empty-tpl');
    return {
      vh, scrollY_before: scrollY, docH: document.documentElement.scrollHeight,
      q: pos('#q'), count: pos('#count'),
      empty: pos('#empty'), etpl: pos('#empty-tpl'),
      emptyHeadOffsetFromTop: empt ? +(empt.getBoundingClientRect().top + scrollY).toFixed(1) : null,
      etplHeadOffsetFromTop: etpl ? +(etpl.getBoundingClientRect().top + scrollY).toFixed(1) : null,
      // 首屏（未滚动）内能看到 #empty 的哪一部分
      emptyInFirstScreen: empt ? Math.max(0, Math.min(vh, empt.getBoundingClientRect().bottom) - Math.max(0, empt.getBoundingClientRect().top)) : null,
      etplInFirstScreen: etpl ? Math.max(0, Math.min(vh, etpl.getBoundingClientRect().bottom) - Math.max(0, etpl.getBoundingClientRect().top)) : null,
      railFoldOpen: document.getElementById('rail-fold').open,
      mastFoldOpen: document.getElementById('mast-fold').open,
      barFoldOpen: document.getElementById('bar-fold').open,
      // 折叠区里的 29 词 note 在哪
      noteInFold: (() => { const n = document.querySelector('.scene-unsupported'); if (!n) return null;
        return { display: getComputedStyle(n).display, h: Math.round(n.getBoundingClientRect().height),
                 insideClosedFold: !document.getElementById('rail-fold').open }; })(),
    };
  });
  await page.screenshot({ path: OUT + '/shots/390-empty-ecom-first-screen.png', format: 'png' });
  // 全页截图
  await page.screenshot({ path: OUT + '/shots/390-empty-ecom-full.png', format: 'png', fullPage: true });
  await page.close();
}

// ── B. 390：搜「餐厅」——模板卡是否首屏可见
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1500 });
  out.m390_rest = await page.eval(() => {
    const q = document.getElementById('q');
    q.value = '餐厅'; q.dispatchEvent(new Event('input', { bubbles: true }));
    const vh = innerHeight;
    const pos = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { top: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1),
               screens: +((r.top + scrollY) / vh).toFixed(2),
               text: (e.innerText || '').slice(0, 160).replace(/\s+/g, ' ') }; };
    return { vh, empty: pos('#empty'), etpl: pos('#empty-tpl'),
      card: pos('#empty-tpl .tpl-card'), cardTop: (() => { const c = document.querySelector('#empty-tpl .tpl-card');
        if (!c) return null; const r = c.getBoundingClientRect(); return +(r.top + scrollY).toFixed(1); })(),
      cardScreens: (() => { const c = document.querySelector('#empty-tpl .tpl-card');
        if (!c) return null; return +((c.getBoundingClientRect().top + scrollY) / vh).toFixed(2); })(),
      openLink: (() => { const a = document.querySelector('#empty-tpl .tpl-open');
        if (!a) return null; return { href: a.getAttribute('href'), text: a.innerText }; })(),
      tplAllH: (() => { const e = document.querySelector('#empty-tpl .tpl-all'); return e ? Math.round(e.getBoundingClientRect().height) : null; })(),
    };
  });
  await page.screenshot({ path: OUT + '/shots/390-empty-restaurant-first-screen.png', format: 'png' });
  // 滚到模板卡
  const cardTop = out.m390_rest.cardTop || 0;
  await page.wheel(Math.max(0, cardTop - 60));
  await page.screenshot({ path: OUT + '/shots/390-empty-restaurant-tplcard.png', format: 'png' });
  await page.close();
}

// ── C. 1440：验证 .bar-fold h=0 是否把排序/清空藏了
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1200 });
  out.m1440_bar = await page.eval(() => {
    const g = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display,
               visibility: cs.visibility, opacity: cs.opacity,
               visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' }; };
    return {
      bar: g('.bar'), barFold: g('#bar-fold'), barFoldOpen: document.getElementById('bar-fold').open,
      sortWrap: g('.bar-fold .sort'), sortSelect: g('#sort'), resetBtn: g('#reset'),
      summary: g('.bar-fold-sum'),
    };
  });
  await page.screenshot({ path: OUT + '/shots/1440-bar.png', format: 'png', clip: { x: 0, y: 0, width: 1440, height: 420 } });
  await page.close();
}

// ── D. 390：要几下才看到 29 词 note
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1500 });
  const step = async (label) => page.eval(() => {
    const n = document.querySelector('.scene-unsupported');
    const t = document.querySelector('.scene-toggle');
    const vh = innerHeight;
    const p = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { top: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1), screens: +((r.top + scrollY) / vh).toFixed(2),
               visibleH: Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) }; };
    return { note: p(n), noteDisplay: n ? getComputedStyle(n).display : null,
             toggle: p(t), toggleText: t ? t.innerText : null,
             railFoldOpen: document.getElementById('rail-fold').open, scrollY, vh };
  });
  out.clickPath = [];
  out.clickPath.push({ step: 'load', ...(await step()) });
  await page.eval(() => document.getElementById('rail-fold').querySelector('summary').click());
  await page.eval(() => scrollTo(0, 0)); await page.eval(() => new Promise(r => setTimeout(r, 120)));
  out.clickPath.push({ step: '1.click rail-fold summary', ...(await step()) });
  await page.eval(() => document.querySelector('.scene-toggle').click());
  await page.eval(() => new Promise(r => setTimeout(r, 120)));
  out.clickPath.push({ step: '2.click 还有28个近似', ...(await step()) });
  await page.screenshot({ path: OUT + '/shots/390-scene-note-after-2-clicks.png', format: 'png' });
  await page.close();
}

writeFileSync(OUT + '/probe-390.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
