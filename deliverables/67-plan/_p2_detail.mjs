// _p2_detail.mjs — 独立复算详情面板 390/414，并复跑 N3 / R2
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

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
  var LAB4=['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldLong(){
    document.querySelectorAll('#d-body .fields > .field').forEach(function(f){
      var dt=f.querySelector(':scope > dt');
      if(dt&&LAB4.indexOf(dt.textContent.trim())>=0)foldField(f);
    });
  }
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
  }
  // N3：不折字段，只压排版（15px/1.5，内距 8，dt 间距 2）+ CTA 折
  function N3(){
    addStyle('body{font-size:15px}'
      +'#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}');
    foldCta();
  }
  // R2：折 4 个长字段 + CTA 折 + 排版收紧但 16px 不动
  function R2(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}'
      +'#detail .fields .field-fold{padding:8px 0}#d-body{padding-left:10px;padding-right:10px}');
    foldLong();foldCta();
  }
  // R2-nofold-body：只压行高，正文字号与内宽都不动 —— 用于判断"行高 1.5 单独值多少"
  function LHONLY(){
    addStyle('#detail .field dd{line-height:1.5}');
  }
  function CTAONLY(){ foldCta(); }
`;

const DM = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const kids = dl ? Array.from(dl.children) : [];
  const fields = kids.map((el) => {
    const dt = el.querySelector(':scope > dt'), su = el.querySelector(':scope > summary');
    const r = el.getBoundingClientRect();
    return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1), label: (dt || su || { textContent: '?' }).textContent.trim() };
  });
  const dd = dl ? dl.querySelector('.field dd') : null;
  const sumH = (sel) => { const e = document.querySelector(sel); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const g = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1) }; };
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2), vh,
    fieldCount: fields.length,
    fieldsH: dl ? +dl.getBoundingClientRect().height.toFixed(1) : null,
    firstFieldTop: fields.length ? fields[0].top : null,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    fs: dd ? getComputedStyle(dd).fontSize : null,
    lh: dd ? getComputedStyle(dd).lineHeight : null,
    textW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    copyBtn: g('#d-body .prompt-copy'),
    cta: g('#d-body .prompt-cta'),
    head: g('.detail-head'),
    openProto: g('#d-body .open-proto'),
    detailsCount: d.querySelectorAll('details').length,
    foldsOpenAllScrollH: null,
    hOv: d.scrollWidth - d.clientWidth,
    fieldTops: fields.map((f) => f.label + ':' + f.top + '/' + f.h),
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = {};
  for (const id of IDS) {
    out[vp.k][id] = {};
    for (const [k, code] of Object.entries({ BASE: '', LHONLY: 'LHONLY();', CTAONLY: 'CTAONLY();', N3: 'N3();', R2: 'R2();' })) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => {
          // 折回原样不好还原，直接重开面板
        });
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 130));
      if (code) { await p.eval((x) => { new Function(x)(); }, LH + code); await new Promise((r) => setTimeout(r, 110)); }
      out[vp.k][id][k] = await p.eval(DM);
    }
    // 全展开态（把 4 个折叠块 + 新加的都点开）——只在 BASE 与 R2 上量
    await p.eval(() => { document.querySelectorAll('style[data-lab]').forEach((s) => s.remove()); });
  }
  const stat = (k, key) => {
    const a = Object.values(out[vp.k]).map((x) => x[key]);
    const v = a.map((x) => x[key === 'BASE' ? 'scrollH' : 'scrollH']);
    return a;
  };
  for (const k of ['BASE', 'LHONLY', 'CTAONLY', 'N3', 'R2']) {
    const sh = IDS.map((id) => out[vp.k][id][k].scrollH);
    const scr = IDS.map((id) => out[vp.k][id][k].screens);
    const ff = IDS.map((id) => out[vp.k][id][k].fieldsFully);
    const firstTop = IDS.map((id) => out[vp.k][id][k].firstFieldTop);
    const over = sh.filter((x) => x > 3800).length;
    const over3000 = sh.filter((x) => x > 3000).length;
    const over2400 = sh.filter((x) => x > 2400).length;
    console.log(`[${vp.k}] ${k.padEnd(8)} scrollH ${Math.min(...sh)}–${Math.max(...sh)} avg ${Math.round(sh.reduce((a, b) => a + b, 0) / 30)} >3800=${over} >3000=${over3000} >2400=${over2400} | 屏 max ${Math.max(...scr)} | 首字段top ${Math.max(...firstTop)} | 完整字段 avg ${(ff.reduce((a, b) => a + b, 0) / 30).toFixed(1)} | fs ${out[vp.k].S01[k].fs} lh ${out[vp.k].S01[k].lh} w ${out[vp.k].S01[k].textW} details ${out[vp.k].S01[k].detailsCount}`);
  }
  console.log('');
  await p.close();
}
writeFileSync(join(HERE, '_p2_detail.json'), JSON.stringify(out, null, 1));
console.log('BASE S01 blocks:', JSON.stringify({
  copyBtn: out['390'].S01.BASE.copyBtn, cta: out['390'].S01.BASE.cta,
  head: out['390'].S01.BASE.head, openProto: out['390'].S01.BASE.openProto,
}));
console.log('BASE S01 fieldTops:', out['390'].S01.BASE.fieldTops.join(' '));
console.log('R2 S01 fieldTops:', out['390'].S01.R2.fieldTops.join(' '));
await browser.close();
