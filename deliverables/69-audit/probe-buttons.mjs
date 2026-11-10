// 探针 8：空状态的「按钮」到底通向哪（芯片筛 / 清空筛选）+ 截图取证。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── A. 空状态按钮的可点性与结果
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1400 });
  out.emptyButtons = {};
  for (const term of ['餐厅', '电商', '律师', '诊所']) {
    const r = await page.eval((t) => {
      const q = document.getElementById('q');
      q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
      const empt = document.getElementById('empty');
      const btns = [...empt.querySelectorAll('button, a')].map(x => ({
        tag: x.tagName, text: (x.innerText||'').replace(/\s+/g,' ').trim().slice(0,80),
        cls: String(x.className) }));
      return { rows: document.querySelectorAll('#ledger > li').length, btns };
    }, term);
    out.emptyButtons[term] = r;
  }
  // 点「按「餐厅」芯片筛」
  out.chipFix = await page.eval(() => {
    const q = document.getElementById('q');
    q.value = '餐厅'; q.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = [...document.querySelectorAll('#empty button')].find(x => /芯片/.test(x.innerText));
    if (!btn) return { err: 'no chip button' };
    btn.click();
    return new Promise(res => setTimeout(() => {
      const rows = [...document.querySelectorAll('#ledger > li')].map(li => li.getAttribute('data-id'));
      const strip = document.getElementById('tpl-strip');
      res({ rows: rows.length, ids: rows,
            count: document.getElementById('count')?.innerText.replace(/\s+/g,' ').trim(),
            stripVisible: !!(strip && !strip.hidden && strip.getBoundingClientRect().height > 0),
            stripCards: [...(strip?.querySelectorAll('.tpl-card')||[])].map(c=>c.dataset.tpl),
            stripLead: (document.getElementById('tpl-strip-lead')?.innerText||'').replace(/\s+/g,' ').trim(),
            pressedChip: document.querySelector('#flt-scene button[aria-pressed="true"], .scene-more button[aria-pressed="true"]')?.getAttribute('data-scene'),
            parkedBar: [...document.querySelectorAll('[class*=park]')].map(e => e.innerText).join(' | ').slice(0,150) });
    }, 500));
  });
  await page.eval(() => { const q = document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); });
  await page.close();
}

// ── B. 截图：1440 空状态
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1400 });
  for (const [term, name] of [['餐厅','1440-restaurant'],['电商','1440-ecom'],['律师','1440-lawyer'],['诊所','1440-clinic']]) {
    await page.eval((t) => { const q = document.getElementById('q'); q.value = t; q.dispatchEvent(new Event('input', { bubbles: true })); }, term);
    await sleep(350);
    await page.screenshot({ path: `${OUT}/shots/${name}.png`, format: 'png' });
  }
  // 滚到模板卡
  await page.eval(() => { const q = document.getElementById('q'); q.value = '餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); });
  await sleep(300);
  await page.eval(() => { const c = document.querySelector('#empty-tpl .tpl-card'); if (c) scrollTo(0, c.getBoundingClientRect().top + scrollY - 120); });
  await sleep(250);
  await page.screenshot({ path: OUT + '/shots/1440-restaurant-tplcard.png', format: 'png' });
  await page.close();
}

// ── C. 截图：390 空状态（首屏 + 滚到模板卡）
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1600 });
  for (const [term, name] of [['餐厅','390-restaurant'],['电商','390-ecom']]) {
    await page.eval((t) => { const q = document.getElementById('q'); q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
      scrollTo(0,0); }, term);
    await sleep(400);
    await page.screenshot({ path: `${OUT}/shots/${name}-first.png`, format: 'png' });
  }
  await page.eval(() => { const q = document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); });
  await sleep(350);
  await page.eval(() => { const c = document.querySelector('#empty-tpl .tpl-card'); if (c) scrollTo(0, c.getBoundingClientRect().top + scrollY - 80); });
  await sleep(300);
  await page.screenshot({ path: OUT + '/shots/390-restaurant-tplcard.png', format: 'png' });
  await page.close();
}

// ── D. 截图：hard 案详情面板顶部（S18/S21 警告）
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1400 });
  for (const id of ['S21', 'S18']) {
    await page.eval((sid) => document.querySelector(`#ledger > li[data-id="${sid}"]`).click(), id);
    await sleep(700);
    await page.screenshot({ path: `${OUT}/shots/1440-detail-${id}.png`, format: 'png' });
    await page.eval(() => document.getElementById('d-close').click());
    await sleep(250);
  }
  // 详情面板底部：最后一个字段是什么（有没有模板出口）
  await page.eval(() => document.querySelector('#ledger > li[data-id="S21"]').click());
  await sleep(700);
  out.detailBottom = await page.eval(() => {
    const body = document.getElementById('d-body');
    const secs = [...body.children].map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,40),
      text: (e.innerText||'').replace(/\s+/g,' ').trim().slice(0,110) }));
    body.scrollTop = body.scrollHeight;
    return { nChildren: body.children.length, sections: secs,
             last: secs.slice(-3), hasTemplate: /模板|M0[123]/.test(body.innerText),
             bodyScrollH: body.scrollHeight, bodyClientH: body.clientHeight };
  });
  await page.screenshot({ path: OUT + '/shots/1440-detail-S21-bottom.png', format: 'png' });
  await page.close();
}

writeFileSync(OUT + '/probe-buttons.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
await b.close();
