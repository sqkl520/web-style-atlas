// p6-detail-variants.mjs — 390×844 详情面板压深方案实测（30 案 × 20 方案）
// ⚠️ 每个方案都重新导航一次：CSS 与 <details> 会跨方案累积，同页连跑会互相污染。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

const W = 390, H = 844;

const TAIL = `
  __detail = function (id) {
    var d = document.querySelector('#detail');
    var base = __M.rect(d).top;
    var vh = window.innerHeight;
    var ff = d.querySelector('#d-body .fields .field');
    var fieldRects = Array.prototype.map.call(d.querySelectorAll('#d-body .fields > .field'), function (f) {
      var r = __M.rect(f); return { top: __M.px(r.top - base), bottom: __M.px(r.bottom - base), h: __M.px(r.height) };
    });
    var charsVisible = 0;
    Array.prototype.forEach.call(d.querySelectorAll('#d-body .fields dd'), function (dd) {
      var r = __M.rect(dd);
      if (r.top >= vh) return;
      var t = (dd.textContent || '');
      var shown = Math.min(1, Math.max(0, (vh - r.top) / r.height));
      charsVisible += Math.round(t.length * shown);
    });
    var foldChars = 0;
    Array.prototype.forEach.call(d.querySelectorAll('#d-body .fields > .field'), function (f) {
      var det = f.querySelector(':scope > details');
      if (det && !det.open) foldChars += (det.querySelector('dd') ? det.querySelector('dd').textContent.length : 0);
    });
    return {
      id: id, scrollH: d.scrollHeight, headH: __M.px(__M.rect(d.querySelector('.detail-head')).height),
      firstFieldTop: ff ? __M.px(__M.rect(ff).top - base) : null,
      fieldsDlTop: d.querySelector('.fields') ? __M.px(__M.rect(d.querySelector('.fields')).top - base) : null,
      fields: fieldRects.length,
      fullFields: fieldRects.filter(function (r) { return r.top >= 0 && r.bottom <= vh; }).length,
      partialFields: fieldRects.filter(function (r) { return r.top < vh && r.bottom > vh; }).length,
      charsVisible: charsVisible, foldChars: foldChars,
      ctaH: (function () { var e = d.querySelector('.prompt-cta'); return e ? __M.px(__M.rect(e).height) : 0; })(),
      evidenceH: (function () {
        var s = 0;
        Array.prototype.forEach.call(d.querySelectorAll('#d-body > details.fold'), function (f) { s += __M.rect(f).height; });
        return __M.px(s);
      })(),
      fieldsH: (function () { var e = d.querySelector('.fields'); return e ? __M.px(__M.rect(e).height) : 0; })()
    };
  };
`;

const V = {
  V0: { css: '', js: '' },
  R1: { css: `.field{padding:8px 0!important}.field dt{margin-bottom:2px!important}.field dd{line-height:1.5!important}`, js: '' },
  R2: { css: `.field{padding:8px 0!important}.field dt{margin-bottom:2px!important}.field dd{line-height:1.5!important}
               .detail-body{padding-left:10px!important;padding-right:10px!important}`, js: '' },
  R3: { css: '', js: `
      var LAST = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
      Array.prototype.forEach.call(document.querySelectorAll('#d-body .fields > .field'), function (f) {
        var dt = f.querySelector(':scope > dt'); if (!dt || LAST.indexOf(dt.textContent.trim()) < 0) return;
        var dd = f.querySelector(':scope > dd');
        var det = document.createElement('details');
        var s = document.createElement('summary');
        s.textContent = dt.textContent + '（' + dd.textContent.length + ' 字，点开读）';
        s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
        dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
      });` },
  R4: { css: '', js: `
      var cta = document.querySelector('.prompt-cta');
      var det = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '复制 AI 提示词 · 粘给 ChatGPT / Claude / v0 都行';
      s.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:10px 0;border-bottom:2px solid var(--ink)';
      cta.parentNode.insertBefore(det, cta); det.appendChild(s); det.appendChild(cta);` },
  R5: { css: `.prompt-fill{display:none!important}.prompt-fill-note{display:none!important}`, js: '' },
  R6: { css: `.detail-head{padding:8px 12px!important;gap:8px!important;align-items:center!important}
               .detail-no{font-size:17px!important}.detail-title h2{font-size:19px!important}
               .detail-title p{display:none!important}#d-close{padding:4px 8px!important}`, js: '' },
  R7: { css: '', js: `
      var folds = Array.prototype.slice.call(document.querySelectorAll('#d-body > details.fold'));
      if (folds.length) {
        var det = document.createElement('details');
        var s = document.createElement('summary');
        s.textContent = '证据：截图预览 / 闸门报告 / 上站文案（3 块）';
        s.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:5px 0;border-top:2px solid var(--ink)';
        folds[0].parentNode.insertBefore(det, folds[0]); det.appendChild(s);
        var box = document.createElement('div');
        folds.forEach(function (f) { f.open = true; box.appendChild(f); });
        det.appendChild(box);
      }` },
  R8: { css: `.field{padding:9px 0!important}.field dt{float:left;margin:0 6px 0 0!important;line-height:1.62}
               .field dd{display:block;line-height:1.62}.field::after{content:'';display:block;clear:both}`, js: '' },
  R9: { css: `.field dd{line-height:1.55!important}.field{padding:10px 0!important}`, js: `
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
      });` },
  R10: { css: '', js: `
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
      }` },
  R11: { css: `.field{padding:8px 0!important}.field dt{float:left;margin:0 5px 0 0!important;line-height:1.5;font-size:12px}
                .field dd{line-height:1.5}.field::after{content:'';display:block;clear:both}`, js: '' }
};

const COMBOS = {
  C1: ['R3', 'R1'], C2: ['R3', 'R2'], C3: ['R4', 'R3', 'R1'],
  C4: ['R10', 'R1'], C5: ['R10', 'R3', 'R2'], C6: ['R10', 'R6', 'R1'],
  C7: ['R7', 'R4', 'R1'], C8: ['R10', 'R6', 'R9'], C9: ['R10', 'R6', 'R3'],
  C10: ['R10', 'R6', 'R11']
};

const { browser } = await launchPage(W, H);
let page = null;
async function freshPage() {
  // 每个方案一个全新 target，彻底断开累积
  await browser.close();
  return null;
}

const results = {};

async function measureAll(key, css, js) {
  const b2 = await launchPage(W, H);
  const p = b2.page;
  await gotoSelection(p);
  const r = await p.eval(`(async () => {
    ${INPAGE}
    ${TAIL}
    var st = document.createElement('style'); st.textContent = ${JSON.stringify(css)}; document.head.appendChild(st);
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var ids = Array.from(document.querySelectorAll('#ledger .row')).map(function (r) { return r.getAttribute('data-id'); });
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      location.hash = '#' + ids[i];
      await sleep(75);
      try { new Function(${JSON.stringify(js)})(); } catch (e) { out.push({ id: ids[i], err: String(e) }); continue; }
      await sleep(45);
      out.push(__detail(ids[i]));
    }
    return out;
  })()`);
  await b2.browser.close();
  return r.filter((x) => !x.err);
}

function summarize(key, name, rows) {
  const hs = rows.map((r) => r.scrollH).sort((a, b) => a - b);
  const ff = rows.map((r) => r.firstFieldTop).sort((a, b) => a - b);
  const full = rows.map((r) => r.fullFields);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return {
    key, name, n: rows.length,
    scrollMin: hs[0], scrollMed: hs[Math.floor(hs.length / 2)], scrollMax: hs[hs.length - 1],
    scrollAvg: Math.round(sum(hs) / hs.length),
    screensMax: Math.round(hs[hs.length - 1] / 844 * 100) / 100,
    over3800: hs.filter((h) => h > 3800).length,
    over3000: hs.filter((h) => h > 3000).length,
    over2532: hs.filter((h) => h > 2532).length,
    ffMin: ff[0], ffMax: ff[ff.length - 1], ffAvg: Math.round(sum(ff) / ff.length),
    fullFieldAvg: Math.round(sum(full) / full.length * 10) / 10, fullFieldMin: Math.min(...full),
    charsVisibleAvg: Math.round(sum(rows.map((r) => r.charsVisible)) / rows.length),
    foldCharsAvg: Math.round(sum(rows.map((r) => r.foldChars)) / rows.length),
    fieldsHAvg: Math.round(sum(rows.map((r) => r.fieldsH)) / rows.length),
    ctaHAvg: Math.round(sum(rows.map((r) => r.ctaH)) / rows.length),
    headHAvg: Math.round(sum(rows.map((r) => r.headH)) / rows.length)
  };
}

const all = {};
all.V0 = summarize('V0', '现状', await measureAll('V0', '', ''));
for (const [k, v] of Object.entries(V)) {
  if (k === 'V0') continue;
  all[k] = summarize(k, k, await measureAll(k, v.css || '', v.js || ''));
  console.error('done ' + k);
}
for (const [k, parts] of Object.entries(COMBOS)) {
  const css = parts.map((p) => V[p].css || '').join('\n');
  const js = parts.map((p) => `(function(){ ${V[p].js || ''} })();`).join('\n');
  all[k] = summarize(k, parts.join('+'), await measureAll(k, css, js));
  console.error('done ' + k);
}

console.log('方案  scrollMin med   max   avg   屏max >3800 >3000 首字段min–max  首屏完整 可见字 折起字 字段区 CTAtop 头高');
for (const k of Object.keys(all)) {
  const a = all[k];
  console.log(
    `${k.padEnd(5)}${String(a.scrollMin).padStart(7)}${String(a.scrollMed).padStart(6)}${String(a.scrollMax).padStart(6)}${String(a.scrollAvg).padStart(7)}` +
    `${String(a.screensMax).padStart(6)}${String(a.over3800).padStart(6)}${String(a.over3000).padStart(6)}` +
    `  ${String(a.ffMin).padStart(5)}–${String(a.ffMax).padEnd(5)}` +
    `${String(a.fullFieldAvg).padStart(7)}${String(a.charsVisibleAvg).padStart(7)}${String(a.foldCharsAvg).padStart(7)}` +
    `${String(a.fieldsHAvg).padStart(7)}${String(a.ctaHAvg).padStart(7)}${String(a.headHAvg).padStart(5)}`
  );
}
await browser.close();
writeFileSync(join(HERE, 'data-p6-detail-variants.json'), JSON.stringify(all, null, 2), 'utf8');
