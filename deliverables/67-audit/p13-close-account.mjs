// p13-close-account.mjs — 严丝合缝的加总校验：mast / rail / bar 三块，每一行可相加且合计相等。
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const URL = 'file:///' + join(HERE, 'frozen-now', 'index.html').replace(/\\/g, '/');
const br = await Browser.launch({ width: 390, height: 844 });
const p = await br.newPage({ width: 390, height: 844, mobile: true });
await p.setViewport({ width: 390, height: 844, mobile: true });
await p.goto(URL, { settleMs: 1200 });
const r = await p.eval(`(async () => {
  ${INPAGE}
  await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
  function account(sel) {
    var el = document.querySelector(sel);
    var c = __M.cs(el), rr = __M.rect(el);
    var pT = parseFloat(c.paddingTop)||0, pB = parseFloat(c.paddingBottom)||0;
    var bT = parseFloat(c.borderTopWidth)||0, bB = parseFloat(c.borderBottomWidth)||0;
    var cursor = rr.top + bT + pT;
    var rows = [];
    Array.prototype.forEach.call(el.children, function (k) {
      var kc = __M.cs(k), kr = __M.rect(k);
      if (kc.display === 'none') { rows.push({ el: __M.label(k), kind: 'none', h: 0 }); return; }
      var gap = kr.top - cursor;
      if (gap > 0.05) rows.push({ el: '(间隙)', kind: 'gap', h: __M.px(gap) });
      var mt = parseFloat(kc.marginTop)||0;
      if (mt > 0.05 && kr.top - cursor > 0.05) {} // 间隙即外边距
      rows.push({ el: __M.label(k), kind: 'box', h: __M.px(kr.height),
        text: __M.txt(k, 26),
        inner: kc.display === 'flex' ? Array.prototype.map.call(k.children, function (x) {
          var xr = __M.rect(x), xc = __M.cs(x);
          return { el: __M.label(x), h: __M.px(xr.height), topRel: __M.px(xr.top - kr.top), display: xc.display, text: __M.txt(x, 20) };
        }) : null });
      cursor = kr.bottom + parseFloat(kc.marginBottom||0);
    });
    var tail = (rr.top + rr.height - bB - pB) - cursor + (parseFloat(__M.cs(el.lastElementChild).marginBottom)||0);
    return { sel: sel, total: __M.px(rr.height), borderTop: bT, borderBottom: bB,
      padTop: pT, padBottom: pB, rows: rows,
      sum: __M.px(bT + bB + pT + pB + rows.reduce(function (a, x) { return a + x.h; }, 0)),
      innerScroll: el.scrollHeight };
  }
  return [account('.mast'), account('.rail'), account('.bar'), account('#ledger .row')];
})()`);
for (const a of r) {
  console.log(`\n=== ${a.sel}  总高=${a.total}  核算合计=${a.sum}  ${a.sum === a.total ? '✓闭合' : '✗差 ' + (a.total - a.sum).toFixed(1)}`);
  console.log(`    border ${a.borderTop}/${a.borderBottom}  padding ${a.padTop}/${a.padBottom}`);
  for (const x of a.rows) {
    console.log(`    ${x.kind === 'gap' ? '·' : ' '} h=${String(x.h).padStart(7)}  ${x.kind === 'gap' ? '间隙/外边距' : x.el.padEnd(30)} ${x.text ? '«' + x.text + '»' : ''}`);
    if (x.inner && x.inner.length) {
      for (const y of x.inner) console.log(`         └ rel=${String(y.topRel).padStart(6)} h=${String(y.h).padStart(6)} ${y.el} «${y.text}»`);
    }
  }
}
await br.close();
