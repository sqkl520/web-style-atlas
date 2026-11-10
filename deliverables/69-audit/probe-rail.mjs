// 探针 2：空状态全文 + 折叠区（#more-host / scene-more）+ 390 档滚动深度。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── A. 空状态全文（1440）
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1200 });
  const res = {};
  for (const term of ['电商', '餐厅', '律师', '咖啡店', '诊所', '花店', '民宿', '甜品', '农业']) {
    res[term] = await page.eval((t) => {
      const q = document.getElementById('q');
      q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
      const g = (id) => { const e = document.getElementById(id); if (!e) return null;
        const r = e.getBoundingClientRect();
        return { hidden: e.hidden, display: getComputedStyle(e).display, h: Math.round(r.height), top: Math.round(r.top + scrollY), text: (e.innerText||'').replace(/\s+/g,' ').trim() }; };
      const rows = [...document.querySelectorAll('#ledger > li')].map(li => li.querySelector('.r-no')?.textContent?.trim() || li.innerText.slice(0,30));
      return { rows: rows.length, rowIds: rows, count: g('count'), empty: g('empty'), etpl: g('empty-tpl') };
    }, term);
  }
  out.emptyState = res;
  await page.close();
}

// ── B. 未搜词时的 rail 结构：芯片数、折叠区、note
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1200 });
  out.rail = await page.eval(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visible: r.height > 0 && cs.display !== 'none' }; };
    const direct = [...document.querySelectorAll('#flt-scene > button')];
    const more = document.querySelector('.scene-more');
    const moreBtns = more ? [...more.querySelectorAll('button')] : [];
    const note = document.querySelector('.scene-unsupported');
    const toggle = document.querySelector('.scene-toggle');
    return {
      directChips: direct.length,
      directTerms: direct.map(b => b.dataset.scene),
      moreChips: moreBtns.length,
      moreTerms: moreBtns.map(b => b.dataset.scene),
      moreBox: more ? vis(more) : null,
      note: note ? { ...vis(note), text: (note.innerText||'').replace(/\s+/g,' ') } : null,
      toggle: toggle ? { ...vis(toggle), text: toggle.innerText } : null,
      toggleTopInRail: toggle ? Math.round(toggle.getBoundingClientRect().top + scrollY) : null,
    };
  });

  // 点开折叠区，再量一次（note 是否可见）
  out.railAfterToggle = await page.eval(() => {
    document.querySelector('.scene-toggle').click();
    const vis = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visible: r.height > 0 && cs.display !== 'none' }; };
    const note = document.querySelector('.scene-unsupported');
    const more = document.querySelector('.scene-more');
    const toggle = document.querySelector('.scene-toggle');
    return {
      moreBox: vis(more), note: vis(note),
      noteText: note ? (note.innerText||'').replace(/\s+/g,' ') : '',
      toggleText: toggle.innerText,
      noteDocTop: note ? Math.round(note.getBoundingClientRect().top + scrollY) : null,
      docH: document.documentElement.scrollHeight,
    };
  });
  await page.close();
}

// ── C. 390 档：首屏指标 + 到「没有这个」需要滚多少屏 + 点击次数
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1200 });
  out.m390 = await page.eval(() => {
    const vh = innerHeight;
    const q = document.getElementById('q');
    const foldStates = ['mast-fold','rail-fold','bar-fold'].map(id => {
      const e = document.getElementById(id);
      return { id, open: e ? e.open : null, h: e ? Math.round(e.getBoundingClientRect().height) : null };
    });
    const rows = document.querySelectorAll('#ledger > li');
    const firstCard = rows[0];
    const fr = firstCard ? firstCard.getBoundingClientRect() : null;
    const rail = document.querySelector('aside.rail');
    const toggle = document.querySelector('.scene-toggle');
    const note = document.querySelector('.scene-unsupported');
    const pos = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { top: +(r.top + scrollY).toFixed(1), bottom: +(r.bottom + scrollY).toFixed(1), h: +r.height.toFixed(1) }; };
    return {
      vh, docH: document.documentElement.scrollHeight,
      foldStates,
      railH: rail ? +rail.getBoundingClientRect().height.toFixed(1) : null,
      railInFold: !!document.querySelector('#rail-fold .rail-fold-body'),
      firstCard: fr ? { top: +(fr.top + scrollY).toFixed(1), h: +fr.height.toFixed(1), fullyVisible: fr.bottom <= vh } : null,
      firstCardSlackPx: fr ? +(vh - fr.bottom).toFixed(1) : null,
      toggle: pos(toggle), toggleInFold: note ? !!note.closest('#rail-fold') : null,
      note: pos(note), noteDisplay: note ? getComputedStyle(note).display : null,
      toggleText: toggle ? toggle.innerText : null,
    };
  });
  await page.close();
}

// ── D. 1440 档：首卡 top
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1200 });
  out.m1440 = await page.eval(() => {
    const rows = document.querySelectorAll('#ledger > li');
    const fr = rows[0] ? rows[0].getBoundingClientRect() : null;
    const toggle = document.querySelector('.scene-toggle');
    const note = document.querySelector('.scene-unsupported');
    const pos = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { top: +(r.top + scrollY).toFixed(1), bottom: +(r.bottom + scrollY).toFixed(1), h: +r.height.toFixed(1) }; };
    return {
      vh: innerHeight, docH: document.documentElement.scrollHeight,
      folds: ['mast-fold','rail-fold','bar-fold'].map(id => ({ id, open: document.getElementById(id)?.open,
        h: Math.round(document.getElementById(id)?.getBoundingClientRect().height || 0) })),
      firstCard: fr ? { top: +(fr.top + scrollY).toFixed(1), h: +fr.height.toFixed(1) } : null,
      firstCardSlackPx: fr ? +(innerHeight - fr.bottom).toFixed(1) : null,
      toggle: pos(toggle), note: pos(note), noteDisplay: note ? getComputedStyle(note).display : null,
    };
  });
  await page.close();
}

writeFileSync(OUT + '/probe-rail.json', JSON.stringify(out, null, 1));

// 打印摘要
console.log('=== 空状态（1440）===');
for (const [t, r] of Object.entries(out.emptyState)) {
  console.log(`\n【${t}】rows=${r.rows} ${r.rowIds.join(',')}`);
  console.log('  #empty:', (r.empty.text || '').slice(0, 400));
  console.log('  #empty-tpl:', (r.etpl.text || '(hidden)').slice(0, 500));
}
console.log('\n=== rail ===');
console.log('directChips', out.rail.directChips, '| moreChips', out.rail.moreChips);
console.log('toggle:', JSON.stringify(out.rail.toggle));
console.log('note(before):', JSON.stringify(out.rail.note));
console.log('afterToggle:', JSON.stringify(out.railAfterToggle));
console.log('\n=== 390 ===');
console.log(JSON.stringify(out.m390, null, 1));
console.log('\n=== 1440 ===');
console.log(JSON.stringify(out.m1440, null, 1));
await b.close();
