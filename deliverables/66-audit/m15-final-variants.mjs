// m15-final-variants.mjs — 补齐推荐组合：乙+CTA折（不降字号）/ 乙5+CTA折 / 全字段折（对照）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HELPERS = `
  function foldField(f) {
    var dt = f.querySelector(':scope > dt'), dd = f.querySelector(':scope > dd');
    if (!dt || !dd || f.dataset.folded) return;
    f.dataset.folded = '1';
    var det = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = dt.textContent;
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:2px 0';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  }
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  var LAB4 = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldLabels(list) {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt');
      if (dt && list.indexOf(dt.textContent.trim()) >= 0) foldField(f);
    });
  }
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill || !note) return;
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '填写提示词开头（不填也能复制）';
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:4px 0;line-height:1.6;color:var(--ink-2)';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
  var TIGHT = '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.58}'
    + '#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}';
`;

const V = {
  'VH 乙+CTA折': `foldLabels(LAB4);foldCta();`,
  'VI 乙5+CTA折': `foldLabels(LAB4.concat(['字体策略']));foldCta();`,
  'VJ 乙+TIGHT': `foldLabels(LAB4);addStyle(TIGHT);`,
  'VK 全字段折(9个)+CTA折': `var fs=document.querySelectorAll('#d-body .fields > .field');for(var i=3;i<fs.length;i++)foldField(fs[i]);foldCta();`,
};

const MEASURE = () => {
  const d = document.getElementById('detail');
  const dr = d.getBoundingClientRect(), st = d.scrollTop;
  const rel = (el) => { const b = el.getBoundingClientRect(); return { top: +(b.top - dr.top + st).toFixed(1), h: +b.height.toFixed(1) }; };
  const dl = document.querySelector('#d-body .fields');
  const fields = Array.from(dl.children).map((el) => {
    const dt = el.querySelector(':scope > dt'), su = el.querySelector(':scope > summary');
    const r = rel(el);
    return { label: (dt || su || { textContent: '?' }).textContent.trim(), top: r.top, h: r.h, folded: el.dataset.folded === '1' };
  });
  const vh = d.clientHeight;
  const cta = document.querySelector('#d-body .prompt-cta');
  return {
    scrollH: d.scrollHeight, clientH: d.clientHeight,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    hOv: d.scrollWidth - d.clientWidth,
    firstFieldTop: fields[0].top,
    fieldsH: rel(dl).h,
    fieldsFullyInFirstScreen: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    fieldsStartingInFirstScreen: fields.filter((f) => f.top < vh).length,
    foldedCount: fields.filter((f) => f.folded).length,
    ctaH: cta ? +cta.getBoundingClientRect().height.toFixed(1) : 0,
    copyBtnTop: (() => { const b = document.querySelector('#d-body .prompt-copy'); return b ? +(b.getBoundingClientRect().top).toFixed(1) : null; })(),
    // 「点几次展开才能读完全部字段」= 折叠字段数
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vps[vp.k] = {};
  for (const id of IDS) {
    out.vps[vp.k][id] = {};
    for (const [k, code] of Object.entries(V)) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((d) => d.remove());
        const r2 = document.querySelector('.row[data-id="' + sid + '"]');
        if (r2) r2.click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 140));
      await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: HELPERS, c: code });
      await new Promise((r) => setTimeout(r, 110));
      const m = await p.eval(MEASURE);
      out.vps[vp.k][id][k] = m;
    }
    const row = out.vps[vp.k][id];
    console.log(`[${vp.k}] ${id} ` + Object.entries(row).map(([k, v]) => `${k.slice(0, 2)}=${v.scrollH}`).join(' '));
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m15-finalvar.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m15-finalvar.json');
