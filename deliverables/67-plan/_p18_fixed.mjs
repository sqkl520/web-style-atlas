// _p18_fixed.mjs — _p17 的 F2 按「实测最高的 2 个」折，但逐案折的字段不同
// （S01 折 字体策略+可落地；S26 折 字体策略+布局；S14 折 布局+可落地）。
// 那不是可实施的设计，那是一次测量的产物。用户没法建立心智模型。
// 本探针改用**固定字段名**的 2 元组/3 元组，排版一个值不动，看能不能 0/30。
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
  function foldByName(list){
    document.querySelectorAll('#d-body .fields > .field').forEach(function(f){
      var dt=f.querySelector(':scope > dt');
      if(dt && list.indexOf(dt.textContent.trim())>=0) foldField(f);
    });
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
  // G2 = 固定折「布局与网格 + 可落地要点」（30 案里稳定最长的两个）
  function G2(){ foldByName(['布局与网格','可落地要点']); }
  function G2C(){ foldByName(['布局与网格','可落地要点']); foldCta(); }
  // G3C = 固定折「布局/可落地/关键视觉」+ CTA
  function G3C(){ foldByName(['布局与网格','可落地要点','关键视觉元素']); foldCta(); }
  // G4C = 审计的 LAB4 + CTA，但**不动排版**
  function G4C(){ foldByName(['布局与网格','可落地要点','关键视觉元素','动效与交互']); foldCta(); }
  // R2 = 审计原方案（LAB4 + CTA + 排版收紧）
  var TYPO='#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
    +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
    +'#d-body{padding-left:10px;padding-right:10px}';
  function R2(){ addStyle(TYPO); foldByName(['布局与网格','可落地要点','关键视觉元素','动效与交互']); foldCta(); }
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
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2), vh,
    firstFieldTop: f.length ? f[0].top : null,
    fieldsFully: f.filter((x) => x.top >= 0 && x.top + x.h <= vh).length,
    fs: dd ? getComputedStyle(dd).fontSize : null, lh: dd ? getComputedStyle(dd).lineHeight : null,
    textW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    detailsCount: d.querySelectorAll('details').length,
    copyTop: cbb ? +cbb.top.toFixed(1) : null,
    folded: Array.from(d.querySelectorAll('#d-body .fields > .field > details > summary')).map((s) => s.textContent.trim()),
    hOv: d.scrollWidth - d.clientWidth,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const VARS = ['BASE', 'G2', 'G2C', 'G3C', 'G4C', 'R2'];
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [label, w, h, m] of [['390', 390, 844, true], ['1440', 1440, 900, false]]) {
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
      await new Promise((r) => setTimeout(r, 90));
      if (k !== 'BASE') { await p.eval((x) => { new Function(x)(); }, LH + k + '();'); await new Promise((r) => setTimeout(r, 80)); }
      out[label][id][k] = await p.eval(DM);
    }
  }
  for (const k of VARS) {
    const sh = IDS.map((id) => out[label][id][k].scrollH);
    const ff = IDS.map((id) => out[label][id][k].fieldsFully);
    const ft = IDS.map((id) => out[label][id][k].firstFieldTop);
    const s = out[label].S01[k];
    console.log(`[${label}] ${k.padEnd(5)} scrollH ${String(Math.min(...sh)).padStart(4)}–${String(Math.max(...sh)).padStart(4)} avg ${String(Math.round(sh.reduce((a, b) => a + b, 0) / 30)).padStart(4)} | >3800=${String(sh.filter((x) => x > 3800).length).padStart(2)}/30 | 屏max ${(Math.max(...sh) / s.vh).toFixed(2)} | 首字段 ${Math.max(...ft)} | 完整字段 ${(ff.reduce((a, b) => a + b, 0) / 30).toFixed(1)} | fs ${s.fs} lh ${s.lh} w ${s.textW} | details ${s.detailsCount}`);
  }
  const bad = IDS.filter((id) => out[label][id].G2C.scrollH > 3800);
  console.log(`  G2C >3800: ${bad.length ? bad.map((i) => i + '=' + out[label][i].G2C.scrollH).join(' ') : '无'}`);
  const bad3 = IDS.filter((id) => out[label][id].G2.scrollH > 3800);
  console.log(`  G2(不折CTA) >3800: ${bad3.length ? bad3.map((i) => i + '=' + out[label][i].G2.scrollH).join(' ') : '无'}`);
  console.log('');
  await p.close();
}
writeFileSync(join(HERE, '_p18_fixed.json'), JSON.stringify(out, null, 1));
console.log('S01 G2C 折掉:', out['390'].S01.G2C.folded.join(' / '));
console.log('S29 G2C 折掉:', out['390'].S29.G2C.folded.join(' / '));
await browser.close();
