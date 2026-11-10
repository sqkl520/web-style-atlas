// lib-measure.mjs — 67-audit 共用测量件。零依赖，走仓库自带 CDP。
// 关键点：Browser.launch({width}) 只改 Chrome 的 --window-size，不改页面视口，
// 必须再调 page.setViewport({width,height,mobile:true})。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
export const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
// 工作区实时页（可能正在被别的 Agent 改动；报告里必须标明测的是哪一份）
export const PAGE_LIVE = PAGE;
// 快照：审计期间仓库被并发修改，所有方案矩阵都对着这三份快照跑，保证组内可比。
//   frozen/     = git HEAD（改动前）
//   frozen-now/ = 2026-10-27T17:36Z 的工作区（长字段折叠 + 页头/筛选折叠已落地）
export const PAGE_HEAD = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');
export const PAGE_NOW = 'file:///' + join(HERE, 'frozen-now', 'index.html').replace(/\\/g, '/');

export async function launchPage(width, height, { mobile = width <= 620 } = {}) {
  const browser = await Browser.launch({ width, height });
  const page = await browser.newPage({ width, height, mobile });
  await page.setViewport({ width, height, mobile });
  return { browser, page };
}

export async function gotoSelection(page) {
  await page.goto(PAGE, { settleMs: 900 });
  await page.eval(`(async () => {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch {} }
    return document.querySelectorAll('#ledger .row').length;
  })()`);
  return page;
}

// 页面内注入的测量函数库。每次 eval 前 append 到表达式尾部。
export const INPAGE = `
window.__M = (function () {
  var px = function (v) { return Math.round(v * 10) / 10; };
  function rect(el) { return el.getBoundingClientRect(); }
  function cs(el) { return getComputedStyle(el); }
  function label(el) {
    var t = (el.tagName || '').toLowerCase();
    var c = (el.getAttribute && el.getAttribute('class') || '').trim();
    var id = (el.getAttribute && el.getAttribute('id')) || '';
    return t + (id ? '#' + id : '') + (c ? '.' + c.split(/\\s+/).join('.') : '');
  }
  function txt(el, n) {
    var s = (el.textContent || '').replace(/\\s+/g, ' ').trim();
    return s.length > (n || 40) ? s.slice(0, n || 40) + '…' : s;
  }
  // 一个容器的高度账：padding + 子元素(+间隙) + border。返回可核对的分解。
  function stack(sel, opts) {
    opts = opts || {};
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return { missing: true, sel: String(sel) };
    var c = cs(el), r = rect(el);
    var pT = parseFloat(c.paddingTop) || 0, pB = parseFloat(c.paddingBottom) || 0;
    var bT = parseFloat(c.borderTopWidth) || 0, bB = parseFloat(c.borderBottomWidth) || 0;
    var kids = [];
    var prevBottom = r.top + bT + pT;
    Array.prototype.forEach.call(el.children, function (k) {
      var kc = cs(k), kr = rect(k);
      if (kc.display === 'none') { kids.push({ el: label(k), h: 0, hidden: true, text: txt(k, 30) }); return; }
      var gap = kr.top - prevBottom;
      kids.push({
        el: label(k), top: px(kr.top - r.top), h: px(kr.height),
        gapBefore: px(gap),
        mt: kc.marginTop, mb: kc.marginBottom, pt: kc.paddingTop, pb: kc.paddingBottom,
        display: kc.display, fs: kc.fontSize, lh: kc.lineHeight,
        lines: kc.lineHeight && parseFloat(kc.lineHeight) > 0 ? Math.round(kr.height / parseFloat(kc.lineHeight) * 10) / 10 : null,
        text: opts.text === false ? undefined : txt(k, opts.textLen || 34)
      });
      prevBottom = kr.bottom;
    });
    var kidsSum = kids.reduce(function (a, k) { return a + (k.h || 0) + (k.gapBefore || 0); }, 0);
    var tail = (r.top + r.height - bB - pB) - prevBottom;
    return {
      el: label(el), top: px(r.top), h: px(r.height),
      padTop: px(pT), padBottom: px(pB), borderTop: px(bT), borderBottom: px(bB),
      borderLeft: px(parseFloat(c.borderLeftWidth) || 0),
      gap: c.rowGap + ' / ' + c.columnGap,
      display: c.display, gridCols: c.gridTemplateColumns,
      maxHeight: c.maxHeight, overflowY: c.overflowY,
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
      kids: kids, kidsSum: px(kidsSum), tailPad: px(tail),
      accounted: px(pT + pB + bT + bB + kidsSum + tail)
    };
  }
  // 扁平遍历：所有有高度的元素，用于「不漏任何一块」
  function all(sel, minH, maxTop) {
    var host = sel ? document.querySelector(sel) : document.body;
    if (!host) return [];
    var out = [], i = 0;
    var walk = function (el, depth) {
      var r = rect(el), c = cs(el);
      if (c.display === 'none') return;
      if (r.height > (minH || 0)) {
        out.push({
          i: i++, d: depth, el: label(el), top: px(r.top), bottom: px(r.bottom), h: px(r.height),
          w: px(r.width), fs: c.fontSize, lh: c.lineHeight, pos: c.position,
          lines: parseFloat(c.lineHeight) > 0 ? Math.round(r.height / parseFloat(c.lineHeight) * 10) / 10 : null,
          text: txt(el, 44)
        });
      }
      if (maxTop != null && r.top > maxTop) return;
      Array.prototype.forEach.call(el.children, function (k) { walk(k, depth + 1); });
    };
    walk(host, 0);
    return out;
  }
  return { px: px, rect: rect, cs: cs, label: label, txt: txt, stack: stack, all: all };
})();
window.__V = { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio };
`;

export const PAGE_STATE = `
JSON.stringify({
  vw: window.innerWidth, vh: window.innerHeight,
  docScrollH: document.documentElement.scrollHeight,
  bodyScrollH: document.body.scrollHeight,
  rows: document.querySelectorAll('#ledger .row').length,
  hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
});
`;
