// m33-shots-foldopen.mjs — 补拍「折叠块展开态」：必须滚到该折叠块再截，否则首屏像素不变
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');

const H = `
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
    var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d, claim); d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}.mast-kicker{font-size:12px;margin-bottom:4px}'
      + '.mast h1{font-size:26px;line-height:1.1}.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
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
    var fill = document.querySelector('#d-body .prompt-fill'), note = document.querySelector('#d-body .prompt-fill-note');
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

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });

// 改前：滚到第一个折叠块再展开
await p.goto(PAGE, { settleMs: 2000 });
await p.eval(() => { document.querySelector('.row[data-id="S26"]').click(); document.getElementById('detail').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 400));
const beforeFoldTop = await p.eval(() => {
  const f = document.querySelector('#d-body .fold-view');
  const d = document.getElementById('detail');
  return f.getBoundingClientRect().top - d.getBoundingClientRect().top;
});
await p.eval((t) => { document.getElementById('detail').scrollTop = t - 10; }, beforeFoldTop);
await new Promise((r) => setTimeout(r, 300));
await p.eval(() => document.querySelectorAll('#detail details').forEach((d) => { d.open = true; }));
await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: join(SHOTS, 'B4-detail-folds-expanded-390-S26.png'), format: 'png' });
console.log('B4 滚到折叠块 top=' + beforeFoldTop.toFixed(0) + ' 后展开');

// 改后：滚到第一个字段折叠条，展开
await p.goto(PAGE, { settleMs: 1800 });
await p.eval((x) => { new Function(x.h + 'REC_DETAIL();')(); }, { h: H });
await p.eval(() => { document.querySelector('.row[data-id="S26"]').click(); document.getElementById('detail').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 400));
await p.eval((x) => { new Function(x.h + 'REC_DETAIL();')(); }, { h: H });
await new Promise((r) => setTimeout(r, 250));
const pos = await p.eval(() => {
  const d = document.getElementById('detail');
  const f = document.querySelectorAll('#d-body .fields > .field')[4];
  const det = f.querySelector('details');
  const off = f.getBoundingClientRect().top - d.getBoundingClientRect().top + d.scrollTop;
  return { off, has: !!det };
});
console.log('改后 第 5 字段 offset=' + pos.off.toFixed(0) + ' 有 details=' + pos.has);
await p.eval((o) => { const d = document.getElementById('detail'); d.scrollTop = o - 140; }, pos.off);
await new Promise((r) => setTimeout(r, 300));
await p.eval(() => { const f = document.querySelectorAll('#d-body .fields > .field')[4].querySelector('details'); if (f) f.open = true; });
await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: join(SHOTS, 'A5-detail-fold-open-390-S26.png'), format: 'png' });

// 再补一张：折叠态同一位置（对照）
await p.eval(() => { const f = document.querySelectorAll('#d-body .fields > .field')[4].querySelector('details'); if (f) f.open = false; });
await new Promise((r) => setTimeout(r, 350));
await p.screenshot({ path: join(SHOTS, 'A5b-detail-fold-closed-390-S26.png'), format: 'png' });

const h = async (n) => (await import('node:crypto')).createHash('sha256');
console.log('done');
await p.close();
await browser.close();
