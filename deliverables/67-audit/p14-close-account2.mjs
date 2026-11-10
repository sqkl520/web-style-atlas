// p14-close-account2.mjs — 网格感知的加总校验（bar / row 是 grid，子元素会并排，不能用光标累加）。
// 做法：按 grid 行分组（同一 top 视为同一行），行高取该行 max，行间取间距。
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const URL = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');
const br = await Browser.launch({ width: 390, height: 844 });
const p = await br.newPage({ width: 390, height: 844, mobile: true });
await p.setViewport({ width: 390, height: 844, mobile: true });
await p.goto(URL, { settleMs: 1300 });
const r = await p.eval(`(async () => {
  ${INPAGE}
  await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
  function account(sel) {
    var el = document.querySelector(sel);
    var c = __M.cs(el), rr = __M.rect(el);
    var pT = parseFloat(c.paddingTop)||0, pB = parseFloat(c.paddingBottom)||0;
    var bT = parseFloat(c.borderTopWidth)||0, bB = parseFloat(c.borderBottomWidth)||0;
    var isGrid = /grid/.test(c.display), isFlex = /flex/.test(c.display);
    var kids = Array.prototype.filter.call(el.children, function (k) { return __M.cs(k).display !== 'none'; })
      .map(function (k) { var kr = __M.rect(k), kc = __M.cs(k);
        return { el: __M.label(k), top: kr.top, bottom: kr.bottom, h: kr.height, w: kr.width,
          mt: parseFloat(kc.marginTop)||0, mb: parseFloat(kc.marginBottom)||0, text: __M.txt(k, 26) }; });
    if (isFlex) { kids.sort(function (a, b) { return a.top - b.top || a.w - b.w; }); }
    else { kids.sort(function (a, b) { return a.top - b.top || a.w - b.w; }); }
    // 按 top 聚成「行」
    var lines = [];
    kids.forEach(function (k) {
      var ln = lines[lines.length - 1];
      if (ln && Math.abs(k.top - ln.top) < 2) { ln.items.push(k); ln.bottom = Math.max(ln.bottom, k.bottom); }
      else lines.push({ top: k.top, bottom: k.bottom, items: [k] });
    });
    var cursor = rr.top + bT + pT;
    var rows = [], sumH = 0;
    lines.forEach(function (ln) {
      var gap = ln.top - cursor;
      if (gap > 0.05) { rows.push({ kind: 'gap', h: __M.px(gap) }); sumH += gap; }
      var h = ln.bottom - ln.top;
      rows.push({ kind: 'line', h: __M.px(h), items: ln.items.map(function (x) { return { el: x.el, h: __M.px(x.h), w: __M.px(x.w), text: x.text }; }) });
      sumH += h;
      cursor = ln.bottom;
    });
    // 尾部：最后一个元素的下外边距 + 剩余 padding
    var lastMb = kids.length ? kids[kids.length - 1].mb : 0;
    var total = rr.height;
    var fixed = bT + bB + pT + pB;
    return { sel: sel, total: __M.px(total), fixed: __M.px(fixed), sumH: __M.px(sumH),
      residual: __M.px(total - fixed - sumH), rows: rows,
      pad: pT + '/' + pB + ' border ' + bT + '/' + bB, scrollH: el.scrollHeight, clientH: el.clientHeight };
  }
  return [account('.mast'), account('.mast-id'), account('.rail'), account('.bar'), account('#ledger .row'), account('#ledger .row .row-main')];
})()`);
for (const a of r) {
  console.log(`\n=== ${a.sel}  总高=${a.total}  固定(${a.pad})=${a.fixed}  内容=${a.sumH}  残差=${a.residual}`);
  for (const x of a.rows) {
    if (x.kind === 'gap') { console.log(`    · 间隙 ${x.h}`); continue; }
    console.log(`    行高 ${String(x.h).padStart(7)}  ` + x.items.map((i) => `${i.el}[${i.h}/w${i.w}]`).join('  '));
  }
}
await br.close();
