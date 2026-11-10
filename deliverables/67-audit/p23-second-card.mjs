// p23-second-card.mjs — D2 之后第 2 张卡露出多少（我写进了 47.4px / 5.5%，核对一下）。
import { PAGE_NOW, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const D2 = `
  var st = document.createElement('style');
  st.textContent = '.shots .shot{position:relative}.shots .shot img{max-height:84px!important}'
    + '.shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1!important}.row-head .tag:not(.tag-fr):not(.tag-thr){display:none}'
    + '.row-foot .cap{display:none}.row{padding:10px 0!important}';
  document.head.appendChild(st);`;

const br = await Browser.launch({ width: 390, height: 844 });
const p = await br.newPage({ width: 390, height: 844, mobile: true });
await p.setViewport({ width: 390, height: 844, mobile: true });
await p.goto(PAGE_NOW, { settleMs: 1400 });
const r = await p.eval(`(async () => {
  ${INPAGE}
  await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
  new Function(${JSON.stringify(D2)})();
  await new Promise(function (x) { setTimeout(x, 200); });
  var vh = innerHeight;
  var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
  return rows.slice(0, 3).map(function (r, i) {
    var b = __M.rect(r);
    return { i: i, top: __M.px(b.top), h: __M.px(b.height), bottom: __M.px(b.bottom),
      visiblePx: __M.px(Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0))),
      visiblePct: __M.px(Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)) / b.height * 100),
      full: b.top >= 0 && b.bottom <= vh };
  });
})()`);
console.log(JSON.stringify(r, null, 1));
await br.close();
