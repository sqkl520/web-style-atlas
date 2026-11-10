// p12-shots.mjs — 截图：列表 390 改动前/改动后 + 关键方案；详情 390/1440 改动前/改动后。
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const SHOTS = join(HERE, 'shots');
const HEAD = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');
const NOW = 'file:///' + join(HERE, 'frozen-now', 'index.html').replace(/\\/g, '/');

async function shot(url, w, h, file, { fold = false, hash = null, js = '', settle = 1100 } = {}) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(url, { settleMs: settle });
  await p.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } return 1; })()`);
  if (hash) {
    await p.eval(`location.hash = ${JSON.stringify(hash)}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  if (js) { await p.eval(`(function(){ ${js} })()`); await new Promise((r) => setTimeout(r, 250)); }
  if (fold) {
    // 展开页头与筛选的折叠块，好让「折起来是什么、展开是什么」成对可看
    await p.eval(`document.querySelectorAll('details').forEach(function (d) { d.open = true; }); 1`);
    await new Promise((r) => setTimeout(r, 350));
  }
  await p.screenshot({ path: join(SHOTS, file), format: 'jpeg', quality: 80 });
  await br.close();
  console.log('  ' + file);
}

console.log('列表 390');
await shot(HEAD, 390, 844, 'list-390-before-folded.jpg');
await shot(HEAD, 390, 844, 'list-390-before-expanded.jpg', { fold: true });
await shot(NOW, 390, 844, 'list-390-now-folded.jpg');
await shot(NOW, 390, 844, 'list-390-now-expanded.jpg', { fold: true });

console.log('列表 1440');
await shot(HEAD, 1440, 900, 'list-1440-before.jpg');
await shot(NOW, 1440, 900, 'list-1440-now.jpg');

console.log('列表 390 关键方案（在改动前基线上注入，看每个杠杆单独值多少）');
const LEVERS = {
  'a1-fold-claim': `
    var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 想直接拿现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6';
    claim.parentNode.insertBefore(d, claim); d.appendChild(s);
    var box = document.createElement('div'); box.appendChild(claim); box.appendChild(exit); d.appendChild(box);`,
  'b2-rail-48': `
    var rail = document.querySelector('.rail');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '筛选 · 11 组 / 47 颗芯片（先按你是做什么的挑）';
    s.style.cssText = 'display:flex;align-items:center;font-size:14px;font-weight:600;padding:0;min-height:48px;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body); rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible'; rail.style.padding = '0 16px 6px';`,
  'd2-row-mid': `
    var st = document.createElement('style');
    st.textContent = '.shots .shot{position:relative}.shots .shot img{max-height:84px!important}'
      + '.shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}'
      + '.row-family{-webkit-line-clamp:1!important}.row-head .tag:not(.tag-fr):not(.tag-thr){display:none}'
      + '.row-foot .cap{display:none}.row{padding:10px 0!important}';
    document.head.appendChild(st);`
};
for (const [name, js] of Object.entries(LEVERS)) {
  await shot(HEAD, 390, 844, `list-390-${name}.jpg`, { js });
}

console.log('详情 390');
await shot(HEAD, 390, 844, 'detail-390-before.jpg', { hash: '#S01' });
await shot(NOW, 390, 844, 'detail-390-now.jpg', { hash: '#S01' });
await shot(NOW, 390, 844, 'detail-390-now-folded-open.jpg', { hash: '#S01', fold: true });
console.log('详情 1440');
await shot(HEAD, 1440, 900, 'detail-1440-before.jpg', { hash: '#S01' });
await shot(NOW, 1440, 900, 'detail-1440-now.jpg', { hash: '#S01' });

console.log('详情 390 关键方案');
const DLEVERS = {
  'v4-fold4': `
    var LAST = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
    Array.prototype.forEach.call(document.querySelectorAll('#d-body .fields > .field'), function (f) {
      var dt = f.querySelector(':scope > dt'); if (!dt || LAST.indexOf(dt.textContent.trim()) < 0) return;
      var dd = f.querySelector(':scope > dd');
      var det = document.createElement('details'); var s = document.createElement('summary');
      s.textContent = dt.textContent + '（' + dd.textContent.replace(/\\s/g,'').length + ' 字）';
      s.style.cssText = 'font-size:13px;cursor:pointer;line-height:1.6;padding:2px 0;color:var(--ink)';
      dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
    });`,
  'v14-cta-evidence-fold': `
    var cta = document.querySelector('.prompt-cta');
    var det = document.createElement('details'); var s = document.createElement('summary');
    s.textContent = '复制 AI 提示词 · 粘给 ChatGPT / Claude / v0 都行';
    s.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:8px 0;border-bottom:2px solid var(--ink)';
    cta.parentNode.insertBefore(det, cta); det.appendChild(s); det.appendChild(cta);
    var folds = Array.prototype.slice.call(document.querySelectorAll('#d-body > details.fold'));
    if (folds.length > 1) {
      var d2 = document.createElement('details'); var s2 = document.createElement('summary');
      s2.textContent = '证据：截图预览 / 闸门报告 / 上站文案（3 块）';
      s2.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:5px 0;border-top:2px solid var(--ink)';
      folds[0].parentNode.insertBefore(d2, folds[0]); d2.appendChild(s2);
      var box = document.createElement('div'); folds.forEach(function (f) { f.open = true; box.appendChild(f); });
      d2.appendChild(box);
    }`
};
for (const [name, js] of Object.entries(DLEVERS)) {
  await shot(HEAD, 390, 844, `detail-390-${name}.jpg`, { hash: '#S01', js });
}
console.log('done');
