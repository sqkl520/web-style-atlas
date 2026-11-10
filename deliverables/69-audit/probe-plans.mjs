// 探针 12：四个分流方案的**代价实测** —— 在真页面里注入候选 DOM，量首屏指标变化。
// 不写任何文件；只在一次性页面里改 DOM。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

const measure = async (page) => page.eval(() => {
  const vh = innerHeight;
  const cards = [...document.querySelectorAll('#ledger > li')].map(li => {
    const r = li.getBoundingClientRect();
    return { top: +(r.top + scrollY).toFixed(1), bottom: +(r.bottom + scrollY).toFixed(1) };
  });
  return { vh, docH: document.documentElement.scrollHeight,
    firstTop: cards[0]?.top, firstSlack: cards[0] ? +(vh - cards[0].bottom).toFixed(1) : null,
    fully: cards.filter(c => c.top >= 0 && c.bottom <= vh).length };
});

for (const spec of [{ w: 390, h: 844, mobile: true, dsf: 2, tag: '390' },
                    { w: 1440, h: 900, mobile: false, dsf: 1, tag: '1440' },
                    { w: 1024, h: 900, mobile: false, dsf: 1, tag: '1024' }]) {
  const page = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page.goto(BASE, { settleMs: 1800 });
  const r = {};

  // 基线
  await page.eval(() => { const s = document.getElementById('sort'); s.value='n'; s.dispatchEvent(new Event('change',{bubbles:true})); });
  await sleep(200);
  r.baseline = await measure(page);

  // 方案 3 变体：把 #empty-tpl 移到 #empty 之前（模板成主结果）
  r.plan3_reorder = await page.eval(() => {
    const q = document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true}));
    const main = document.querySelector('main.main');
    const empt = document.getElementById('empty');
    const etpl = document.getElementById('empty-tpl');
    main.insertBefore(etpl, empt);
    return new Promise(res => setTimeout(() => {
      const vh = innerHeight;
      const pos = (e) => { const b = e.getBoundingClientRect(); return { docTop: +(b.top+scrollY).toFixed(1), h:+b.height.toFixed(1) }; };
      const card = document.querySelector('#empty-tpl .tpl-card');
      const btn = document.querySelector('#empty-tpl .tpl-open');
      res({ vh, order: [...main.children].map(c => c.id || c.className).join(','),
            etpl: pos(document.getElementById('empty-tpl')), empty: pos(document.getElementById('empty')),
            cardTop: card ? +(card.getBoundingClientRect().top + scrollY).toFixed(1) : null,
            cardVisibleInFirstScreen: card ? Math.max(0, Math.min(vh, card.getBoundingClientRect().bottom) - Math.max(0, card.getBoundingClientRect().top)) : 0,
            openLinkTop: btn ? +(btn.getBoundingClientRect().top + scrollY).toFixed(1) : null,
            openLinkVisible: btn ? Math.max(0, Math.min(vh, btn.getBoundingClientRect().bottom) - Math.max(0, btn.getBoundingClientRect().top)) : 0,
            docH: document.documentElement.scrollHeight });
    }, 400));
  });
  await page.screenshot({ path: `${OUT}/shots/${spec.tag}-plan3-reordered.png`, format: 'png' });
  await page.close();

  // 方案 4 变体：在 rail 的「你是做什么的」组里，把模板作为常驻一行（3 个模板出口）
  const page2 = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page2.goto(BASE, { settleMs: 1800 });
  r.plan4_railTemplateRow = await page2.eval(() => {
    const host = document.getElementById('flt-scene');
    const p = document.createElement('p');
    p.className = 'rail-hint';
    p.style.cssText = 'margin-top:8px';
    p.innerHTML = '中小生意不想挑风格？<a href="../../templates/M02-warm-local/">餐厅/门店 M02</a> · <a href="../../templates/M01-clean-corporate/">企业/律所 M01</a> · <a href="../../templates/M03-bold-creator/">作品集 M03</a>';
    host.parentNode.insertBefore(p, host.nextSibling);
    return new Promise(res => setTimeout(() => {
      const vh = innerHeight;
      const first = document.querySelector('#ledger > li').getBoundingClientRect();
      res({ vh, addedH: +p.getBoundingClientRect().height.toFixed(1),
            firstTop: +(first.top + scrollY).toFixed(1),
            slack: +(vh - first.bottom).toFixed(1),
            fully: [...document.querySelectorAll('#ledger > li')].filter(li => {
              const b = li.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length,
            docH: document.documentElement.scrollHeight });
    }, 300));
  });
  await page2.screenshot({ path: `${OUT}/shots/${spec.tag}-plan4-rail-row.png`, format: 'png' });
  await page2.close();

  // 方案 2 变体：详情面板底部加模板块（不影响首屏，但量面板高度变化）
  const page3 = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page3.goto(BASE, { settleMs: 1600 });
  r.plan2_detailBlock = await page3.eval(() => {
    document.querySelector('#ledger > li[data-id="S21"]').click();
    return new Promise(res => setTimeout(() => {
      const body = document.getElementById('d-body');
      const before = body.scrollHeight;
      const div = document.createElement('div');
      div.className = 'detail-tpl';
      div.style.cssText = 'border-top:2px solid currentColor;margin-top:16px;padding-top:12px';
      div.innerHTML = '<p><strong>这类中小生意，直接用模板</strong></p><ul><li><a href="../../templates/M01-clean-corporate/">M01 企业站</a> — 律所/咨询/软件服务</li><li><a href="../../templates/M02-warm-local/">M02 门店站</a> — 餐厅/咖啡馆/烘焙/民宿/花店</li><li><a href="../../templates/M03-bold-creator/">M03 作品集</a> — 个人作品集/自由职业者</li></ul>';
      body.appendChild(div);
      res({ addedH: +div.getBoundingClientRect().height.toFixed(1),
            bodyScrollBefore: before, bodyScrollAfter: body.scrollHeight,
            bodyClientH: body.clientHeight });
    }, 250));
  });
  await page3.screenshot({ path: `${OUT}/shots/${spec.tag}-plan2-detail-block.png`, format: 'png' });
  await page3.close();

  out[spec.tag] = r;
}

writeFileSync(OUT + '/probe-plans.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
