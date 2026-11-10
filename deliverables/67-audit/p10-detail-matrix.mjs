// p10-detail-matrix.mjs — 详情面板压深方案矩阵：在「改动前(HEAD)」与「改动后(工作区)」两个基线上各跑一遍。
// 每个方案独立浏览器进程，彻底避免 CSS/details 累积污染；任何注入错误都显式报出来（不再静默丢案）。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const W = 390, H = 844;
const FROZEN = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');
const LIVE = 'file:///D:/Web/style/deliverables/67-audit/frozen-now/index.html';

const TAIL = `
  __detail = function (id) {
    var d = document.querySelector('#detail'), base = __M.rect(d).top, vh = innerHeight;
    var ff = d.querySelector('#d-body .fields .field');
    var rects = Array.prototype.map.call(d.querySelectorAll('#d-body .fields > .field'), function (f) {
      var r = __M.rect(f); return { top: r.top - base, bottom: r.bottom - base, h: r.height };
    });
    var charsVisible = 0, charsTotal = 0;
    Array.prototype.forEach.call(d.querySelectorAll('#d-body .fields dd, #d-body .fields .fold-body'), function (dd) {
      var r = __M.rect(dd); if (!r.height) return;
      var t = dd.textContent || ''; charsTotal += t.length;
      if (r.top >= vh) return;
      charsVisible += Math.round(t.length * Math.min(1, Math.max(0, (vh - r.top) / r.height)));
    });
    var closedChars = 0;
    Array.prototype.forEach.call(d.querySelectorAll('#d-body .fields > .field'), function (f) {
      var det = f.querySelector(':scope > details');
      if (det && !det.open) {
        var b = det.querySelector('.fold-body') || det.querySelector('dd');
        if (b) closedChars += b.textContent.length;
      }
    });
    var tapsOpen = d.querySelectorAll('#d-body .fields > .field > details > summary').length;
    var evH = 0;
    Array.prototype.forEach.call(d.querySelectorAll('#d-body > details.fold'), function (f) { evH += __M.rect(f).height; });
    return {
      id: id, scrollH: d.scrollHeight, headH: __M.px(__M.rect(d.querySelector('.detail-head')).height),
      firstFieldTop: ff ? __M.px(__M.rect(ff).top - base) : null,
      fields: rects.length,
      fullFields: rects.filter(function (r) { return r.top >= 0 && r.bottom <= vh; }).length,
      partialFields: rects.filter(function (r) { return r.top < vh && r.bottom > vh; }).length,
      firstFieldFull: rects.length ? (rects[0].top >= 0 && rects[0].bottom <= vh) : false,
      charsVisible: charsVisible, charsTotal: charsTotal, closedChars: closedChars, tapsOpen: tapsOpen,
      ctaH: (function () { var e = d.querySelector('.prompt-cta'); return e ? __M.px(__M.rect(e).height) : 0; })(),
      evH: __M.px(evH),
      fieldsH: (function () { var e = d.querySelector('.fields'); return e ? __M.px(__M.rect(e).height) : 0; })()
    };
  };
`;

const R = {
  // 折 4 个长字段（工作区已内置，冻结基线里需要手动注入）
  fold4: `
    var LAST = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
    Array.prototype.forEach.call(document.querySelectorAll('#d-body .fields > .field'), function (f) {
      if (f.querySelector(':scope > details')) return;
      var dt = f.querySelector(':scope > dt'); if (!dt || LAST.indexOf(dt.textContent.trim()) < 0) return;
      var dd = f.querySelector(':scope > dd'); if (!dd) return;
      var det = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = dt.textContent + '（' + dd.textContent.replace(/\\s/g,'').length + ' 字）';
      s.style.cssText = 'font-size:13px;cursor:pointer;line-height:1.6;padding:2px 0;min-height:25.8px;color:var(--ink)';
      dt.remove(); det.appendChild(s); det.appendChild(dd); f.classList.add('field-fold'); f.appendChild(det);
    });`,
  // 只折最长 2 个
  fold2: `
    var fs = Array.prototype.slice.call(document.querySelectorAll('#d-body .fields > .field'));
    fs.sort(function (a, b) { return b.getBoundingClientRect().height - a.getBoundingClientRect().height; });
    fs.slice(0, 2).forEach(function (f) {
      if (f.querySelector(':scope > details')) return;
      var dt = f.querySelector(':scope > dt'); if (!dt) return;
      var dd = f.querySelector(':scope > dd'); if (!dd) return;
      var det = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = dt.textContent + '（' + dd.textContent.replace(/\\s/g,'').length + ' 字）';
      s.style.cssText = 'font-size:13px;cursor:pointer;line-height:1.6;padding:2px 0;min-height:25.8px;color:var(--ink)';
      dt.remove(); det.appendChild(s); det.appendChild(dd); f.classList.add('field-fold'); f.appendChild(det);
    });`,
  // 12 段全部折成目录
  foldAll: `
    Array.prototype.forEach.call(document.querySelectorAll('#d-body .fields > .field'), function (f) {
      if (f.querySelector(':scope > details')) return;
      var dt = f.querySelector(':scope > dt'); if (!dt) return;
      var dd = f.querySelector(':scope > dd'); if (!dd) return;
      var det = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = dt.textContent + '（' + dd.textContent.replace(/\\s/g,'').length + ' 字）';
      s.style.cssText = 'font-size:13px;cursor:pointer;line-height:1.6;padding:2px 0;min-height:25.8px;color:var(--ink)';
      dt.remove(); det.appendChild(s); det.appendChild(dd); f.classList.add('field-fold'); f.appendChild(det);
    });`,
  // CTA 折起
  foldCta: `
    var cta = document.querySelector('.prompt-cta');
    if (cta && !cta.closest('details')) {
      var det = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '复制 AI 提示词 · 粘给 ChatGPT / Claude / v0 都行';
      s.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:8px 0;min-height:25.8px;border-bottom:2px solid var(--ink)';
      cta.parentNode.insertBefore(det, cta); det.appendChild(s); det.appendChild(cta);
    }`,
  // 3 条证据折成 1 条
  mergeEv: `
    var folds = Array.prototype.slice.call(document.querySelectorAll('#d-body > details.fold'));
    if (folds.length > 1) {
      var det = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '证据：截图预览 / 闸门报告 / 上站文案（3 块）';
      s.style.cssText = 'font-size:14px;font-weight:600;cursor:pointer;line-height:1.6;padding:5px 0;min-height:25.8px;border-top:2px solid var(--ink)';
      folds[0].parentNode.insertBefore(det, folds[0]); det.appendChild(s);
      var box = document.createElement('div');
      folds.forEach(function (f) { f.open = true; box.appendChild(f); });
      det.appendChild(box);
    }`
};

const CSS = {
  tight: `.field{padding:8px 0!important}.field dt{margin-bottom:2px!important}.field dd{line-height:1.5!important}
          .field-fold .fold-body{line-height:1.5!important}
          .field-long .fold-body{line-height:1.5!important}`,
  narrow: `.detail-body{padding-left:10px!important;padding-right:10px!important}`,
  headFlat: `.detail-head{padding:8px 12px!important;gap:8px!important;align-items:center!important}
             .detail-no{font-size:17px!important}.detail-title h2{font-size:19px!important}
             .detail-title p{display:none!important}#d-close{padding:4px 8px!important}`,
  noFill: `.prompt-fill{display:none!important}.prompt-fill-note{display:none!important}`,
  inlineDt: `.field{padding:8px 0!important}
             .field dt{float:left;margin:0 5px 0 0!important;line-height:1.5;font-size:12px}
             .field dd{line-height:1.5}.field::after{content:'';display:block;clear:both}`
};

// 方案 = { css: [keys], js: [keys], name }
const VARIANTS = [
  { id: 'V0', name: '现状（该基线原样）', css: [], js: [] },
  { id: 'V1', name: '只压排版（行高1.5/内距8/dt2）', css: ['tight'], js: [] },
  { id: 'V2', name: '只收内宽（左右 16→10）', css: ['narrow'], js: [] },
  { id: 'V3', name: 'V1+V2 压排版+收内宽', css: ['tight', 'narrow'], js: [] },
  { id: 'V4', name: '只折 4 个长字段', css: [], js: ['fold4'] },
  { id: 'V5', name: 'V4+V1', css: ['tight'], js: ['fold4'] },
  { id: 'V6', name: 'V4+V1+V2', css: ['tight', 'narrow'], js: ['fold4'] },
  { id: 'V7', name: '只折最长 2 个字段', css: [], js: ['fold2'] },
  { id: 'V8', name: '折 12 段（面板变目录）', css: [], js: ['foldAll'] },
  { id: 'V9', name: 'CTA 折起', css: [], js: ['foldCta'] },
  { id: 'V10', name: '3 条证据折成 1 条', css: [], js: ['mergeEv'] },
  { id: 'V11', name: 'sticky 头压扁 97.5→49', css: ['headFlat'], js: [] },
  { id: 'V12', name: 'CTA 填写区砍掉（只留按钮）', css: ['noFill'], js: [] },
  { id: 'V13', name: 'dt 与正文同行', css: ['inlineDt'], js: [] },
  { id: 'V14', name: 'CTA折+证据折（全在字段之外做减法）', css: [], js: ['foldCta', 'mergeEv'] },
  { id: 'V15', name: 'V14+V11', css: ['headFlat'], js: ['foldCta', 'mergeEv'] },
  { id: 'V16', name: 'V14+V4（字段内也折）', css: [], js: ['foldCta', 'mergeEv', 'fold4'] },
  { id: 'V17', name: 'V16+V11 头压扁', css: ['headFlat'], js: ['foldCta', 'mergeEv', 'fold4'] },
  { id: 'V18', name: 'V16+V1 压排版', css: ['tight'], js: ['foldCta', 'mergeEv', 'fold4'] },
  { id: 'V19', name: 'V17+V1+V2 全上', css: ['headFlat', 'tight', 'narrow'], js: ['foldCta', 'mergeEv', 'fold4'] }
];

async function run(variant, url) {
  const br = await Browser.launch({ width: W, height: H });
  const p = await br.newPage({ width: W, height: H, mobile: true });
  await p.setViewport({ width: W, height: H, mobile: true });
  await p.goto(url, { settleMs: 1100 });
  const css = variant.css.map((k) => CSS[k]).join('\n');
  const js = variant.js.map((k) => `(function(){ ${R[k]} })();`).join('\n');
  const rows = await p.eval(`(async () => {
    ${INPAGE}
    ${TAIL}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var st = document.createElement('style'); st.textContent = ${JSON.stringify(css)}; document.head.appendChild(st);
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var ids = Array.from(document.querySelectorAll('#ledger .row')).map(function (r) { return r.getAttribute('data-id'); });
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      location.hash = '#' + ids[i];
      await sleep(85);
      try { new Function(${JSON.stringify(js)})(); } catch (e) { out.push({ id: ids[i], err: String(e) }); continue; }
      await sleep(45);
      out.push(__detail(ids[i]));
    }
    return out;
  })()`);
  await br.close();
  const errs = rows.filter((r) => r.err);
  if (errs.length) throw new Error(variant.id + ' 注入失败 ' + errs.length + '/30: ' + errs[0].err);
  return rows;
}

function sum(a) { return a.reduce((x, y) => x + y, 0); }
function summarize(v, rows) {
  const hs = rows.map((r) => r.scrollH).sort((a, b) => a - b);
  const ff = rows.map((r) => r.firstFieldTop).sort((a, b) => a - b);
  return {
    id: v.id, name: v.name,
    scrollMin: hs[0], scrollMed: hs[Math.floor(hs.length / 2)], scrollMax: hs[hs.length - 1],
    scrollAvg: Math.round(sum(hs) / hs.length),
    screensMax: Math.round(hs[hs.length - 1] / H * 100) / 100,
    over3800: hs.filter((x) => x > 3800).length,
    over3000: hs.filter((x) => x > 3000).length,
    over2532: hs.filter((x) => x > 2532).length,
    ffMin: ff[0], ffMax: ff[ff.length - 1],
    fullAvg: Math.round(sum(rows.map((r) => r.fullFields)) / rows.length * 10) / 10,
    firstFull: rows.filter((r) => r.firstFieldFull).length,
    visChars: Math.round(sum(rows.map((r) => r.charsVisible)) / rows.length),
    closedChars: Math.round(sum(rows.map((r) => r.closedChars)) / rows.length),
    taps: Math.round(sum(rows.map((r) => r.tapsOpen)) / rows.length * 10) / 10,
    fieldsH: Math.round(sum(rows.map((r) => r.fieldsH)) / rows.length),
    ctaH: Math.round(sum(rows.map((r) => r.ctaH)) / rows.length),
    evH: Math.round(sum(rows.map((r) => r.evH)) / rows.length)
  };
}

const out = { base: {}, frozen: {}, live: {} };
for (const [label, url] of [['frozen', FROZEN], ['live', LIVE]]) {
  console.error('### 基线 ' + label);
  out[label] = [];
  for (const v of VARIANTS) {
    const rows = await run(v, url);
    const s = summarize(v, rows);
    out[label].push(s);
    console.error('  done ' + v.id);
  }
}

for (const label of ['frozen', 'live']) {
  console.log(`\n===== 基线：${label === 'frozen' ? '改动前（git HEAD，无长字段折叠）' : '改动后（工作区，已折 4 个长字段）'}`);
  console.log('方案   scrollMin med  max  avg  屏max >3800 >3000 首字段     首屏完整 首屏可见字 收起字 点击 字段区 证据区 CTAtop 头高');
  for (const a of out[label]) {
    console.log(
      `${a.id.padEnd(5)}${String(a.scrollMin).padStart(7)}${String(a.scrollMed).padStart(6)}${String(a.scrollMax).padStart(6)}${String(a.scrollAvg).padStart(6)}` +
      `${String(a.screensMax).padStart(6)}${String(a.over3800).padStart(6)}${String(a.over3000).padStart(6)}` +
      `  ${String(a.ffMin).padStart(5)}–${String(a.ffMax).padEnd(5)}${String(a.fullAvg).padStart(7)}${String(a.visChars).padStart(8)}${String(a.closedChars).padStart(7)}${String(a.taps).padStart(5)}` +
      `${String(a.fieldsH).padStart(7)}${String(a.evH).padStart(7)}${String(a.ctaH).padStart(7)}${String(a.id==='V11'||a.id==='V15'||a.id==='V17'||a.id==='V19'?'49':'90').padStart(5)}`
    );
  }
}
writeFileSync(join(HERE, 'data-p10-detail-matrix.json'), JSON.stringify(out, null, 2), 'utf8');
