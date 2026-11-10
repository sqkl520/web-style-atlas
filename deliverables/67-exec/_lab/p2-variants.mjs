// p2-variants.mjs — 6 种压深方案在同一份 DOM 上实测（2026-10-28）。
// 所有方案都只注入 <style> / 改本进程的 DOM，源码不动；量完再决定改哪一版。
//
// 方案的共同前提（任务书硬约束）：
//   · 16px 正文字号一个字不动（移动端中文正文下限）
//   · 行高不低于 1.5（中文正文可读性底线）
//   · 内容一个字不删，只折；折叠用原生 <details>
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, IDS, COLLECT, openCase, sleep, summary } from './lib.mjs';

/* 页面侧公共件：先整体注入到 window.__lab，再由各变体调用。
   用字符串源码而不是函数 toString，是因为变体之间要互相调用（toString 会丢作用域）。 */
const HELPERS = `
window.__lab = (function () {
  var LONGS = ['布局与网格', '可落地要点', '关键视觉元素', '动效与交互'];
  function css(text) {
    var s = document.createElement('style'); s.setAttribute('data-lab', '1');
    s.textContent = text; document.head.appendChild(s);
  }
  function firstSentence(t, max) {
    var m = t.match(/^[^。；]{4,}。/);
    if (!m) return '';
    var s = m[0];
    if (s.length > max) return '';
    return s.replace(/。$/, '');
  }
  // 折一个字段：summary = 字段名 +（可选）首句摘要 + N 字 + 提示
  function foldField(f, teaser) {
    var dt = f.querySelector(':scope > dt'), dd = f.querySelector(':scope > dd');
    if (!dt || !dd) return;
    var label = dt.textContent.trim();
    var text = dd.textContent.trim();
    var n = text.replace(/\\s/g, '').length;
    var det = document.createElement('details');
    var sum = document.createElement('summary');
    var html = '<span class="fl-lab">' + label + '</span>';
    if (teaser) { var t = firstSentence(text, 30); if (t) html += '<span class="fl-teaser">' + t + '</span>'; }
    html += '<span class="fl-num">' + n + ' 字</span>';
    sum.innerHTML = html;
    var p = document.createElement('p'); p.className = 'fold-body'; p.textContent = text;
    det.appendChild(sum); det.appendChild(p);
    f.classList.add('field-long', 'field-fold');
    f.removeChild(dt); f.removeChild(dd); f.appendChild(det);
  }
  function foldLong(teaser) {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt');
      if (dt && LONGS.indexOf(dt.textContent.trim()) >= 0) foldField(f, teaser);
    });
    css('#d-body .field-long > details > summary{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}'
      + '#d-body .field-long .fl-lab{font-weight:600;color:var(--ink)}'
      + '#d-body .field-long .fl-num{font-family:var(--num);font-variant-numeric:tabular-nums;color:var(--ink-3)}'
      + '#d-body .field-long .fl-teaser{color:var(--ink-2)}'
      + '#d-body .field-long .fold-body{line-height:1.62}');
  }
  function foldAllBut(keep) {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt');
      if (!dt || keep.indexOf(dt.textContent.trim()) >= 0) return;
      foldField(f, false);
    });
    css('#d-body .field-long > details > summary{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}'
      + '#d-body .field-long .fl-lab{font-weight:600;color:var(--ink)}'
      + '#d-body .field-long .fl-num{font-family:var(--num);color:var(--ink-3)}'
      + '#d-body .field-long .fold-body{line-height:1.62}');
  }
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill) return;
    var det = document.createElement('details'); det.className = 'cta-fold';
    var sum = document.createElement('summary');
    sum.textContent = '填写提示词开头（两个输入框，不填也能复制）';
    fill.parentNode.insertBefore(det, fill);
    det.appendChild(sum); det.appendChild(fill); if (note) det.appendChild(note);
    css('#d-body .cta-fold > summary{font-size:var(--s-13);color:var(--ink-2);cursor:pointer;line-height:1.6;padding:6px 0;list-style-position:inside}');
  }
  function navbar() {
    var dl = document.querySelector('#d-body .fields');
    var nav = document.createElement('nav'); nav.className = 'field-nav';
    var inner = document.createElement('div'); inner.className = 'field-nav-in';
    [].slice.call(dl.querySelectorAll(':scope > .field')).forEach(function (f, i) {
      var dt = f.querySelector(':scope > dt');
      var su = f.querySelector(':scope > details > summary');
      var b = document.createElement('button'); b.type = 'button';
      b.textContent = String(i + 1).padStart(2, '0') + ' ' + (dt || su || { textContent: '?' }).textContent.trim();
      b.addEventListener('click', function () { f.scrollIntoView({ block: 'start' }); });
      inner.appendChild(b);
    });
    nav.appendChild(inner);
    dl.parentNode.insertBefore(nav, dl);
    css('#d-body .field-nav{position:sticky;top:0;z-index:3;background:var(--card);border-bottom:2px solid var(--ink);margin:0 -16px}'
      + '#d-body .field-nav-in{display:flex;gap:6px;overflow-x:auto;padding:6px 16px;white-space:nowrap}'
      + '#d-body .field-nav button{flex:none;font-size:var(--s-13);padding:4px 8px;border:1px solid var(--rule-2);background:transparent;cursor:pointer;color:var(--ink-2)}');
  }
  function tight() {
    css('#detail .field{padding:10px 0}#detail .field dt{margin-bottom:2px}'
      + '#d-body{padding-left:14px;padding-right:14px}');
  }
  function openAll() {
    document.querySelectorAll('#d-body details').forEach(function (d) { d.open = true; });
  }
  return { foldLong: foldLong, foldAllBut: foldAllBut, foldCta: foldCta, navbar: navbar, tight: tight, openAll: openAll };
})();
`;

const V = (js) => `(() => { ${js} })()`;

const VARIANTS = [
  { name: 'V0 现状', js: null },
  { name: 'VA 折4长字段', js: '__lab.foldLong(false)' },
  { name: 'VB 只压内距', js: '__lab.tight()' },
  { name: 'VC 字段导航条', js: '__lab.navbar()' },
  { name: 'VD 渐进披露9折', js: "__lab.foldAllBut(['一句话视觉定义','当前有效配色','适用场景'])" },
  { name: 'VE 折4+压内距', js: '__lab.foldLong(false);__lab.tight()' },
  { name: 'VF 折4+CTA折', js: '__lab.foldLong(false);__lab.foldCta()' },
  { name: 'VG 折4+首句摘要', js: '__lab.foldLong(true)' },
  { name: 'VH 折5(含字体)', js: "__lab.foldAllBut(['一句话视觉定义','美学家族与参考','当前有效配色','反 AI 味风险与规避','去 AI 味审查点（3 条）','适用场景','设计师签名式怪癖'])" },
];

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { at: new Date().toISOString(), variants: {} };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(HELPERS);
  out.variants[vp.k] = {};
  for (const v of VARIANTS) {
    const rows = [];
    for (const id of IDS) {
      await openCase(p, id);
      if (v.js) { await p.eval(V(v.js)); await sleep(50); }
      const m = await p.eval(COLLECT);
      rows.push({ ...m, id });
    }
    out.variants[vp.k][v.name] = rows;
    const s3 = summary(rows, 3000);
    const s38 = summary(rows, 3800);
    console.log(`[${vp.k}] ${v.name.padEnd(16)} ${String(s3.min).padStart(5)}–${String(s3.max).padStart(5)} (avg ${String(s3.avg).padStart(5)}) 屏max=${String(s3.screensMax).padStart(5)} >3000=${String(s3.over).padStart(2)}/30 >3800=${String(s38.over).padStart(2)}/30 首字段 ${Math.round(s3.firstFieldMin)}–${Math.round(s3.firstFieldMax)} 完整=${s3.fieldsFully} fs=${s3.fs} lh=${s3.lh} details=${s3.details} hOv=${s3.hOvMax}`);
  }
  await p.close();
}

// 展开态总高：证明"折起来的是分层，不是删除"。
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(HELPERS);
  out.expanded = {};
  for (const id of ['S01', 'S13', 'S26', 'S29']) {
    await openCase(p, id);
    const closed = await p.eval(COLLECT);
    await p.eval(V('__lab.foldLong(false)'));
    const folded = await p.eval(COLLECT);
    await p.eval(V('__lab.openAll()'));
    const open = await p.eval(COLLECT);
    out.expanded[id] = { base: closed.scrollH, folded: folded.scrollH, open: open.scrollH, openFallback: open.detailsCount };
    console.log(`[390] ${id} 现状=${closed.scrollH} 折4(收起)=${folded.scrollH} 折4(全展开)=${open.scrollH} Δ展开-现状=${open.scrollH - closed.scrollH} details=${folded.detailsCount}`);
  }
  await p.close();
}

writeFileSync(join(HERE, 'p2-variants.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten p2-variants.json');
