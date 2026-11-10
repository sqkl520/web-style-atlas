// p15-detail-account.mjs — 详情面板的闭合加总：head、body 顶部五块、首字段。
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
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  location.hash = '#S01'; await sleep(400);
  function account(sel) {
    var el = document.querySelector(sel);
    if (!el) return { sel: sel, missing: true };
    var c = __M.cs(el), rr = __M.rect(el);
    var pT = parseFloat(c.paddingTop)||0, pB = parseFloat(c.paddingBottom)||0;
    var bT = parseFloat(c.borderTopWidth)||0, bB = parseFloat(c.borderBottomWidth)||0;
    var rows = [], sum = 0, cursor = rr.top + bT + pT;
    Array.prototype.forEach.call(el.children, function (k) {
      var kc = __M.cs(k), kr = __M.rect(k);
      if (kc.display === 'none') { rows.push({ el: __M.label(k), h: 0, hidden: true }); return; }
      var mt = parseFloat(kc.marginTop)||0, mb = parseFloat(kc.marginBottom)||0;
      var gap = (kr.top - mt) - cursor;
      if (gap > 0.05) { rows.push({ kind: 'gap', h: __M.px(gap) }); sum += gap; }
      if (mt > 0.05) { rows.push({ kind: 'gap', h: __M.px(mt), note: 'margin-top' }); sum += mt; }
      rows.push({ el: __M.label(k), h: __M.px(kr.height), mt: mt, mb: mb, text: __M.txt(k, 30) });
      sum += kr.height;
      cursor = kr.bottom + mb;
      if (mb > 0.05) { rows.push({ kind: 'gap', h: __M.px(mb), note: 'margin-bottom' }); sum += mb; }
    });
    return { sel: sel, total: __M.px(rr.height), fixed: __M.px(bT + bB + pT + pB),
      pad: 'pt' + pT + ' pb' + pB + ' bt' + bT + ' bb' + bB,
      sum: __M.px(sum), residual: __M.px(rr.height - (bT + bB + pT + pB) - sum), rows: rows };
  }
  var out = {
    panel: { scrollH: document.querySelector('#detail').scrollHeight, clientH: document.querySelector('#detail').clientHeight },
    head: account('.detail-head'),
    body: account('#d-body'),
    fields: account('#d-body .fields'),
    firstField: account('#d-body .fields > .field'),
    cta: account('.prompt-cta'),
    firstFieldTop: __M.px(__M.rect(document.querySelector('#d-body .fields > .field')).top - __M.rect(document.querySelector('#detail')).top),
    fieldsTop: __M.px(__M.rect(document.querySelector('#d-body .fields')).top - __M.rect(document.querySelector('#detail')).top),
    bodyTop: __M.px(__M.rect(document.querySelector('#d-body')).top - __M.rect(document.querySelector('#detail')).top)
  };
  return out;
})()`);
function dump(a) {
  if (a.missing) { console.log(`(缺失 ${a.sel})`); return; }
  console.log(`\n=== ${a.sel}  总=${a.total}  固定=${a.fixed}(${a.pad})  内容=${a.sum}  残差=${a.residual}`);
  for (const x of a.rows) {
    if (x.kind === 'gap') { console.log(`    · ${x.note || '间隙'} ${x.h}`); continue; }
    if (x.hidden) { console.log(`    (隐藏) ${x.el}`); continue; }
    console.log(`    h=${String(x.h).padStart(7)}  ${x.el.padEnd(38)} ${x.text ? '«' + x.text + '»' : ''}`);
  }
}
console.log('panel: ' + JSON.stringify(r.panel));
console.log('bodyTop=' + r.bodyTop + '  fieldsTop=' + r.fieldsTop + '  firstFieldTop=' + r.firstFieldTop);
dump(r.head); dump(r.body); dump(r.fields); dump(r.firstField); dump(r.cta);
await br.close();
