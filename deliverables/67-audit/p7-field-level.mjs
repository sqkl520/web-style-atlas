// p7-field-level.mjs — 逐字段高度 + C9 报错复现。目的：核实 C8「8.2 个完整字段」是不是真的。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

const W = 390, H = 844;

const PROBE = (css, js) => `(async () => {
  ${INPAGE}
  var st = document.createElement('style'); st.textContent = ${JSON.stringify(css)}; document.head.appendChild(st);
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  location.hash = '#S01'; await sleep(120);
  var err = null;
  try { new Function(${JSON.stringify(js)})(); } catch (e) { err = String(e); }
  await sleep(120);
  var d = document.querySelector('#detail'), base = __M.rect(d).top, vh = innerHeight;
  var fs = Array.prototype.map.call(d.querySelectorAll('#d-body .fields > .field'), function (f) {
    var dt = f.querySelector(':scope > dt'), det = f.querySelector(':scope > details');
    var ddEl = f.querySelector(':scope > dd') || (det ? det.querySelector('dd') : null);
    var r = __M.rect(f);
    return { label: dt ? dt.textContent.trim() : (det ? det.querySelector('summary').textContent.trim() : '?'),
      h: __M.px(r.height), top: __M.px(r.top - base), bottom: __M.px(r.bottom - base),
      folded: !!det, chars: ddEl ? ddEl.textContent.length : 0, inView: r.top >= 0 && r.bottom <= vh };
  });
  return { err: err, scrollH: d.scrollHeight, fieldsH: (function(){var e=d.querySelector('.fields');return e?__M.px(__M.rect(e).height):0;})(),
    fields: fs, sumH: __M.px(fs.reduce(function(a,b){return a+b.h;},0)) };
})()`;

async function run(css, js) {
  const b = await launchPage(W, H);
  await gotoSelection(b.page);
  const r = await b.page.eval(PROBE(css, js));
  await b.browser.close();
  return r;
}

const R10 = `
  var cta = document.querySelector('.prompt-cta');
  var det = document.createElement('details');
  var s = document.createElement('summary');
  s.textContent = '复制 AI 提示词 · 粘给 ChatGPT / Claude / v0 都行';
  s.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:10px 0;border-bottom:2px solid var(--ink)';
  cta.parentNode.insertBefore(det, cta); det.appendChild(s); det.appendChild(cta);
  var folds = Array.prototype.slice.call(document.querySelectorAll('#d-body > details.fold'));
  if (folds.length) {
    var d2 = document.createElement('details');
    var s2 = document.createElement('summary');
    s2.textContent = '证据：截图预览 / 闸门报告 / 上站文案';
    s2.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:5px 0;border-top:2px solid var(--ink)';
    folds[0].parentNode.insertBefore(d2, folds[0]); d2.appendChild(s2);
    var box = document.createElement('div');
    folds.forEach(function (f) { f.open = true; box.appendChild(f); });
    d2.appendChild(box);
  }`;

const R3 = `
  var LAST = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  Array.prototype.forEach.call(document.querySelectorAll('#d-body .fields > .field'), function (f) {
    var dt = f.querySelector(':scope > dt'); if (!dt || LAST.indexOf(dt.textContent.trim()) < 0) return;
    var dd = f.querySelector(':scope > dd');
    var det = document.createElement('details');
    var s = document.createElement('summary');
    s.textContent = dt.textContent + '（' + dd.textContent.length + ' 字，点开读）';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  });`;

const R9 = `
  var fs = Array.prototype.slice.call(document.querySelectorAll('#d-body .fields > .field'));
  fs.sort(function (a, b) { return b.getBoundingClientRect().height - a.getBoundingClientRect().height; });
  fs.slice(0, 2).forEach(function (f) {
    var dt = f.querySelector(':scope > dt'); if (!dt) return;
    var dd = f.querySelector(':scope > dd');
    var det = document.createElement('details');
    var s = document.createElement('summary');
    s.textContent = dt.textContent + '（' + dd.textContent.length + ' 字，点开读）';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  });`;

const R6 = `.detail-head{padding:8px 12px!important;gap:8px!important;align-items:center!important}
            .detail-no{font-size:17px!important}.detail-title h2{font-size:19px!important}
            .detail-title p{display:none!important}#d-close{padding:4px 8px!important}`;

const cases = {
  V0: ['', ''],
  R10only: ['', R10],
  C8: ['', R10 + '\n' + R9 + '\n' + R6],
  C9: ['', R10 + '\n' + R3 + '\n' + R6]
};

for (const [k, [css, js]] of Object.entries(cases)) {
  const r = await run(css, js);
  console.log(`\n===== ${k}  err=${r.err}  scrollH=${r.scrollH}  fieldsH=${r.fieldsH}  字段高之和=${r.sumH}`);
  for (const f of r.fields) {
    console.log(`  ${f.inView ? '✓' : ' '} ${String(f.top).padStart(6)} h=${String(f.h).padStart(6)} ${f.folded ? '[折]' : '    '} ${String(f.chars).padStart(5)}字  ${f.label}`);
  }
  writeFileSync(join(HERE, `data-p7-${k}.json`), JSON.stringify(r, null, 2), 'utf8');
}
