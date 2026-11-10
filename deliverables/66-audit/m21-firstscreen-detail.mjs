// m21-firstscreen-detail.mjs — 详情面板「首屏能看到什么」逐案量化：完整字段数 / 起始字段数 / 首屏文字量
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
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
`;

const MEASURE = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const fields = Array.from(dl.children).map((el) => {
    const dt = el.querySelector(':scope > dt'), su = el.querySelector(':scope > summary');
    const r = el.getBoundingClientRect();
    const dr = d.getBoundingClientRect();
    return { label: (dt || su || { textContent: '?' }).textContent.trim().replace(/（.*/, ''), top: +(r.top - dr.top).toFixed(1), h: +r.height.toFixed(1) };
  });
  const full = fields.filter((f) => f.top >= 0 && f.top + f.h <= vh);
  const starting = fields.filter((f) => f.top < vh);
  // 首屏内可见的正文字数（真实可读文字量）
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    const dr = d.getBoundingClientRect();
    const top = Math.max(r.top, dr.top), bot = Math.min(r.bottom, dr.bottom);
    if (bot <= top) return 0;
    const frac = (bot - top) / r.height;
    return Math.round((el.textContent || '').replace(/\s+/g, '').length * frac);
  };
  let chars = 0;
  dl.querySelectorAll('dd, summary').forEach((el) => { chars += inView(el); });
  return {
    vh,
    fieldsFully: full.length,
    fieldsStarting: starting.length,
    lastFieldVisible: full.length ? full[full.length - 1].label : null,
    charsInFirstScreen: chars,
    firstFieldTop: fields[0].top,
    copyBtnTop: (() => { const b = document.querySelector('#d-body .prompt-copy'); return b ? +b.getBoundingClientRect().top.toFixed(1) : null; })(),
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };
const V = [
  ['现状', ''],
  ['推荐(乙+CTA折)', `foldLabels(LAB4);foldCta();`],
];
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vps[vp.k] = {};
  for (const id of IDS) {
    out.vps[vp.k][id] = {};
    for (const [k, code] of V) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 150));
      if (code) { await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 110)); }
      out.vps[vp.k][id][k] = await p.eval(MEASURE);
    }
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m21-detailfirst.json'), JSON.stringify(out, null, 1));
for (const vp of ['390', '414']) {
  for (const [k] of V) {
    const a = Object.values(out.vps[vp]).map((x) => x[k]);
    console.log(`[${vp}] ${k.padEnd(16)} 首屏完整字段 avg=${(a.reduce((p, q) => p + q.fieldsFully, 0) / 30).toFixed(1)} (min ${Math.min(...a.map((x) => x.fieldsFully))}–max ${Math.max(...a.map((x) => x.fieldsFully))}) 起始字段 avg=${(a.reduce((p, q) => p + q.fieldsStarting, 0) / 30).toFixed(1)} 首屏可见正文字数 avg=${Math.round(a.reduce((p, q) => p + q.charsInFirstScreen, 0) / 30)}`);
  }
}
await browser.close();
