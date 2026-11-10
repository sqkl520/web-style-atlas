// _p7_honest.mjs — 「首屏 0 完整卡」这个判据本身值不值得用：
//  (a) 滚多少像素才看到卡的第一行字（方案名/一句话定义才是选型用的信息）
//  (b) rail 是不是内滚陷阱（1406px 内容塞进 336px 框）
//  (c) 详情面板打开后 detail.scrollTop 是不是 0（解释 11.5px 的口径差）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const out = {};

const browser = await Browser.launch({ width: 1440, height: 900 });

// (a) 逐档滚动，数「屏上有几个方案名」
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1400 });
  out.scrollDepth = await p.eval(() => {
    const vh = innerHeight;
    const rows = Array.from(document.querySelectorAll('#ledger .row'));
    const res = [];
    for (const S of [0, 110, 150, 200, 250, 300, 400, 500, 688]) {
      window.scrollTo(0, S);
      const vis = (sel) => rows.filter((r) => {
        const e = r.querySelector(sel); if (!e) return false;
        const b = e.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= vh && b.height > 0;
      }).length;
      const anyPart = rows.filter((r) => {
        const b = r.getBoundingClientRect();
        return b.top < vh && b.bottom > 0;
      }).length;
      res.push({ S, anyCardOnScreen: anyPart, titlesFullyVisible: vis('.row-head h3'), defsFullyVisible: vis('.row-def'), imgsFullyVisible: vis('.shots .shot:first-child img') });
    }
    window.scrollTo(0, 0);
    return res;
  });
  // (b) rail 内滚陷阱
  out.railTrap = await p.eval(() => {
    const rail = document.querySelector('.rail');
    const groups = Array.from(rail.querySelectorAll('.rail-block'));
    const rr = rail.getBoundingClientRect();
    const visibleGroups = groups.filter((g) => { const b = g.getBoundingClientRect(); return b.top >= rr.top && b.bottom <= rr.bottom; });
    return {
      railH: +rr.height.toFixed(1), railScrollH: rail.scrollHeight, railClientH: rail.clientHeight,
      hiddenPx: rail.scrollHeight - rail.clientHeight,
      groupsTotal: groups.length,
      groupsFullyVisible: visibleGroups.length,
      groupsBelow: groups.length - visibleGroups.length,
      chipCount: rail.querySelectorAll('.chips button').length,
      // 第一个场景芯片组的高度（用户最该先看到的）
      firstBlockH: +(groups[0].getBoundingClientRect().height.toFixed(1)),
      // 页面级滚动 vs rail 内滚谁先响应：两者都是 overflow-y，手指落在 rail 上滚的是 rail
      railOverflow: getComputedStyle(rail).overflowY,
    };
  });
  await p.close();
}

// (c) detail 打开后的 scrollTop
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1400 });
  out.openScroll = await p.eval(() => {
    const d = document.getElementById('detail');
    const before = d.scrollTop;
    document.querySelector('.row[data-id="S01"]').click();
    const immediately = d.scrollTop;
    return { before, immediately };
  });
  await new Promise((r) => setTimeout(r, 500));
  out.openScroll.afterSettle = await p.eval(() => {
    const d = document.getElementById('detail');
    return { scrollTop: d.scrollTop, activeEl: document.activeElement.className, headTabindex: document.querySelector('.detail-head').getAttribute('tabindex') };
  });
  // 强制归零后再量首字段
  out.openScroll.zeroed = await p.eval(() => {
    const d = document.getElementById('detail');
    d.scrollTop = 0;
    const f = document.querySelector('#d-body .fields > .field');
    return { scrollTop: d.scrollTop, firstFieldTop: +f.getBoundingClientRect().top.toFixed(1), detailTop: +d.getBoundingClientRect().top.toFixed(1), fieldsDlTop: +document.querySelector('#d-body .fields').getBoundingClientRect().top.toFixed(1) };
  });
  await p.close();
}

// (d) 触控：390 档 rail 内滚时，页面滚动是否被抢
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1400 });
  out.touchTrap = await p.eval(() => {
    const rail = document.querySelector('.rail');
    const r = rail.getBoundingClientRect();
    const el = document.elementFromPoint(195, r.top + r.height / 2);
    return {
      railCenterRect: { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1) },
      elementAtRailCenter: el ? el.tagName + '.' + (el.className || '').toString().split(' ')[0] : null,
      insideRail: !!(el && el.closest('.rail')),
      // 视口里 rail 占的比例
      railShareOfViewport: +((Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight * 100).toFixed(1),
    };
  });
  await p.close();
}

writeFileSync(join(HERE, '_p7_honest.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
