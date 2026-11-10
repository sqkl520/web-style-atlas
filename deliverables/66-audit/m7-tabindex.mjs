// m7-tabindex.mjs — DOM 顺序里的可聚焦元素计数：到详情面板第一个控件要按多少次 Tab
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const COUNT = () => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const all = Array.from(document.querySelectorAll(sel)).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    // 折叠块内容在收起态不参与 Tab
    const p = el.closest('details:not([open])');
    if (p && !p.querySelector(':scope > summary')?.contains(el)) return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  });
  const detail = document.querySelector('#detail');
  const detailOpen = detail && !detail.hidden;
  const idx = all.findIndex((el) => detail.contains(el));
  const order = all.map((el) => ({
    tag: el.tagName.toLowerCase(),
    cls: (el.className || '').toString().slice(0, 28),
    inDetail: detail.contains(el),
    text: (el.textContent || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 20),
  }));
  return {
    total: all.length,
    firstInsideDetailIndex: idx >= 0 ? idx + 1 : null,
    detailTabCount: all.filter((el) => detail.contains(el)).length,
    beforeDetail: idx,
    detailOpen,
    groupCounts: {
      mast: all.filter((el) => el.closest('.mast')).length,
      rail: all.filter((el) => el.closest('.rail')).length,
      main: all.filter((el) => el.closest('.main')).length,
      detail: all.filter((el) => el.closest('#detail')).length,
    },
    order: order.slice(0, 12),
    orderTail: order.slice(-14),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1500 });
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); if (r) r.click(); document.getElementById('detail').scrollTop = 0; });
  await new Promise((r) => setTimeout(r, 300));
  out[vp.k] = await p.eval(COUNT);
  delete out[vp.k].order;
  delete out[vp.k].orderTail;
  // 展开全部折叠块后，detail 内可聚焦数量
  const expanded = await p.eval(() => {
    document.querySelectorAll('#detail details').forEach((d) => { d.open = true; });
    const all = Array.from(document.querySelectorAll('#detail a[href], #detail button, #detail input, #detail select, #detail summary')).filter((el) => el.getBoundingClientRect().height > 0);
    return { detailFocusablesExpanded: all.length };
  });
  out[vp.k].expanded = expanded;
  console.log(`[${vp.k}] total tabbables=${out[vp.k].total} 第一个进 detail 的序号=${out[vp.k].firstInsideDetailIndex} detail 内=${out[vp.k].detailTabCount} groups=${JSON.stringify(out[vp.k].groupCounts)} 全展开后 detail=${expanded.detailFocusablesExpanded}`);
  await p.close();
}
writeFileSync(join(HERE, 'data-m7-tabindex.json'), JSON.stringify(out, null, 1));
await browser.close();
