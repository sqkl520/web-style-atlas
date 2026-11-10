// _p5_scrollcost.mjs — 用「滚多少像素才看到第一张完整卡」替代「首屏几张卡」，
// 这个指标对可视视口高度不敏感，是更诚实的判据。
// 同时核实：15px 在本仓库到底算不算「不可接受」。
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
  // 备选 M2：只折 rail + 压工具条 + 只把图收到 140（不动页头、不动 family、不动图注）
  var M2CSS='.shots .shot img{max-height:140px}.row{padding:10px 0;gap:14px}';
  function M1(){railToSummary();barTight();}
  function M2(){railToSummary();barTight();addStyle(M2CSS);}
  // 备选 M3：rail 折 + 工具条 + 页头只收 claim 行高（不折、不删），图 160
  function M3(){railToSummary();barTight();addStyle('.mast-claim{line-height:1.45}.shots .shot img{max-height:160px}.row{padding:10px 0}');}
`;

const SC = () => {
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const vh = window.innerHeight;
  const b = rows[0].getBoundingClientRect();
  const top = b.top + window.scrollY;
  const h = b.height;
  // 滚到「第一张完整卡」需要多少 scrollY
  const need = Math.max(0, top + h - vh);
  // 卡顶对齐视口顶需要多少
  const alignTop = Math.max(0, top);
  const img = rows[0].querySelector('.shots .shot:first-child img');
  return {
    vh, cardTop: +top.toFixed(1), cardH: +h.toFixed(1),
    scrollForComplete: +need.toFixed(1),
    screensForComplete: +(need / vh).toFixed(2),
    imgH: img ? +img.getBoundingClientRect().height.toFixed(1) : null,
    imgW: img ? +img.getBoundingClientRect().width.toFixed(1) : null,
    imgVisibleFractionOfDesktop: img ? +(img.getBoundingClientRect().height / (img.getBoundingClientRect().width * 9 / 16)).toFixed(3) : null,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { scroll: {}, type: {} };

// 1) 滚多少才见到完整卡：6 个方案 × 4 个视口高
for (const h of [844, 800, 750, 667]) {
  const p = await browser.newPage({ width: 390, height: h, dsf: 2, mobile: true });
  out.scroll[h] = {};
  for (const [k, code] of Object.entries({ BASE: '', A2_railOnly: 'railToSummary();', A4: 'railToSummary();headFold();barTight();', A5: 'railToSummary();headFold();barTight();addStyle(ROWFIX);', M1: 'M1();', M2: 'M2();', M3: 'M3();' })) {
    await p.goto(PAGE, { settleMs: 1200 });
    if (code) { await p.eval((x) => { new Function(x)(); }, LH + code); await new Promise((r) => setTimeout(r, 220)); }
    out.scroll[h][k] = await p.eval(SC);
    const m = out.scroll[h][k];
    console.log(`[vh=${h}] ${k.padEnd(12)} 卡top=${String(m.cardTop).padStart(7)} 卡高=${String(m.cardH).padStart(6)} 需滚=${String(m.scrollForComplete).padStart(7)}px (${m.screensForComplete} 屏) 图=${m.imgH}px 占原图=${m.imgVisibleFractionOfDesktop}`);
  }
  await p.close();
}

// 2) 15px 到底合不合格：查全仓库正文字号用法 + 实测 15px 下每行字数
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1400 });
  const e = await p.eval(() => {
    // 在 355px 宽、15px/1.5 与 16px/1.62 下，一行能放几个汉字
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:355px;font-family:"Noto Sans SC",sans-serif';
    document.body.appendChild(probe);
    const sample = '暗底上的一道朱红楔形切进左上角，标题用窄体加宽字距压在楔口，正文落在暖白纸面上，边线与图版对齐，网格四栏十二行，留白靠外栏收口，按钮只有描边没有填充。';
    const measure = (fs, lh) => {
      probe.style.fontSize = fs + 'px'; probe.style.lineHeight = String(lh);
      probe.textContent = sample;
      const h = probe.getBoundingClientRect().height;
      const lines = Math.round(h / (fs * lh));
      return { fs, lh, h: +h.toFixed(1), lines, charsPerLine: +(sample.length / lines).toFixed(1) };
    };
    const r = { a16: measure(16, 1.62), b15: measure(15, 1.5), c16_15: measure(16, 1.5), d15_162: measure(15, 1.62) };
    probe.remove();
    // 本仓库现在哪些正文用 15px
    const using15 = [];
    document.querySelectorAll('p, li, dd, .mast-claim, .wz-card p').forEach((el) => {
      if (getComputedStyle(el).fontSize === '15px' && el.textContent.trim()) {
        using15.push({ cls: (el.className || el.tagName).toString().slice(0, 28), txt: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 26) });
      }
    });
    return { type: r, existing15px: using15.slice(0, 12), count15: using15.length };
  });
  out.type = e;
  console.log('\n 15px vs 16px:', JSON.stringify(e.type));
  console.log(' 现有 15px 正文元素数:', e.count15, JSON.stringify(e.existing15px.slice(0, 6)));
  await p.close();
}

writeFileSync(join(HERE, '_p5_scrollcost.json'), JSON.stringify(out, null, 1));
await browser.close();
