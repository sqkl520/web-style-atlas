// m32-definitive.mjs — 定稿测量（单次进程内完成，避免仓库被并发修改造成跨轮漂移）
// 内容：A 列表首屏（现状 + 推荐 + 推荐去掉 #q-parked 假控件）B 详情（现状 + 推荐）C 触控/键盘
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');
mkdirSync(SHOTS, { recursive: true });

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
  // 修 #q-parked：内联 display:inline-flex 压过 [hidden] 的 UA display:none
  function fixParked() { addStyle('#q-parked[hidden]{display:none !important}'); }
  var ROWFIX = '.shots .shot img{max-height:100px}.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}';
  function REC_LIST() { railToSummary(); headFold(); barTight(); addStyle(ROWFIX); }
  function foldField(f) {
    var dt = f.querySelector(':scope > dt'), dd = f.querySelector(':scope > dd');
    if (!dt || !dd || f.dataset.folded) return;
    f.dataset.folded = '1';
    var det = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = dt.textContent;
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  }
  var LAB4 = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldLong() {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt');
      if (dt && LAB4.indexOf(dt.textContent.trim()) >= 0) foldField(f);
    });
  }
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill || !note) return;
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = '填写提示词开头（不填也能复制）';
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
  function REC_DETAIL() {
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}'
      + '#detail .fields .field-fold{padding:8px 0}#d-body{padding-left:10px;padding-right:10px}');
    foldLong(); foldCta();
  }
`;

const LM = () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const first = infos[0];
  const vis = Math.max(0, Math.min(first.bottom, vh) - Math.max(first.top, 0));
  const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const qp = document.getElementById('q-parked');
  return {
    vh, mastH: g('.mast'), railH: g('.rail'), barH: g('.bar'),
    qparkedVisible: qp ? qp.getBoundingClientRect().height > 0 && getComputedStyle(qp).display !== 'none' : null,
    qparkedH: qp ? +qp.getBoundingClientRect().height.toFixed(1) : null,
    firstRowTop: first.top, firstRowH: first.h, firstRowBottom: first.bottom,
    firstVisiblePct: +(vis / first.h * 100).toFixed(1),
    complete: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
    partial: infos.filter((x) => x.top < vh && x.bottom > vh).length,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    seen: ['.no', '.row-head h3', '.row-def', '.row-family', '.swatches', '.shots .shot:first-child img', '.row-foot'].filter((sel) => {
      const e = document.querySelector('.row ' + sel);
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return r.top < vh && r.bottom > 0;
    }),
    footFull: (() => { const e = document.querySelector('.row .row-foot'); if (!e) return null; const r = e.getBoundingClientRect(); return r.bottom <= vh; })(),
  };
};

const DM = () => {
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
    copyTop: (() => { const b = document.querySelector('#d-body .prompt-copy'); return b ? +b.getBoundingClientRect().top.toFixed(1) : null; })(),
  };
};

const STAMP = new Date().toISOString();
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: STAMP, list: {}, detail: {} };
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

// ── A. 列表 ──
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  out.list[vp.k] = {};
  for (const [k, code] of Object.entries({
    'A0 现状': '',
    'A1 只修 #q-parked 假控件': 'fixParked();',
    'A2 A1+rail折': 'fixParked();railToSummary();',
    'A3 A2+页头折叠': 'fixParked();railToSummary();headFold();',
    'A4 A3+工具条两行': 'fixParked();railToSummary();headFold();barTight();',
    'A5 A4+行卡收紧（推荐）': 'fixParked();railToSummary();headFold();barTight();addStyle(ROWFIX);',
  })) {
    await p.goto(PAGE, { settleMs: 1500 });
    if (code) { await p.eval((x) => { new Function(x.h + x.c)(); }, { h: LH, c: code }); await new Promise((r) => setTimeout(r, 300)); }
    out.list[vp.k][k] = await p.eval(LM);
    const m = out.list[vp.k][k];
    console.log(`[${vp.k}] ${k.padEnd(26)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(5)} bar=${String(m.barH).padStart(5)} 首卡=${String(m.firstRowTop).padStart(7)}–${String(m.firstRowBottom).padStart(7)} 完整=${m.complete} 可见=${m.firstVisiblePct}% 页脚完整=${m.footFull} ovX=${m.overflowX}`);
    if (vp.k === '390' || vp.k === '414') {
      await p.eval(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 160));
      await p.screenshot({ path: join(SHOTS, `def-${k.split(' ')[0]}-${vp.k}.png`), format: 'png' });
    }
  }
  await p.close();
}

// ── B. 详情 ──
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.detail[vp.k] = {};
  for (const id of IDS) {
    out.detail[vp.k][id] = {};
    for (const [k, code] of Object.entries({ 'B0 现状': '', 'B1 推荐': 'REC_DETAIL();' })) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 140));
      if (code) { await p.eval((x) => { new Function(x.h + x.c)(); }, { h: LH, c: code }); await new Promise((r) => setTimeout(r, 110)); }
      out.detail[vp.k][id][k] = await p.eval(DM);
    }
  }
  const sum = (k) => {
    const a = Object.values(out.detail[vp.k]).map((x) => x[k]);
    const sh = a.map((x) => x.scrollH);
    return { min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(sh.reduce((p, q) => p + q, 0) / 30), over: sh.filter((x) => x > 3800).length, ff: (a.reduce((p, q) => p + q.fieldsFully, 0) / 30).toFixed(1), fs: a[0].fs, lh: a[0].lh };
  };
  console.log(`[${vp.k}] 详情 现状  ${JSON.stringify(sum('B0 现状'))}`);
  console.log(`[${vp.k}] 详情 推荐  ${JSON.stringify(sum('B1 推荐'))}`);
  await p.close();
}

// ── C. 触控 + 键盘（详情推荐态）──
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); document.getElementById('detail').scrollTop = 0; });
  await new Promise((r) => setTimeout(r, 350));
  await p.eval((x) => { new Function(x.h + 'REC_DETAIL();')(); }, { h: LH });
  await new Promise((r) => setTimeout(r, 250));
  out.touchRecommended = await p.eval(() => {
    const d = document.getElementById('detail');
    const els = Array.from(d.querySelectorAll('summary, button, input, a[href], select')).filter((e) => e.getBoundingClientRect().height > 0);
    return els.map((e) => { const b = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), text: (e.textContent || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 24), h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; });
  });
  const under24 = out.touchRecommended.filter((x) => x.h < 24 || x.w < 24);
  console.log(`[390] 推荐态详情可交互元素 ${out.touchRecommended.length} 个，<24px：${under24.length} ${JSON.stringify(under24)}`);
  await p.screenshot({ path: join(SHOTS, 'def-B1-detail-390.png'), format: 'png' });
  await p.close();
}

writeFileSync(join(HERE, 'data-m32-definitive.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nmeasuredAt=' + STAMP);
console.log('written data-m32-definitive.json');
