// _p17_matrix.mjs — 定稿矩阵（frozen HEAD 快照，390/414/1440 × 7 个方案）
// 目标：证明「满足 3800 阈值」这条路上，存在**一个排版值都不动**的方案（F2），
// 从而把审计推荐 R2 的排版收紧（行高 1.62→1.5、内距 12→8、内宽 355→367）拆成"可选"。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');

const LH = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function foldField(f){
    var dt=f.querySelector(':scope > dt'), dd=f.querySelector(':scope > dd');
    if(!dt||!dd||f.dataset.folded)return;
    f.dataset.folded='1';
    var det=document.createElement('details');
    var s=document.createElement('summary');s.textContent=dt.textContent;
    s.style.cssText='font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
    dt.remove();det.appendChild(s);det.appendChild(dd);f.appendChild(det);
  }
  function foldLongestN(n){
    var fs=Array.prototype.slice.call(document.querySelectorAll('#d-body .fields > .field'));
    var arr=fs.filter(function(f){return f.querySelector(':scope > dt') && f.querySelector(':scope > dd');})
      .map(function(f){return {f:f,h:f.getBoundingClientRect().height};})
      .sort(function(a,b){return b.h-a.h;});
    var names=[];
    arr.slice(0,n).forEach(function(x){ foldField(x.f); });
    // 折叠后再读 summary 文本
    var all=Array.prototype.slice.call(document.querySelectorAll('#d-body .fields > .field'));
    all.forEach(function(f){ var s=f.querySelector('summary'); if(s) names.push(s.textContent.trim()); });
    return names;
  }
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return false;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
    return true;
  }
  var LAB4=['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldByName(list){
    document.querySelectorAll('#d-body .fields > .field').forEach(function(f){
      var dt=f.querySelector(':scope > dt');
      if(dt && list.indexOf(dt.textContent.trim())>=0) foldField(f);
    });
  }
  // ── 方案 ──
  function F2(){ foldLongestN(2); }                              // 折最长 2，排版不动
  function F2C(){ foldLongestN(2); foldCta(); }                  // + CTA 折
  function F3C(){ foldLongestN(3); foldCta(); }                  // 折最长 3 + CTA
  var TYPO='#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
    +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
    +'#d-body{padding-left:10px;padding-right:10px}';
  function R2(){ addStyle(TYPO); foldByName(LAB4); foldCta(); }   // 审计推荐
  function F2CT(){ addStyle(TYPO); foldLongestN(2); foldCta(); }  // 排版收紧 + 只折 2
`;

const DM = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const kids = dl ? Array.from(dl.children) : [];
  const f = kids.map((el) => { const r = el.getBoundingClientRect(); return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1) }; });
  const dd = dl ? dl.querySelector('.field dd') : null;
  const cb = document.querySelector('#d-body .prompt-copy');
  const cbb = cb ? cb.getBoundingClientRect() : null;
  const sums = Array.from(d.querySelectorAll('#d-body .fields > .field > details > summary')).map((s) => s.textContent.trim());
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2), vh,
    firstFieldTop: f.length ? f[0].top : null,
    fieldsFully: f.filter((x) => x.top >= 0 && x.top + x.h <= vh).length,
    fs: dd ? getComputedStyle(dd).fontSize : null,
    lh: dd ? getComputedStyle(dd).lineHeight : null,
    textW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    detailsCount: d.querySelectorAll('details').length,
    copyTop: cbb ? +cbb.top.toFixed(1) : null,
    copyVisible: cbb ? (cbb.top >= 0 && cbb.bottom <= vh) : null,
    foldedSums: sums,
    hOv: d.scrollWidth - d.clientWidth,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const VARS = ['BASE', 'F2', 'F2C', 'F3C', 'R2', 'F2CT'];
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [label, w, h, m] of [['390', 390, 844, true], ['414', 414, 896, true], ['1440', 1440, 900, false]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile: m });
  await p.goto(PAGE, { settleMs: 1800 });
  out[label] = {};
  for (const id of IDS) {
    out[label][id] = {};
    for (const k of VARS) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0; window.scrollTo(0, 0);
      }, id);
      await new Promise((r) => setTimeout(r, 95));
      if (k !== 'BASE') { await p.eval((x) => { new Function(x)(); }, LH + k + '();'); await new Promise((r) => setTimeout(r, 85)); }
      out[label][id][k] = await p.eval(DM);
    }
  }
  for (const k of VARS) {
    const sh = IDS.map((id) => out[label][id][k].scrollH);
    const ff = IDS.map((id) => out[label][id][k].fieldsFully);
    const ft = IDS.map((id) => out[label][id][k].firstFieldTop);
    const s = out[label].S01[k];
    console.log(`[${label}] ${k.padEnd(5)} scrollH ${String(Math.min(...sh)).padStart(4)}–${String(Math.max(...sh)).padStart(4)} avg ${String(Math.round(sh.reduce((a, b) => a + b, 0) / 30)).padStart(4)} | >3800=${String(sh.filter((x) => x > 3800).length).padStart(2)}/30 | 屏max ${(Math.max(...sh) / s.vh).toFixed(2)} | 首字段top ${Math.max(...ft)} | 完整字段 ${(ff.reduce((a, b) => a + b, 0) / 30).toFixed(1)} | fs ${s.fs} lh ${s.lh} w ${s.textW} | 复制钮top ${s.copyTop} | details ${s.detailsCount} | ovX ${s.hOv}`);
  }
  console.log('');
  await p.close();
}
writeFileSync(join(HERE, '_p17_matrix.json'), JSON.stringify(out, null, 1));
console.log('S01 F2 折掉:', out['390'].S01.F2.foldedSums.join(' / '));
console.log('S01 R2 折掉:', out['390'].S01.R2.foldedSums.join(' / '));
console.log('S26 F2 折掉:', out['390'].S26.F2.foldedSums.join(' / '));
console.log('S14 F2 折掉:', out['390'].S14.F2.foldedSums.join(' / '));
await browser.close();
