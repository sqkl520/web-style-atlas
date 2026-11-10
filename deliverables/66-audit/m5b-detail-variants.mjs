// m5b-detail-variants.mjs — 详情面板压深方案 30 案全量实测（DOM 动态改，不改源码）
// 关键：每个变体前先移除本探针注入的 <style data-lab>，并重新 click 行卡让 renderDetail 重画，
// 否则上一个变体注入的样式会污染下一个（第一版踩过：V0 在 S02 之后被 VE/VF 的样式改写）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');
mkdirSync(SHOTS, { recursive: true });

const HELPERS = `
  function foldField(f, open) {
    var dt = f.querySelector(':scope > dt');
    var dd = f.querySelector(':scope > dd');
    if (!dt || !dd || f.dataset.folded) return;
    f.dataset.folded = '1';
    var det = document.createElement('details');
    if (open) det.open = true;
    var s = document.createElement('summary');
    s.textContent = dt.textContent;
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:2px 0';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  }
  function addStyle(css) {
    var st = document.createElement('style');
    st.setAttribute('data-lab', '1');
    st.textContent = css;
    document.head.appendChild(st);
  }
  var LAB4 = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldLabels(list) {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt');
      if (dt && list.indexOf(dt.textContent.trim()) >= 0) foldField(f, false);
    });
  }
  var TIGHT = '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.58}'
    + '#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}';
  var CTA_FOLD = 'foldCta()';
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill || !note) return;
    var d = document.createElement('details');
    var s = document.createElement('summary');
    s.textContent = '填写提示词开头（不填也能复制）';
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:4px 0;line-height:1.6;color:var(--ink-2)';
    fill.parentNode.insertBefore(d, fill);
    d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
`;

const V_DEFS = {
  V0: { label: '现状：4 个折叠块默认收起', code: '' },
  VA: { label: '甲：前 3 个核心字段展开，其余 9 个逐字段折叠', code: `var fs=document.querySelectorAll('#d-body .fields > .field');for(var i=3;i<fs.length;i++)foldField(fs[i],false);` },
  VA5: { label: '甲5：前 5 个展开，其余 7 个折叠', code: `var fs=document.querySelectorAll('#d-body .fields > .field');for(var i=5;i<fs.length;i++)foldField(fs[i],false);` },
  VB: { label: '乙：4 个长字段各自 <details>（布局/落地/视觉/动效）', code: `foldLabels(LAB4);` },
  VB5: { label: '乙5：乙 + 字体策略 也折（5 个长字段）', code: `foldLabels(LAB4.concat(['字体策略']));` },
  VC: { label: '丙：字段导航条（横滑锚点 sticky）— 纯加法', code: `
    var dl = document.querySelector('#d-body .fields');
    var nav = document.createElement('div');
    nav.setAttribute('data-lab','1');
    nav.style.cssText = 'position:sticky;top:97px;z-index:3;display:flex;gap:6px;overflow-x:auto;background:var(--card);padding:6px 0;border-bottom:2px solid var(--ink);margin:0 0 2px';
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f, i) {
      var dt = f.querySelector(':scope > dt');
      var su = f.querySelector(':scope > summary');
      var a = document.createElement('a');
      a.textContent = (dt ? dt.textContent : su ? su.textContent : 'f' + i).replace(/（.*$/, '');
      a.href = '#fld-' + i;
      a.style.cssText = 'flex:none;font-size:13px;padding:5px 9px;border:1px solid var(--rule-2);color:var(--ink-2);text-decoration:none;white-space:nowrap';
      f.id = 'fld-' + i;
      a.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var d = document.getElementById('detail');
        d.scrollTop = f.offsetTop - 20;
      });
      nav.appendChild(a);
    });
    dl.parentNode.insertBefore(nav, dl);` },
  VD: { label: '诊断：只把 CTA 填写区折进 <details>（不动字段）', code: `foldCta();` },
  VE: { label: '戊：乙 + 390 档排版收紧（dd 15px/1.58、字段内距 8px）', code: `foldLabels(LAB4);addStyle(TIGHT);` },
  VF: { label: '己：乙 + 排版收紧 + CTA 填写区折起', code: `foldLabels(LAB4);addStyle(TIGHT);foldCta();` },
  VG: { label: '庚：乙5 + 排版收紧 + CTA 折起 + 首个折叠块也折（仅留摘要条）', code: `
    foldLabels(LAB4.concat(['字体策略']));addStyle(TIGHT);foldCta();
    document.querySelectorAll('#d-body > .fold').forEach(function (f) { f.open = false; });` },
};

const MEASURE = () => {
  const d = document.getElementById('detail');
  const dr = d.getBoundingClientRect();
  const st = d.scrollTop;
  const rel = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: +(b.top - dr.top + st).toFixed(1), h: +b.height.toFixed(1) };
  };
  const fieldsDl = document.querySelector('#d-body .fields');
  const fields = Array.from(fieldsDl ? fieldsDl.children : []).map((el) => {
    const dt = el.querySelector(':scope > dt');
    const su = el.querySelector(':scope > summary');
    const dd = el.querySelector(':scope > dd, :scope > details > dd, .fold-body');
    const r = rel(el);
    return {
      label: (dt ? dt.textContent : su ? su.textContent : '?').trim(),
      top: r.top, h: r.h,
      chars: (dd ? dd.textContent : '').replace(/\s+/g, '').length,
      folded: el.dataset.folded === '1',
    };
  });
  const vh = d.clientHeight;
  const visibleFully = fields.filter((f) => f.top >= st && f.top + f.h - st <= vh).length;
  return {
    scrollH: d.scrollHeight, clientH: d.clientHeight,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    hOv: d.scrollWidth - d.clientWidth,
    firstFieldTop: fields.length ? fields[0].top : null,
    fieldsH: rel(fieldsDl) ? rel(fieldsDl).h : 0,
    fieldsFullyInFirstScreen: visibleFully,
    fieldsStartingInFirstScreen: fields.filter((f) => f.top < vh).length,
    foldsH: +Array.from(document.querySelectorAll('#d-body .fold')).reduce((a, f) => a + f.getBoundingClientRect().height, 0).toFixed(1),
    ctaH: (() => { const e = document.querySelector('#d-body .prompt-cta'); return e ? +e.getBoundingClientRect().height.toFixed(1) : 0; })(),
    headH: +document.querySelector('.detail-head').getBoundingClientRect().height.toFixed(1),
    fontStatus: document.fonts.status,
    fields, fieldCount: fields.length,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const ONLY = process.argv[2]; // 可选：只跑某些视口
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vdefs: Object.fromEntries(Object.entries(V_DEFS).map(([k, v]) => [k, v.label])), vps: {} };

for (const vp of [{ name: '390', w: 390, h: 844, mobile: true }, { name: '414', w: 414, h: 896, mobile: true }]) {
  if (ONLY && ONLY !== vp.name) continue;
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.mobile });
  out.vps[vp.name] = {};
  for (const id of IDS) {
    // 一次加载，变体之间靠「移除注入样式 + 重点行卡让 renderDetail 重建 #d-body」复位
    await p.goto(PAGE, { settleMs: 1500 });
    out.vps[vp.name][id] = {};
    for (const [vk, vd] of Object.entries(V_DEFS)) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        const row = document.querySelector('.row[data-id="' + sid + '"]');
        if (row) row.click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 150));
      if (vd.code) {
        await p.eval((payload) => {
          new Function(payload.helpers + payload.code)();
        }, { helpers: HELPERS, code: vd.code });
        await new Promise((r) => setTimeout(r, 120));
      }
      const m = await p.eval(MEASURE);
      m.variant = vk;
      out.vps[vp.name][id][vk] = m;
    }
    const row = out.vps[vp.name][id];
    console.log(`[${vp.name}] ${id} ` + Object.entries(row).map(([k, v]) => `${k}=${v.scrollH}`).join(' '));
  }
  await p.close();
}

const OUTFILE = 'data-m5b-detailvar-' + (ONLY || 'all') + '.json';
writeFileSync(join(HERE, OUTFILE), JSON.stringify(out, null, 1));
await browser.close();
console.log('written ' + OUTFILE);
