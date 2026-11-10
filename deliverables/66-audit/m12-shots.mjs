// m12-shots.mjs — 交付截图：改前 / 改后（DOM 模拟）各 6+ 张
// 390×844：列表首屏、列表首卡、详情首屏、详情折叠块展开、详情中部、详情底部
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');
mkdirSync(SHOTS, { recursive: true });

const HELPERS = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  var ROW_COMPACT = '.shots .shot img{max-height:120px}.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1}';
  var HEAD_TIGHT = '.mast{padding:12px 16px 10px;gap:8px}'
    + '.mast-kicker{font-size:12px;margin-bottom:4px}.mast h1{font-size:24px;line-height:1.1}'
    + '.mast-claim{display:none}.mast-exit{display:none}'
    + '.mast-wizard{margin-top:6px}.mast-wizard a{padding:5px 9px;font-size:13px}'
    + '.mast-facts{display:flex;margin-top:6px}'
    + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
    + '.mast-facts dt{font-size:10px;line-height:1.25}.mast-facts dd{font-size:16px;margin-top:0;line-height:1.15}';
  var BAR_TIGHT = '.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:5px 8px}'
    + '.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
    + '.sort select{padding:4px 6px;font-size:13px}.btn-quiet{padding:4px 8px;font-size:12px;order:5}';
  function railToSummary(text) {
    var rail = document.querySelector('.rail');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = text;
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;font-weight:600;padding:10px 0;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body); rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible'; rail.style.padding = '4px 16px 8px';
    d.open = false;
  }
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
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:4px 0;line-height:1.6;color:var(--ink-2)';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
  function setNav() {
    var dl = document.querySelector('#d-body .fields');
    var nav = document.createElement('div'); nav.setAttribute('data-lab','1');
    nav.style.cssText = 'position:sticky;top:97px;z-index:3;display:flex;gap:6px;overflow-x:auto;background:var(--card);padding:6px 0;border-bottom:2px solid var(--ink)';
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f, i) {
      var dt = f.querySelector(':scope > dt'), su = f.querySelector(':scope > summary');
      var a = document.createElement('a');
      a.textContent = (dt ? dt.textContent : su ? su.textContent : 'f' + i).replace(/（.*$/, '');
      a.style.cssText = 'flex:none;font-size:13px;padding:5px 9px;border:1px solid var(--rule-2);color:var(--ink-2);text-decoration:none;white-space:nowrap';
      f.id = 'fld-' + i;
      a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var d = document.getElementById('detail'); d.scrollTop = f.offsetTop - 20; });
      nav.appendChild(a);
    });
    dl.parentNode.insertBefore(nav, dl);
  }
  function REC() { railToSummary('筛选与场景反查（11 组 · 47 颗芯片）'); addStyle(ROW_COMPACT + HEAD_TIGHT + BAR_TIGHT); }
  function REC_DETAIL() { addStyle('#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.55}#detail .field dt{margin-bottom:2px}'); foldLong(); foldCta(); foldLong(); }
`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });

const shot = async (name) => {
  await new Promise((r) => setTimeout(r, 260));
  await p.screenshot({ path: join(SHOTS, name + '.png'), format: 'png' });
  console.log('shot', name);
};

// ── 改前 ──────────────────────────────────────────────
await p.goto(PAGE, { settleMs: 1800 });
await shot('before-01-list-firstscreen');
await p.eval(() => window.scrollTo(0, 990));
await shot('before-02-list-firstcard');

await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); document.getElementById('detail').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 400));
await shot('before-03-detail-firstscreen');
// 展开 4 个折叠块
await p.eval(() => document.querySelectorAll('#detail details').forEach((d) => { d.open = true; }));
await shot('before-04-detail-folds-expanded');
await p.eval(() => { document.getElementById('detail').scrollTop = 1250; });
await shot('before-05-detail-mid');
await p.eval(() => { const d = document.getElementById('detail'); d.scrollTop = d.scrollHeight; });
await shot('before-06-detail-bottom');

// ── 改后（列表）────────────────────────────────────────
await p.goto(PAGE, { settleMs: 1600 });
await p.eval((payload) => { new Function(payload.helpers + 'REC();')(); }, { helpers: HELPERS });
await shot('after-01-list-firstscreen');
await p.eval(() => { document.querySelector('.rail details').open = true; });
await shot('after-02-list-rail-expanded');
await p.eval(() => { document.querySelector('.rail details').open = false; window.scrollTo(0, 300); });
await shot('after-03-list-firstcard');

// ── 改后（详情）────────────────────────────────────────
await p.goto(PAGE, { settleMs: 1600 });
await p.eval((payload) => { new Function(payload.helpers + 'REC();')(); }, { helpers: HELPERS });
await p.eval(() => { document.querySelector('.row[data-id="S29"]').click(); document.getElementById('detail').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 400));
await shot('after-04-detail-firstscreen-S29');
await p.eval((payload) => { new Function(payload.helpers + 'REC_DETAIL();')(); }, { helpers: HELPERS });
await shot('after-05-detail-collapsed-S29');
// 展开一个长字段，证明内容一字未删
await p.eval(() => { const l = document.querySelectorAll('#d-body .fields > .field'); l[4].querySelector('details').open = true; });
await shot('after-06-detail-onefold-open');
await p.eval(() => { const d = document.getElementById('detail'); d.scrollTop = d.scrollHeight; });
await shot('after-07-detail-bottom');

// ── 字段导航条（方案丙）─────────────────────────────────
await p.goto(PAGE, { settleMs: 1600 });
await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); document.getElementById('detail').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 400));
await p.eval((payload) => { new Function(payload.helpers + 'setNav();')(); }, { helpers: HELPERS });
await shot('after-08-detail-fieldnav');
await p.eval(() => { const d = document.getElementById('detail'); d.scrollTop = 1800; });
await shot('after-09-detail-fieldnav-scrolled');;

await p.close();
await browser.close();
console.log('done');
