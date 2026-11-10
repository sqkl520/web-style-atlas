// m25-final.mjs — 最终推荐方案的诚实数字：
//  (a) 详情：乙(折4长字段)+CTA折，且保持 16px 正文字号（只压行高/内距/加宽）
//  (b) 列表：rail 折 + 页头 claim/exit 进 <details>（内容不删）+ 工具条两行 + 行卡收紧
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
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  function foldField(f) {
    var dt = f.querySelector(':scope > dt'), dd = f.querySelector(':scope > dd');
    if (!dt || !dd || f.dataset.folded) return;
    f.dataset.folded = '1';
    var det = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = dt.textContent;
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:3px 0;min-height:24px';
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
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
  // 保持 16px 的排版收紧
  var TYPO16 = '#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
    + '#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
    + '#d-body{padding-left:10px;padding-right:10px}';
`;

const V = {
  'R0 现状': '',
  'R1 乙+CTA折': 'foldLabels(LAB4);foldCta();',
  'R2 R1+16px排版收紧': 'foldLabels(LAB4);foldCta();addStyle(' + JSON.stringify('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}#d-body{padding-left:10px;padding-right:10px}') + ');',
  'R3 只排版收紧不折字段': 'addStyle(' + JSON.stringify('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}#d-body{padding-left:10px;padding-right:10px}') + ');',
};

const MEASURE = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const fields = Array.from(dl.children).map((el) => {
    const dt = el.querySelector(':scope > dt'), su = el.querySelector(':scope > summary');
    const r = el.getBoundingClientRect();
    return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1), label: (dt || su || { textContent: '?' }).textContent.trim() };
  });
  const dd = dl.querySelector('.field dd');
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2), vh,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    firstFieldTop: fields[0].top, fieldsH: +dl.getBoundingClientRect().height.toFixed(1),
    fieldCount: fields.length,
    fs: dd ? getComputedStyle(dd).fontSize : null, lh: dd ? getComputedStyle(dd).lineHeight : null,
    textW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    hOv: d.scrollWidth - d.clientWidth,
    folds: document.querySelectorAll('#d-body details[open], #d-body > .fold').length,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), detail: {}, list: {} };

// ── 详情 ──
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.detail[vp.k] = {};
  for (const id of IDS) {
    out.detail[vp.k][id] = {};
    for (const [k, code] of Object.entries(V)) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 140));
      if (code) { await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 100)); }
      out.detail[vp.k][id][k] = await p.eval(MEASURE);
    }
  }
  await p.close();
}
for (const vp of ['390', '414']) {
  for (const k of Object.keys(V)) {
    const a = Object.values(out.detail[vp]).map((x) => x[k]);
    const sh = a.map((x) => x.scrollH);
    console.log(`[${vp}] ${k.padEnd(22)} ${Math.min(...sh)}–${Math.max(...sh)} (avg ${Math.round(sh.reduce((p, q) => p + q, 0) / 30)}) ≤3800=${sh.filter((x) => x <= 3800).length}/30 首屏完整字段=${(a.reduce((p, q) => p + q.fieldsFully, 0) / 30).toFixed(1)} fs=${a[0].fs}/${a[0].lh} 字段数=${a[0].fieldCount} ovX=${a[0].hOv}`);
  }
}

// ── 列表（内容不删：claim/exit 进 details）──
const listV = {
  'L0 现状': '',
  'L1 rail折': 'railToSummary();',
  'L2 L1+页头折': 'railToSummary();headFold();',
  'L3 L2+工具条两行': 'railToSummary();headFold();barTight();',
  'L4 L3+行卡收紧': 'railToSummary();headFold();barTight();addStyle(ROW_COMPACT);',
};
const LH = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  function railToSummary() {
    var rail = document.querySelector('.rail');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = '筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText = 'display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body); rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible';
    rail.style.padding = '0 16px 6px'; rail.style.borderBottom = '2px solid var(--ink)';
    d.open = false;
  }
  function headFold() {
    // claim + exit 折进 <details>（内容保留，可点开）
    var claim = document.querySelector('.mast-claim');
    var exit = document.querySelector('.mast-exit');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}'
      + '.mast-kicker{font-size:12px;margin-bottom:4px}'
      + '.mast h1{font-size:26px;line-height:1.1}'
      + '.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      + '.mast-facts{display:flex;margin-top:6px;gap:0}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
      + '.mast-facts dt{font-size:11px;line-height:1.25}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.15}'
      + '.mast-claim{margin-top:10px}.mast-exit{margin-top:8px}');
  }
  function barTight() {
    addStyle('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:6px 8px}'
      + '.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
      + '.sort select{padding:6px 6px;font-size:13px}.btn-quiet{padding:6px 8px;font-size:13px;order:5}');
  }
  var ROW_COMPACT = '.shots .shot img{max-height:120px}.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1}';
`;
const LM = () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const first = infos[0];
  const vis = Math.max(0, Math.min(first.bottom, vh) - Math.max(first.top, 0));
  const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  return {
    vh, mastH: g('.mast'), railH: g('.rail'), barH: g('.bar'),
    firstRowTop: first.top, firstRowH: first.h,
    firstVisiblePct: +(vis / first.h * 100).toFixed(1),
    complete: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
    partial: infos.filter((x) => x.top < vh && x.bottom > vh).length,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // 首屏末尾能看到什么
    bottomEl: (() => { const e = document.elementFromPoint(195, vh - 2); return e ? (e.className || e.tagName).toString().slice(0, 30) : null; })(),
    claimVisible: (() => { const c = document.querySelector('.mast-claim'); if (!c) return null; const r = c.getBoundingClientRect(); return r.height > 0 && r.top < vh; })(),
  };
};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  out.list[vp.k] = {};
  for (const [k, code] of Object.entries(listV)) {
    await p.goto(PAGE, { settleMs: 1400 });
    if (code) { await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: LH, c: code }); await new Promise((r) => setTimeout(r, 300)); }
    out.list[vp.k][k] = await p.eval(LM);
    const m = out.list[vp.k][k];
    console.log(`[${vp.k}] ${k.padEnd(20)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(5)} bar=${String(m.barH).padStart(5)} 首卡top=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 完整卡=${m.complete} 可见=${m.firstVisiblePct}% ovX=${m.overflowX} 首屏底=${m.bottomEl}`);
    if (vp.k === '390') {
      await p.eval(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 180));
      await p.screenshot({ path: join(SHOTS, `rec-${k}-390.png`), format: 'png' });
    }
  }
  await p.close();
}

writeFileSync(join(HERE, 'data-m25-final.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m25-final.json');
