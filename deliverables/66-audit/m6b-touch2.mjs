// m6b-touch2.mjs — 触控目标重测：按「图层」分组算重叠（#detail 是 fixed 覆盖层，跨层相交不是真正遮挡）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const TARGETS = () => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const detail = document.getElementById('detail');
  const detailOpen = detail && !detail.hidden;
  const layerOf = (el) => (detailOpen && detail.contains(el) ? 'detail' : 'page');
  const all = Array.from(document.querySelectorAll(sel)).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const p = el.closest('details:not([open])');
    if (p && !(p.querySelector(':scope > summary') || p).contains(el)) return false;
    const b = el.getBoundingClientRect();
    if (!(b.width > 0 && b.height > 0)) return false;
    if (b.right < -1 || b.left > window.innerWidth + 1) return false; // 屏外（.skip）
    if (layerOf(el) === 'page' && detailOpen) return false; // 被浮层压住的页面元素不可点
    return true;
  });
  const info = (el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(), layer: layerOf(el),
      cls: (el.className || '').toString().slice(0, 34), id: el.id || '',
      text: (el.textContent || el.getAttribute('aria-label') || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 24),
      w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +b.top.toFixed(1), left: +b.left.toFixed(1),
      pad: cs.padding, font: cs.fontSize,
    };
  };
  const list = all.map(info);
  // 重叠：只在同层内算
  const overlaps = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (layerOf(all[i]) !== layerOf(all[j])) continue;
      const a = all[i].getBoundingClientRect(), b = all[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1.5 && oy > 1.5) {
        const area = ox * oy, smaller = Math.min(a.width * a.height, b.width * b.height);
        if (area / smaller > 0.3) overlaps.push({ a: info(all[i]), b: info(all[j]), ratio: +(area / smaller).toFixed(2) });
      }
    }
  }
  const byTag = {};
  list.forEach((x) => { (byTag[x.tag] = byTag[x.tag] || []).push(x); });
  return {
    count: list.length,
    list,
    under24: list.filter((x) => x.h < 24 || x.w < 24),
    under24Not44: list.filter((x) => x.h >= 24 && x.w >= 24 && (x.h < 44 || x.w < 44)),
    under44: list.filter((x) => x.h < 44 || x.w < 44),
    overlaps, overlapCount: overlaps.length,
    byTag: Object.fromEntries(Object.entries(byTag).map(([k, a]) => [k, {
      n: a.length, minH: Math.min(...a.map((x) => x.h)), maxH: Math.max(...a.map((x) => x.h)),
      minW: Math.min(...a.map((x) => x.w)), avgH: +(a.reduce((p, q) => p + q.h, 0) / a.length).toFixed(1),
    }])),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vps[vp.k] = { listPage: await p.eval(TARGETS) };
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); if (r) r.click(); document.getElementById('detail').scrollTop = 0; });
  await new Promise((r) => setTimeout(r, 300));
  out.vps[vp.k].detailPage = await p.eval(TARGETS);
  // 只保留 detail 层
  out.vps[vp.k].detailOnly = await p.eval(() => {
    const d = document.getElementById('detail');
    const els = Array.from(d.querySelectorAll('a[href], button, input, select, summary')).filter((el) => el.getBoundingClientRect().height > 0);
    const info = (el) => { const b = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 30), text: (el.textContent || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 26), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    return els.map(info);
  });
  const lp = out.vps[vp.k].listPage, dp = out.vps[vp.k].detailPage;
  console.log(`[${vp.k}] 列表层 ${lp.count} 个可点元素: <24=${lp.under24.length} 24–43=${lp.under24Not44.length} 重叠=${lp.overlapCount}`);
  console.log(`[${vp.k}] 详情层 ${dp.count} 个可点元素: <24=${dp.under24.length} 24–43=${dp.under24Not44.length} 重叠=${dp.overlapCount}`);
  console.log(`[${vp.k}] byTag(detail) ${JSON.stringify(dp.byTag)}`);
  if (lp.overlaps.length) console.log(`[${vp.k}] 列表重叠样例`, JSON.stringify(lp.overlaps.slice(0, 4)));
  if (dp.overlaps.length) console.log(`[${vp.k}] 详情重叠样例`, JSON.stringify(dp.overlaps.slice(0, 4)));
  await p.close();
}
writeFileSync(join(HERE, 'data-m6b-touch.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m6b-touch.json');
