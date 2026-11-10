// 探针 10：模板的可发现性 —— 搜「M02」「模板」能不能搜到？芯片角标有没有？模板带在 390 的落点？
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── A. 1440：搜「M02」「模板」「企业」「理发」「templates」
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1400 });
  out.searchForTemplate = {};
  for (const t of ['M02', '模板', '企业', '理发', 'templates', 'tpl']) {
    out.searchForTemplate[t] = await page.eval((term) => {
      const q = document.getElementById('q'); q.value = term; q.dispatchEvent(new Event('input', { bubbles: true }));
      const strip = document.getElementById('tpl-strip');
      const etpl = document.getElementById('empty-tpl');
      return {
        rows: document.querySelectorAll('#ledger > li').length,
        count: (document.getElementById('count')?.innerText || '').replace(/\s+/g, ' ').trim(),
        stripVisible: !!(strip && !strip.hidden),
        etplVisible: !!(etpl && !etpl.hidden),
        etplCards: [...(etpl?.querySelectorAll('.tpl-card') || [])].map(c => c.dataset.tpl),
        emptyHead: (etpl?.querySelector('.tpl-empty-head')?.innerText || '').slice(0, 160),
      };
    }, t);
  }
  // ── B. 芯片角标
  out.chipBadges = await page.eval(() => {
    const all = [...document.querySelectorAll('#flt-scene button, .scene-more button')];
    return all.map(b => ({ term: b.getAttribute('data-scene'),
      cls: String(b.className),
      badge: b.querySelector('.scene-tpl')?.innerText || null,
      title: b.getAttribute('title') })).filter(x => x.badge);
  });
  await page.close();
}

// ── C. 390：点「餐厅」芯片后，模板带的落点（在 #ledger 之前）
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1600 });
  out.m390chip = await page.eval(() => {
    const vh = innerHeight;
    // 点餐厅芯片（在折叠区里，需要先展开；但 click 不需要可见）
    const btn = document.querySelector('.scene-more button[data-scene="餐厅"]');
    if (btn) btn.click();
    const pos = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { docTop: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1),
               screens: +((r.top + scrollY) / vh).toFixed(2),
               visibleInFirstScreen: Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) }; };
    return new Promise(res => setTimeout(() => res({
      vh, count: (document.getElementById('count')?.innerText || '').replace(/\s+/g, ' ').trim(),
      rows: document.querySelectorAll('#ledger > li').length,
      strip: pos('#tpl-strip'), stripLead: pos('#tpl-strip-lead'),
      firstCard: pos('#tpl-strip .tpl-card'), firstRow: pos('#ledger > li'),
      openLink: pos('#tpl-strip .tpl-open'),
      leadText: (document.getElementById('tpl-strip-lead')?.innerText || '').replace(/\s+/g, ' ').trim(),
      ledgerTop: pos('#ledger'),
    }), 600));
  });
  await page.eval(() => scrollTo(0, 0));
  await sleep(250);
  await page.screenshot({ path: OUT + '/shots/390-chip-restaurant-first.png', format: 'png' });
  await page.eval(() => { const s = document.getElementById('tpl-strip'); if (s) scrollTo(0, s.getBoundingClientRect().top + scrollY - 40); });
  await sleep(250);
  await page.screenshot({ path: OUT + '/shots/390-chip-restaurant-strip.png', format: 'png' });
  await page.close();
}

writeFileSync(OUT + '/probe-discover.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
