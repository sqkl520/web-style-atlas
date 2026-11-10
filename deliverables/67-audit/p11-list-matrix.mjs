// p11-list-matrix.mjs — 列表页压深方案矩阵（390×844 主测，1440×900 回归）。
// 判据不止「完整卡」：还量「首卡可辨认」（编号+标题+闸门结论是否都在首屏内），
// 以及整页扫描长度（30 行总高）——后者对 30 项索引更贴近真实成本。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const LIVE = 'file:///D:/Web/style/deliverables/67-audit/frozen-now/index.html';

const TAIL = `
  __list = function () {
    var vh = innerHeight;
    var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
    var rects = rows.map(function (r) { return __M.rect(r); });
    var full = rects.filter(function (b) { return b.top >= 0 && b.bottom <= vh; }).length;
    var part = rects.filter(function (b) { return b.top < vh && b.bottom > vh; }).length;
    var f = rows[0];
    var fb = f ? __M.rect(f) : null;
    var R = function (s) { var e = document.querySelector(s); return e ? __M.px(__M.rect(e).height) : null; };
    var T = function (el) { return el ? __M.px(__M.rect(el).top) : null; };
    var B = function (el) { return el ? __M.px(__M.rect(el).bottom) : null; };
    // 首卡「可辨认」= 编号、中文名、闸门结论三样都在首屏内
    var noEl = f && f.querySelector('.no'), h3 = f && f.querySelector('h3');
    var gate = f && f.querySelector('.row-foot .tag');
    var identityVisible = !!(noEl && h3 && gate && B(noEl) <= vh && B(h3) <= vh && T(gate) < vh);
    var identityParts = { no: B(noEl), h3: B(h3), gate: T(gate) };
    var hs = rects.map(function (b) { return b.height; }).sort(function (a, b) { return a - b; });
    return {
      mast: R('.mast'), rail: R('.rail'), bar: R('.bar'),
      railInner: (function () { var r = document.querySelector('.rail'); return r.scrollHeight - r.clientHeight; })(),
      firstTop: fb ? __M.px(fb.top) : null, firstH: fb ? __M.px(fb.height) : null,
      firstBottom: fb ? __M.px(fb.bottom) : null,
      firstVisiblePct: fb ? __M.px(Math.max(0, Math.min(fb.bottom, vh) - fb.top) / fb.height * 100) : 0,
      fullCards: full, partCards: part, identityVisible: identityVisible, identityParts: identityParts,
      rowMin: __M.px(hs[0]), rowMax: __M.px(hs[hs.length - 1]),
      docScrollH: document.documentElement.scrollHeight,
      listH: R('#ledger'), screens: Math.round(document.documentElement.scrollHeight / vh * 100) / 100,
      hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      controls: Array.prototype.filter.call(document.querySelectorAll('a[href],button,input,select,summary'), function (e) {
        var b = __M.rect(e); return b.height > 0 && b.top < vh && b.bottom > 0; }).length,
      hiddenChars: (function () {
        var n = 0;
        Array.prototype.forEach.call(document.querySelectorAll('.mast *, .rail *, .bar *, #ledger .row *'), function (e) {
          if (__M.cs(e).display === 'none' && e.children.length === 0) {
            var t = (e.textContent || '').trim(); if (t) n += t.length;
          }
        });
        return n;
      })()
    };
  };
`;

const J = {
  foldClaimExit: `
    var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 想直接拿现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6;min-height:25.8px';
    claim.parentNode.insertBefore(d, claim); d.appendChild(s);
    var box = document.createElement('div'); box.appendChild(claim); box.appendChild(exit); d.appendChild(box);`,
  foldThree: `
    var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit'), wiz = document.querySelector('.mast-wizard');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 选型向导 · 现成模板（3 条入口）';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6;min-height:25.8px';
    claim.parentNode.insertBefore(d, claim); d.appendChild(s);
    var box = document.createElement('div'); box.appendChild(claim); box.appendChild(wiz); box.appendChild(exit); d.appendChild(box);`,
  keepLead: `
    var claim = document.querySelector('.mast-claim');
    var keep = '每个方案都有可运行的原型，全部用同一条命令、同一套视口渲染。';
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '完整口径（三档视口）· 选型向导 · 现成模板';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6;min-height:25.8px';
    claim.textContent = keep;
    claim.parentNode.insertBefore(d, claim.nextSibling); d.appendChild(s);
    var box = document.createElement('div');
    var p2 = document.createElement('p'); p2.textContent = '每个方案都有一个可运行的原型，全部用同一条命令、同一套视口（桌面 1440×900、平板 768×1024、手机 390×844）渲染，闸门结果与截图都在这里摊开——选之前先看它实际长成什么样。';
    p2.style.cssText = 'font-size:15px;line-height:1.6;color:var(--ink-2);margin-top:8px';
    box.appendChild(p2); box.appendChild(document.querySelector('.mast-wizard')); box.appendChild(document.querySelector('.mast-exit'));
    d.appendChild(box);`,
  rail48: `
    var rail = document.querySelector('.rail');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '筛选 · 11 组 / 47 颗芯片（先按你是做什么的挑）';
    s.style.cssText = 'display:flex;align-items:center;font-size:14px;font-weight:600;padding:0;min-height:48px;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body); rail.appendChild(d);`,
  railDrawer: `
    var rail = document.querySelector('.rail');
    var btn = document.createElement('button'); btn.id = '__drawerbtn'; btn.type = 'button';
    btn.innerHTML = '<span>筛选 · 11 组 / 47 颗芯片</span><span style="font-family:var(--num);font-size:13px;color:var(--ink-3)">展开 ▾</span>';
    var drawer = document.createElement('div'); drawer.id = '__drawer';
    while (rail.firstChild) drawer.appendChild(rail.firstChild);
    rail.appendChild(btn); rail.appendChild(drawer);`,
  railStrip: `
    var rail = document.querySelector('.rail');
    var scene = document.querySelector('#flt-scene').closest('.rail-block');
    scene.id = '__stay';
    Array.prototype.forEach.call(rail.querySelectorAll('.rail-block, .rail-sep, .rail-lead'), function (b) {
      if (b.id !== '__stay') b.style.display = 'none';
    });`,
  barFold: `
    var bar = document.querySelector('.bar');
    var cnt = bar.querySelector('#count'), sort = bar.querySelector('.sort'), reset = bar.querySelector('#reset');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '排序与清空（当前：方案号）';
    s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:4px 0;cursor:pointer;line-height:1.6;min-height:25.8px';
    sort.after(d); d.appendChild(s);
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 0 0';
    box.appendChild(sort); box.appendChild(reset); box.appendChild(cnt); d.appendChild(box);`,
  factsAfter: `
    var facts = document.querySelector('.mast-facts'), ledger = document.querySelector('#ledger');
    ledger.parentNode.insertBefore(facts, ledger.nextSibling);
    facts.style.cssText = 'margin:18px 0 0;padding-top:14px;border-top:2px solid var(--rule)';`
};

const C = {
  headTight: `.mast{padding:12px 16px 10px;gap:8px}.mast-kicker{margin-bottom:4px}
              .mast-facts{display:flex;gap:12px;flex-wrap:wrap}
              .mast-facts>div{border-top:0;padding-top:0;display:flex;gap:3px;align-items:baseline}
              .mast-facts dt{font-size:11px}.mast-facts dd{font-size:13px;margin-top:0}
              .mast-claim{margin-top:7px}.mast-wizard{margin-top:7px}.mast-exit{margin-top:8px;padding-top:6px}`,
  rail48css: `.rail{max-height:none!important;overflow:visible!important;padding:0 16px 6px!important}`,
  railDrawerCss: `.rail{max-height:none!important;overflow:visible!important;padding:0!important;border-bottom:0!important}
    #__drawerbtn{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 16px 0;padding:9px 12px;
      border:1px solid var(--rule-2);font-size:14px;font-weight:600;color:var(--ink);background:var(--card);cursor:pointer;width:calc(100% - 32px);text-align:left}
    #__drawer{display:none;max-height:70vh;overflow-y:auto;padding:10px 16px 14px;border-bottom:2px solid var(--ink)}
    #__drawerbtn[aria-expanded="true"] + #__drawer{display:block}`,
  railStripCss: `.rail{max-height:none!important;overflow:visible!important;padding:8px 0 6px 16px!important;border-bottom:2px solid var(--ink)!important}
    #__stay{margin:0!important}#__stay h2{font-size:11px;margin-bottom:3px;color:var(--ink-3)}
    #__stay .chips{flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden}
    #__stay .chips button{flex:none}#__stay .rail-hint,#__stay .scene-toggle{display:none!important}`,
  barFoldCss: `.bar{padding-bottom:8px!important;gap:8px!important}`,
  barTightCss: `.bar{padding-bottom:8px!important;gap:6px 8px!important}
    .search{flex:1 1 100%!important}.search span{display:none}
    .count{order:2;flex:1 1 auto;font-size:12px}.sort{order:3;gap:4px}.sort label{display:none}
    .sort select{padding:5px 6px;font-size:13px}#reset{order:4;padding:5px 8px;font-size:13px}`,
  rowMild: `.row-head .tag:not(.tag-fr){display:none}.row-head{gap:4px 8px}
    .row-family{-webkit-line-clamp:1!important}
    .shots .shot{position:relative}.shots .shot img{max-height:140px!important}
    .shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}
    .row-foot .cap{display:none}`,
  rowMid: `.shots .shot{position:relative}.shots .shot img{max-height:84px!important}
    .shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}
    .row-family{-webkit-line-clamp:1!important}
    .row-head .tag:not(.tag-fr):not(.tag-thr){display:none}
    .row-foot .cap{display:none}.row{padding:10px 0!important}`,
  rowTicket: `.shots{display:none!important}.row-family{display:none!important}
    .row-head .tag:not(.tag-fr){display:none}.row-head h3{font-size:17px}
    .row{grid-template-columns:40px minmax(0,1fr)!important;padding:9px 0!important;gap:12px!important}
    .row-foot{grid-column:1/-1!important;font-size:12px}.row-foot .cap{display:none}
    .row-def{-webkit-line-clamp:1!important;font-size:13px}.no{font-size:17px!important}`,
  rowNoTag: `.row-head .tag{display:none}.row-family{-webkit-line-clamp:1!important}
    .shots .shot img{max-height:120px!important}.row-foot .cap{display:none}.row-def{-webkit-line-clamp:2!important}`,
  detail80: ``,
  shots80: `.shots .shot img{max-height:80px!important}.shots figcaption{font-size:10px;padding:0}`,
  fontSmall: `.row-head h3{font-size:17px}.row-def{font-size:14px;line-height:1.5}.row-foot{font-size:12px}
    .row-meta{font-size:12px}.row-family{font-size:12px}`
};

const VARIANTS = [
  { id: 'L0', name: '现状', css: [], js: [] },
  { id: 'A1', name: '折 claim+exit 两段散文', css: [], js: ['foldClaimExit'] },
  { id: 'A2', name: '折 claim+wizard+exit 三段', css: [], js: ['foldThree'] },
  { id: 'A3', name: '页头只压排版（facts 单行）', css: ['headTight'], js: [] },
  { id: 'A4', name: '折起但首句留住（定位句保留）', css: [], js: ['keepLead'] },
  { id: 'A5', name: 'facts 移到清单之后', css: [], js: ['factsAfter'] },
  { id: 'B1', name: '筛选整条 → 48px 折叠条', css: ['rail48css'], js: ['rail48'] },
  { id: 'B2', name: '筛选 → 抽屉按钮（52.7px）', css: ['railDrawerCss'], js: ['railDrawer'] },
  { id: 'B3', name: '筛选 → 1 行横滑条', css: ['railStripCss'], js: ['railStrip'] },
  { id: 'B4', name: '筛选只留第 1 组（40vh 内滚不变）', css: [], js: [] },
  { id: 'C1', name: '工具条 → 折叠按钮', css: ['barFoldCss'], js: ['barFold'] },
  { id: 'C2', name: '工具条 → 两行不折', css: ['barTightCss'], js: [] },
  { id: 'D1', name: '行卡温和（图140/家族1行/标签1个）', css: ['rowMild'], js: [] },
  { id: 'D2', name: '行卡中（图84）', css: ['rowMid'], js: [] },
  { id: 'D3', name: '行卡票据（无图无家族）', css: ['rowTicket'], js: [] },
  { id: 'D4', name: '行卡只去标签+图120', css: ['rowNoTag'], js: [] },
  { id: 'D5', name: '行卡字号整体降一档', css: ['fontSmall'], js: [] },
  { id: 'F1', name: 'A1+B2+C1+D1', css: ['railDrawerCss', 'barFoldCss', 'rowMild'], js: ['foldClaimExit', 'railDrawer', 'barFold'] },
  { id: 'F2', name: 'A1+B1+C1+D1', css: ['rail48css', 'barFoldCss', 'rowMild'], js: ['foldClaimExit', 'rail48', 'barFold'] },
  { id: 'F3', name: 'A2+B1+C1+D1（最激进 chrome）', css: ['rail48css', 'barFoldCss', 'rowMild'], js: ['foldThree', 'rail48', 'barFold'] },
  { id: 'F4', name: 'A4+B2+C1+D2（保留定位句）', css: ['railDrawerCss', 'barFoldCss', 'rowMid'], js: ['keepLead', 'railDrawer', 'barFold'] },
  { id: 'F5', name: 'A4+B2+C1+D1（更保守行卡）', css: ['railDrawerCss', 'barFoldCss', 'rowMild'], js: ['keepLead', 'railDrawer', 'barFold'] },
  { id: 'F6', name: 'A2+B1+C1+D2', css: ['rail48css', 'barFoldCss', 'rowMid'], js: ['foldThree', 'rail48', 'barFold'] },
  { id: 'F7', name: 'A2+B1+C1+D3（票据行卡）', css: ['rail48css', 'barFoldCss', 'rowTicket'], js: ['foldThree', 'rail48', 'barFold'] },
  { id: 'F8', name: 'A1+B3+C2+D2（横滑条版）', css: ['railStripCss', 'barTightCss', 'rowMid'], js: ['foldClaimExit', 'railStrip'] }
];

async function run(v, w, h) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(LIVE, { settleMs: 1100 });
  const css = v.css.map((k) => C[k]).join('\n');
  const js = v.js.map((k) => `(function(){ ${J[k]} })();`).join('\n');
  const r = await p.eval(`(async () => {
    ${INPAGE}
    ${TAIL}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var st = document.createElement('style'); st.textContent = ${JSON.stringify(css)}; document.head.appendChild(st);
    new Function(${JSON.stringify(js)})();
    await new Promise(function (r) { setTimeout(r, 160); });
    return __list();
  })()`);
  await br.close();
  return r;
}

const out = { 390: [], 1440: [] };
for (const v of VARIANTS) {
  const r390 = await run(v, 390, 844);
  const r1440 = await run(v, 1440, 900);
  out['390'].push({ ...v, m: r390 });
  out['1440'].push({ ...v, m: r1440 });
  console.log(`${v.id.padEnd(4)}${v.name}`);
  console.log(`   390  mast=${String(r390.mast).padStart(6)} rail=${String(r390.rail).padStart(6)} bar=${String(r390.bar).padStart(6)} | 首卡 top=${String(r390.firstTop).padStart(6)} h=${String(r390.firstH).padStart(6)} 可见=${String(r390.firstVisiblePct).padStart(5)}% | 完整=${r390.fullCards} 部分=${r390.partCards} 可辨认=${r390.identityVisible ? 'Y' : 'N'} | 页=${r390.screens}屏 列表=${r390.listH} 横溢=${r390.hOverflow} 丢字=${r390.hiddenChars}`);
  console.log(`   1440 首卡 top=${String(r1440.firstTop).padStart(6)} h=${String(r1440.firstH).padStart(6)} 完整=${r1440.fullCards} 页=${r1440.screens}屏 丢字=${r1440.hiddenChars}`);
}
writeFileSync(join(HERE, 'data-p11-list-matrix.json'), JSON.stringify(out, null, 2), 'utf8');
