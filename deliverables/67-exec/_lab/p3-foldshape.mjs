// p3-foldshape.mjs — 折叠条本体的形状实验（2026-10-28）。
// VA 已证明"只折 4 个长字段、排版零改动"就能 30/30 ≤3000（2260–2820）。
// 这一支只回答三个细节问题：
//   ① summary 里要不要放首句摘要（会不会把 1 行折成 2 行、吃掉余量）
//   ② summary 的命中高度能不能做到 ≥24px（WCAG 2.2 AA 2.5.8，不靠间距豁免）
//   ③ "全展开"到底比现状高多少（上一支我误把预览/闸门/上站文案也一起展开了，数偏大）
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, IDS, COLLECT, openCase, sleep, summary } from './lib.mjs';

const HELPERS = `
window.__lab = (function () {
  var LONGS = ['布局与网格', '可落地要点', '关键视觉元素', '动效与交互'];
  function css(t) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = t; document.head.appendChild(s); }
  // teaser：取第一个句号前的短句，超过 cap 就不要（宁可没有，也不要半句）。
  function teaser(t, cap) {
    var m = t.match(/^[^。]{6,}。/);
    if (!m) return '';
    var s = m[0].replace(/。$/, '');
    return s.length <= cap ? s : '';
  }
  function fold(opts) {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt'), dd = f.querySelector(':scope > dd');
      if (!dt || !dd) return;
      var label = dt.textContent.trim();
      if (LONGS.indexOf(label) < 0) return;
      var text = dd.textContent.trim();
      var n = text.replace(/\\s/g, '').length;
      var det = document.createElement('details');
      var sum = document.createElement('summary');
      var html = '<span class="fl-lab">' + label + '</span><span class="fl-num">' + n + ' 字</span>';
      if (opts.teaser) { var t = teaser(text, opts.teaserCap || 40); if (t) html += '<span class="fl-tip">' + t + '</span>'; }
      html += '<span class="fl-hint">点开读全文</span>';
      sum.innerHTML = html;
      var p = document.createElement('p'); p.className = 'fold-body'; p.textContent = text;
      det.appendChild(sum); det.appendChild(p);
      f.className = 'field field-fold field-long';
      f.removeChild(dt); f.removeChild(dd); f.appendChild(det);
    });
    css('#d-body .field-long details > summary{padding:' + opts.pad + ';font-size:var(--s-13);line-height:1.6}'
      + '#d-body .field-long .fl-lab{font-weight:600;color:var(--ink)}'
      + '#d-body .field-long .fl-num{margin-left:8px;font-family:var(--num);font-variant-numeric:tabular-nums;color:var(--ink-3)}'
      + '#d-body .field-long .fl-tip{margin-left:8px;color:var(--ink-3)}'
      + '#d-body .field-long .fl-hint{margin-left:8px;color:var(--ink-3)}'
      + '#d-body .field-long .fold-body{font-size:var(--s-16);line-height:1.62;margin-top:7px;overflow-wrap:anywhere}');
  }
  function summaryBoxes() {
    return [].slice.call(document.querySelectorAll('#d-body .field-long > details > summary')).map(function (s) {
      var b = s.getBoundingClientRect();
      var rg = document.createRange(); rg.selectNodeContents(s);
      var tops = {}; for (var r of rg.getClientRects()) if (r.height > 1) tops[Math.round(r.top)] = 1;
      return { h: +b.height.toFixed(1), w: +b.width.toFixed(1), lines: Object.keys(tops).length };
    });
  }
  return { fold: fold, summaryBoxes: summaryBoxes };
})();
`;

const V = (js) => `(() => { ${js} })()`;

const VARIANTS = [
  { name: 'F1 一行·无内距', js: '__lab.fold({pad:"0 0 0 2px"})' },
  { name: 'F2 一行·内距2（24px 目标）', js: '__lab.fold({pad:"2px 0 2px 2px"})' },
  { name: 'F3 首句摘要40字·内距2', js: '__lab.fold({pad:"2px 0 2px 2px",teaser:true,teaserCap:40})' },
  { name: 'F4 首句摘要24字·内距2', js: '__lab.fold({pad:"2px 0 2px 2px",teaser:true,teaserCap:24})' },
];

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { at: new Date().toISOString(), variants: {} };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(HELPERS);
  out.variants[vp.k] = {};
  for (const v of VARIANTS) {
    const rows = []; let boxes = null;
    for (const id of IDS) {
      await openCase(p, id);
      await p.eval(V(v.js)); await sleep(50);
      const m = await p.eval(COLLECT);
      rows.push({ ...m, id });
      if (!boxes) boxes = await p.eval(V('return __lab.summaryBoxes()'));
    }
    out.variants[vp.k][v.name] = { rows, boxes };
    const s3 = summary(rows, 3000);
    const hs = boxes.map((b) => b.h);
    const ls = boxes.map((b) => b.lines);
    console.log(`[${vp.k}] ${v.name.padEnd(24)} ${String(s3.min).padStart(5)}–${String(s3.max).padStart(5)} (avg ${s3.avg}) ≥3000=${String(s3.over).padStart(2)}/30  summary高=${Math.min(...hs)}–${Math.max(...hs)} 行数=${[...new Set(ls)].join('/')} 首字段=${Math.round(s3.firstFieldMin)}–${Math.round(s3.firstFieldMax)}`);
  }
  await p.close();
}

// ③ 只展开 4 个新折叠块（不碰预览/闸门/上站文案/审查点）
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(HELPERS);
  out.expand4 = {};
  for (const id of ['S01', 'S13', 'S26', 'S29']) {
    await openCase(p, id);
    const base = await p.eval(COLLECT);
    const baseFields = base.fields.map((f) => ({ label: f.label, h: f.h, ddH: f.ddH, dtH: f.dtH }));
    await p.eval(V('__lab.fold({pad:"2px 0 2px 2px"})'));
    await sleep(60);
    const folded = await p.eval(COLLECT);
    const foldedFields = folded.fields.map((f) => ({ label: f.label, h: f.h }));
    await p.eval(V("[].slice.call(document.querySelectorAll('#d-body .field-long > details')).forEach(function(d){d.open=true})"));
    await sleep(80);
    const open = await p.eval(COLLECT);
    out.expand4[id] = {
      base: base.scrollH, folded: folded.scrollH, openFour: open.scrollH,
      deltaOpen: open.scrollH - base.scrollH,
      fieldsBase: baseFields, fieldsFolded: foldedFields,
      fieldsOpen: open.fields.map((f) => ({ label: f.label, h: f.h, ddH: f.ddH })),
    };
    console.log(`[390] ${id} 现状=${base.scrollH} 折4收起=${folded.scrollH} 折4全展开=${open.scrollH} Δ(全展开-现状)=${open.scrollH - base.scrollH}`);
  }
  await p.close();
}

writeFileSync(join(HERE, 'p3-foldshape.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten p3-foldshape.json');
