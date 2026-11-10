// p21-shots2.mjs — 补拍：行卡杠杆要滚到首卡才看得见；详情折叠杠杆要等 DOM 稳定。
import { join } from 'node:path';
import { HERE, PAGE_HEAD, PAGE_NOW } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const SHOTS = join(HERE, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(url, w, h, file, { hash, js, scrollTo, settle = 1300 }) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(url, { settleMs: settle });
  await p.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } return 1; })()`);
  if (hash) { await p.eval(`location.hash = ${JSON.stringify(hash)}`); await sleep(500); }
  if (js) { await p.eval(`(function(){ ${js} })(); 1`); await sleep(400); }
  if (scrollTo) {
    await p.eval(`(function () {
      var el = document.querySelector(${JSON.stringify(scrollTo)});
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset - 8);
      return 1;
    })()`);
    await sleep(400);
  }
  await p.screenshot({ path: join(SHOTS, file), format: 'jpeg', quality: 82 });
  await br.close();
  console.log('  ' + file);
}

const D2 = `
  var st = document.createElement('style');
  st.textContent = '.shots .shot{position:relative}.shots .shot img{max-height:84px!important}'
    + '.shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1!important}.row-head .tag:not(.tag-fr):not(.tag-thr){display:none}'
    + '.row-foot .cap{display:none}.row{padding:10px 0!important}';
  document.head.appendChild(st);`;

const V4 = `
  var LAST = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  Array.prototype.forEach.call(document.querySelectorAll('#d-body .fields > .field'), function (f) {
    if (f.querySelector(':scope > details')) return;
    var dt = f.querySelector(':scope > dt'); if (!dt || LAST.indexOf(dt.textContent.trim()) < 0) return;
    var dd = f.querySelector(':scope > dd');
    var det = document.createElement('details');
    var s = document.createElement('summary');
    s.textContent = dt.textContent + '（' + dd.textContent.replace(/\\s/g,'').length + ' 字）';
    s.style.cssText = 'font-size:13px;cursor:pointer;line-height:1.6;padding:2px 0;color:var(--ink)';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  });`;

console.log('行卡杠杆（滚到首卡）');
await shot(PAGE_HEAD, 390, 844, 'card-390-before.jpg', { scrollTo: '#ledger .row' });
await shot(PAGE_HEAD, 390, 844, 'card-390-d2-rowmid.jpg', { scrollTo: '#ledger .row', js: D2 });
await shot(PAGE_NOW, 390, 844, 'card-390-now.jpg', { scrollTo: '#ledger .row' });

console.log('详情面板（首字段区域）');
await shot(PAGE_HEAD, 390, 844, 'detail-390-before-fields.jpg', { hash: '#S01', scrollTo: '#d-body .fields' });
await shot(PAGE_HEAD, 390, 844, 'detail-390-v4-fields.jpg', { hash: '#S01', js: V4, scrollTo: '#d-body .fields' });
await shot(PAGE_NOW, 390, 844, 'detail-390-now-fields.jpg', { hash: '#S01', scrollTo: '#d-body .fields' });
console.log('done');
