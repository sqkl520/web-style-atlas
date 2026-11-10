// p20-lever-on-head.mjs — 在 HEAD 基线上单独量 A1（折 claim+exit）与 D2（行卡图 84），
// 因为 §1.1 与 §7.1 引用的这两个数曾在仓库漂移期间采过，需要重测一次。
import { join } from 'node:path';
import { HERE, PAGE_HEAD, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const A1 = `
  var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit');
  var d = document.createElement('details');
  var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 想直接拿现成模板去哪';
  s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6;min-height:25.8px';
  claim.parentNode.insertBefore(d, claim); d.appendChild(s);
  var box = document.createElement('div'); box.appendChild(claim); box.appendChild(exit); d.appendChild(box);`;

const D2 = `
  var st = document.createElement('style');
  st.textContent = '.shots .shot{position:relative}.shots .shot img{max-height:84px!important}'
    + '.shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1!important}.row-head .tag:not(.tag-fr):not(.tag-thr){display:none}'
    + '.row-foot .cap{display:none}.row{padding:10px 0!important}';
  document.head.appendChild(st);`;

for (const [name, js] of [['A1', A1], ['D2', D2]]) {
  const br = await Browser.launch({ width: 390, height: 844 });
  const p = await br.newPage({ width: 390, height: 844, mobile: true });
  await p.setViewport({ width: 390, height: 844, mobile: true });
  await p.goto(PAGE_HEAD, { settleMs: 1400 });
  const r = await p.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    new Function(${JSON.stringify(js)})();
    await new Promise(function (r) { setTimeout(r, 200); });
    var R = function (s) { var e = document.querySelector(s); return e ? __M.px(__M.rect(e).height) : null; };
    var T = function (s) { var e = document.querySelector(s); return e ? __M.px(__M.rect(e).top) : null; };
    var vh = innerHeight, full = 0;
    document.querySelectorAll('#ledger .row').forEach(function (x) { var b = __M.rect(x); if (b.top >= 0 && b.bottom <= vh) full++; });
    var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit');
    return { mast: R('.mast'), rail: R('.rail'), bar: R('.bar'),
      firstTop: T('#ledger .row'), firstH: R('#ledger .row'), full: full,
      docH: document.documentElement.scrollHeight };
  })()`);
  console.log(name + ' on HEAD: ' + JSON.stringify(r));
  await br.close();
}
