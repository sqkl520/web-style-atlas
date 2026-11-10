// m6-touch.mjs — 触控目标 / 键盘 Tab 顺序 / 溢出与重叠（390×844 与 1440×900）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const TARGETS = () => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const all = Array.from(document.querySelectorAll(sel)).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  });
  const info = (el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 40),
      id: el.id || '',
      text: (el.textContent || el.getAttribute('aria-label') || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 26),
      w: +b.width.toFixed(1), h: +b.height.toFixed(1),
      top: +b.top.toFixed(1), left: +b.left.toFixed(1),
      pad: cs.padding, font: cs.fontSize,
    };
  };
  const list = all.map(info);
  const under24 = list.filter((x) => x.w < 24 || x.h < 24);
  const under44 = list.filter((x) => x.w < 44 || x.h < 44);
  // 重叠检测（同一坐标系下矩形相交面积 > 25% 较小者）
  const overlaps = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i].getBoundingClientRect(), b = all[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1 && oy > 1) {
        const area = ox * oy;
        const smaller = Math.min(a.width * a.height, b.width * b.height);
        if (area / smaller > 0.25) {
          overlaps.push({ a: info(all[i]), b: info(all[j]), ratio: +(area / smaller).toFixed(2) });
        }
      }
    }
  }
  return { count: list.length, list, under24, under44, overlaps: overlaps.slice(0, 12), overlapCount: overlaps.length };
};

// Tab 顺序：真实按 Tab 键，记录焦点落点
const focusSeq = async (page, n) => {
  const seq = [];
  await page.eval(() => { document.body.focus(); if (document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < n; i++) {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await new Promise((r) => setTimeout(r, 45));
    const cur = await page.eval(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const d = document.querySelector('#detail');
      const inDetail = d && !d.hidden && d.contains(a);
      return {
        tag: a.tagName.toLowerCase(),
        cls: (a.className || '').toString().slice(0, 34),
        id: a.id || '',
        text: (a.textContent || a.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 22),
        inDetail: !!inDetail,
      };
    });
    seq.push(cur);
  }
  return seq;
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString() };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  // A. 列表页
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1500 });
  const listTargets = await p.eval(TARGETS);
  const seqList = await focusSeq(p, 60);
  const firstSummaryIdx = seqList.findIndex((s) => s && s.tag === 'summary');
  out[vp.k] = {
    list: {
      targetCount: listTargets.count,
      under24: listTargets.under24.length,
      under44: listTargets.under44.length,
      under24Sample: listTargets.under24.slice(0, 20),
      under44Sample: listTargets.under44.slice(0, 24),
      overlapCount: listTargets.overlapCount,
      overlaps: listTargets.overlaps,
      // 按类别的尺寸分布
      byTag: (() => {
        const m = {};
        listTargets.list.forEach((x) => { (m[x.tag] = m[x.tag] || []).push(x); });
        return Object.fromEntries(Object.entries(m).map(([k, a]) => [k, {
          n: a.length,
          minH: Math.min(...a.map((x) => x.h)), maxH: Math.max(...a.map((x) => x.h)),
          minW: Math.min(...a.map((x) => x.w)),
          avgH: +(a.map((x) => x.h).reduce((p2, q) => p2 + q, 0) / a.length).toFixed(1),
        }]));
      })(),
    },
    focusList: seqList,
    firstSummaryTabIndex: firstSummaryIdx >= 0 ? firstSummaryIdx + 1 : null,
  };

  // B. 详情面板（打开 S01）
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); if (r) r.click(); document.getElementById('detail').scrollTop = 0; });
  await new Promise((r) => setTimeout(r, 300));
  const detailTargets = await p.eval(TARGETS);
  const seqDetail = await focusSeq(p, 70);
  out[vp.k].detail = {
    targetCount: detailTargets.count,
    under24: detailTargets.under24.length,
    under44: detailTargets.under44.length,
    under24Sample: detailTargets.under24.slice(0, 24),
    under44Sample: detailTargets.under44.slice(0, 30),
    overlapCount: detailTargets.overlapCount,
    overlaps: detailTargets.overlaps,
    byTag: (() => {
      const m = {};
      detailTargets.list.forEach((x) => { (m[x.tag] = m[x.tag] || []).push(x); });
      return Object.fromEntries(Object.entries(m).map(([k, a]) => [k, {
        n: a.length,
        minH: Math.min(...a.map((x) => x.h)), maxH: Math.max(...a.map((x) => x.h)),
        minW: Math.min(...a.map((x) => x.w)),
        avgH: +(a.map((x) => x.h).reduce((p2, q) => p2 + q, 0) / a.length).toFixed(1),
      }]));
    })(),
    summaries: detailTargets.list.filter((x) => x.tag === 'summary').map((x) => ({ text: x.text, h: x.h, w: x.w })),
    inputs: detailTargets.list.filter((x) => x.tag === 'input').map((x) => ({ text: x.text, h: x.h, w: x.w })),
    buttons: detailTargets.list.filter((x) => x.tag === 'button').map((x) => ({ text: x.text, h: x.h, w: x.w })),
    sel: detailTargets.list.filter((x) => x.tag === 'select').map((x) => ({ text: x.text, h: x.h, w: x.w })),
    links: detailTargets.list.filter((x) => x.tag === 'a').map((x) => ({ text: x.text, h: x.h, w: x.w })),
  };
  out[vp.k].focusDetail = seqDetail;
  // 第一个在 detail 内的 Tab 序号
  const idxFirstInDetail = seqDetail.findIndex((s) => s && s.inDetail);
  out[vp.k].firstTabIntoDetail = idxFirstInDetail >= 0 ? idxFirstInDetail + 1 : null;
  // 文本溢出 / 横向滚动
  out[vp.k].overflow = await p.eval(() => {
    const d = document.getElementById('detail');
    const out = [];
    document.querySelectorAll('#detail *').forEach((el) => {
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1) {
        out.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 30), sw: el.scrollWidth, cw: el.clientWidth, text: (el.textContent || '').trim().slice(0, 40) });
      }
    });
    const de = document.documentElement;
    return { detailScrollX: d.scrollWidth - d.clientWidth, docScrollX: de.scrollWidth - de.clientWidth, textOverflows: out.slice(0, 15) };
  });
  await p.close();
}

writeFileSync(join(HERE, 'data-m6-touch.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m6-touch.json');
for (const k of ['390', '1440']) {
  const o = out[k];
  console.log(`[${k}] list targets=${o.list.targetCount} <24=${o.list.under24} <44=${o.list.under44} overlaps=${o.list.overlapCount} firstSummaryTab=${o.firstSummaryTabIndex}`);
  console.log(`[${k}] detail targets=${o.detail.targetCount} <24=${o.detail.under24} <44=${o.detail.under44} overlaps=${o.detail.overlapCount} firstTabIntoDetail=${o.firstTabIntoDetail}`);
  console.log(`[${k}] byTag`, JSON.stringify(o.detail.byTag));
  console.log(`[${k}] summary h`, JSON.stringify(o.detail.summaries));
  console.log(`[${k}] inputs`, JSON.stringify(o.detail.inputs));
  console.log(`[${k}] buttons`, JSON.stringify(o.detail.buttons.slice(0, 8)));
}
