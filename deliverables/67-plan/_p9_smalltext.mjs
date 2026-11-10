// _p9_smalltext.mjs — A5 引入的小字号 vs 项目自己声明的 13px 下限。
// style.css:8 写着「小字下限收到 13px（原先 11/12px 有 115 处）」，而 A5 的 ROWFIX 把
// figcaption 设成 10px、mast-facts dt 11px、mast-kicker 12px、count 12px。
// 用 rules.mjs 的 smallText 口径（>3 个即 FAIL）数一遍。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const LH = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function railToSummary(){
    var rail=document.querySelector('.rail');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body=document.createElement('div');
    while(rail.firstChild)body.appendChild(rail.firstChild);
    d.appendChild(s);d.appendChild(body);rail.appendChild(d);
    rail.style.maxHeight='none';rail.style.overflow='visible';
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)';d.open=false;
  }
  function headFold(){
    var claim=document.querySelector('.mast-claim'),exit=document.querySelector('.mast-exit');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='这个图集是什么 · 想要现成模板去哪';
    s.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d,claim);d.appendChild(s);d.appendChild(claim);d.appendChild(exit);d.open=false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}.mast-kicker{font-size:12px;margin-bottom:4px}'
      +'.mast h1{font-size:26px;line-height:1.1}.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      +'.mast-facts{display:flex;margin-top:6px;gap:0}.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
      +'.mast-facts dt{font-size:11px;line-height:1.25}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.15}'
      +'.mast-claim{margin-top:10px}.mast-exit{margin-top:8px}');
  }
  function barTight(){
    addStyle('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:6px 8px}'
      +'.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
      +'.sort select{padding:6px 6px;font-size:13px}.btn-quiet{padding:6px 8px;font-size:13px;order:5}');
  }
  var ROWFIX='.shots .shot img{max-height:100px}.shot{position:relative}'
    +'.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    +'.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}';
  function A5(){railToSummary();headFold();barTight();addStyle(ROWFIX);}
`;

// smallText 口径：含文字的叶子块，字号 <13px
const ST = () => {
  const hits = [];
  document.querySelectorAll('body *').forEach((e) => {
    const hasOwnText = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasOwnText) return;
    const b = e.getBoundingClientRect();
    if (b.height <= 0) return;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 13) hits.push({ fs, cls: (e.className || e.tagName).toString().slice(0, 26), txt: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 20) });
  });
  const bySize = {};
  for (const h of hits) bySize[h.fs] = (bySize[h.fs] || 0) + 1;
  const sizes = new Set();
  document.querySelectorAll('body *').forEach((e) => {
    const hasOwnText = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText && e.getBoundingClientRect().height > 0) sizes.add(getComputedStyle(e).fontSize);
  });
  return { smallCount: hits.length, bySize, distinctSizes: sizes.size, sizes: [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b)), sample: hits.slice(0, 6) };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [label, w, h, m] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 2, mobile: m });
  out[label] = {};
  for (const [k, code] of Object.entries({ BASE: '', A5: 'A5();' })) {
    await p.goto(PAGE, { settleMs: 1400 });
    if (code) { await p.eval((x) => { new Function(x)(); }, LH + code); await new Promise((r) => setTimeout(r, 250)); }
    out[label][k] = await p.eval(ST);
    const s = out[label][k];
    console.log(`[${label}] ${k.padEnd(5)} <13px 块数=${String(s.smallCount).padStart(3)}  bySize=${JSON.stringify(s.bySize)}  不同字号=${s.distinctSizes} ${JSON.stringify(s.sizes)}`);
  }
  await p.close();
}
writeFileSync(join(HERE, '_p9_smalltext.json'), JSON.stringify(out, null, 1));
await browser.close();
