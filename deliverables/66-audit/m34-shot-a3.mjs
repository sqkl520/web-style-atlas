// m34-shot-a3.mjs — A3 改成「页头折叠条展开」（原 A3 与 A1 字节相同，无信息）
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
    var d = document.createElement('details'); d.setAttribute('data-lab','1'); d.id = 'head-fold';
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
`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1800 });
await p.eval((x) => { new Function(x.h + 'railToSummary();headFold();barTight();')(); }, { h: H });
await new Promise((r) => setTimeout(r, 350));
// 展开页头折叠条
await p.eval(() => { document.getElementById('head-fold').open = true; window.scrollTo(0, 0); });
await new Promise((r) => setTimeout(r, 450));
await p.screenshot({ path: join(SHOTS, 'A3-list-headfold-expanded-390.png'), format: 'png' });
const info = await p.eval(() => ({
  mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
  firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
}));
console.log('A3 页头展开后 mast=' + info.mastH + ' 首卡top=' + info.firstRowTop);
await p.close();
await browser.close();
