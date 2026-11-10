// p5-list-variants.mjs — 390×844 列表页压深方案实测（DOM/CSS 动态注入，不改源码）
// 每个方案量：mast/rail/bar 高、首卡 top、首屏完整卡数、30 行卡高分布、整页 scrollHeight，
// 以及「丢掉了什么」的两个可核查量：被隐藏的正文字数、首屏可交互控件数。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

const W = 390, H = 844;

// 注入到页面里的公共测量尾段（每个方案跑完都调它）
const TAIL = `
  __measure = function () {
    var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
    var vh = window.innerHeight;
    var hs = rows.map(function (r) { return __M.rect(r).height; });
    var full = 0, part = 0;
    rows.forEach(function (r) {
      var b = __M.rect(r);
      if (b.top >= 0 && b.bottom <= vh) full++;
      else if (b.top < vh && b.bottom > vh) part++;
    });
    var first = rows[0] ? __M.rect(rows[0]) : null;
    var R = function (s) { var e = document.querySelector(s); return e ? __M.px(__M.rect(e).height) : null; };
    var sorted = hs.slice().sort(function (a, b) { return a - b; });
    var sum = hs.reduce(function (a, b) { return a + b; }, 0);
    // 丢掉了什么：所有 display:none 的元素，其文本字数（只算叶子，避免重复计）
    var hiddenChars = 0, hiddenEls = [];
    Array.prototype.forEach.call(document.querySelectorAll('.mast *, .rail *, .bar *, #ledger .row *'), function (e) {
      var c = __M.cs(e);
      if (c.display === 'none' && e.children.length === 0) {
        var t = (e.textContent || '').trim();
        if (t) { hiddenChars += t.length; hiddenEls.push({ el: __M.label(e), chars: t.length }); }
      }
    });
    // 首屏可交互控件（顶边在视口内）
    var controls = Array.prototype.filter.call(document.querySelectorAll('a[href],button,input,select,summary'), function (e) {
      var b = __M.rect(e);
      return b.height > 0 && b.top < vh && b.bottom > 0;
    }).length;
    var railEl = document.querySelector('.rail');
    return {
      mast: R('.mast'), mastid: R('.mast-id'), facts: R('.mast-facts'),
      rail: R('.rail'), railScroll: railEl.scrollHeight, railClient: railEl.clientHeight,
      railInner: railEl.scrollHeight - railEl.clientHeight,
      bar: R('.bar'),
      firstRowTop: first ? __M.px(first.top) : null,
      firstRowH: first ? __M.px(first.height) : null,
      firstRowBottom: first ? __M.px(first.bottom) : null,
      firstRowVisiblePct: first ? __M.px(Math.max(0, Math.min(first.bottom, vh) - first.top) / first.height * 100) : 0,
      fullCards: full, partialCards: part,
      rowMin: __M.px(sorted[0]), rowMed: __M.px(sorted[Math.floor(sorted.length / 2)]),
      rowMax: __M.px(sorted[sorted.length - 1]), rowAvg: __M.px(sum / hs.length),
      docScrollH: document.documentElement.scrollHeight,
      docHOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hiddenChars: hiddenChars, hiddenEls: hiddenEls,
      firstScreenControls: controls,
      chrome: __M.px((first ? first.top : 0))
    };
  };
`;

const A = {
  A1: {
    css: '',
    js: `
      var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit');
      var d = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '这个图集是什么 · 想直接拿现成模板去哪';
      s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6';
      claim.parentNode.insertBefore(d, claim); d.appendChild(s);
      var box = document.createElement('div'); box.appendChild(claim); box.appendChild(exit); d.appendChild(box);
    `
  },
  A2: {
    css: '',
    js: `
      var claim = document.querySelector('.mast-claim'), exit = document.querySelector('.mast-exit'), wiz = document.querySelector('.mast-wizard');
      var d = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '这个图集是什么 · 选型向导 · 现成模板（3 条入口）';
      s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6';
      claim.parentNode.insertBefore(d, claim); d.appendChild(s);
      var box = document.createElement('div'); box.appendChild(claim); box.appendChild(wiz); box.appendChild(exit); d.appendChild(box);
    `
  },
  A3: {
    css: `
      .mast{padding:12px 16px 10px;gap:8px}
      .mast-kicker{margin-bottom:4px}
      .mast-facts{display:flex;gap:12px;flex-wrap:wrap}
      .mast-facts>div{border-top:0;padding-top:0;display:flex;gap:3px;align-items:baseline}
      .mast-facts dt{font-size:11px}
      .mast-facts dd{font-size:13px;margin-top:0}
      .mast-claim{margin-top:7px}
      .mast-wizard{margin-top:7px}
      .mast-exit{margin-top:8px;padding-top:6px}
    `, js: ''
  },
  // 只留 h1 + 一段 14px 的压缩说明（把 claim 的第一句留下，其余折起）——「折但保留定位」
  A4: {
    css: `.mast{padding:14px 16px 10px;gap:8px}`,
    js: `
      var claim = document.querySelector('.mast-claim');
      var exit = document.querySelector('.mast-exit');
      var wiz = document.querySelector('.mast-wizard');
      var full = claim.textContent;
      var keep = '每个方案都有可运行的原型，全部用同一条命令、同一套视口渲染。';
      claim.textContent = keep;
      claim.style.cssText = 'margin-top:8px;font-size:14px;line-height:1.55;color:var(--ink-2)';
      var d = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '完整口径（三档视口尺寸）· 选型向导 · 现成模板';
      s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:5px 0;cursor:pointer;line-height:1.6';
      claim.parentNode.insertBefore(d, claim.nextSibling); d.appendChild(s);
      var box = document.createElement('div');
      var p2 = document.createElement('p');
      p2.textContent = full; p2.style.cssText = 'font-size:15px;line-height:1.6;color:var(--ink-2);margin-top:8px';
      box.appendChild(p2); box.appendChild(wiz); box.appendChild(exit); d.appendChild(box);
    `
  },
  B1: {
    css: `.rail{max-height:none!important;overflow:visible!important;padding:0 16px 6px!important}`,
    js: `
      var rail = document.querySelector('.rail');
      var d = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '筛选 · 11 组 / 47 颗芯片（先按你是做什么的挑）';
      s.style.cssText = 'display:flex;align-items:center;font-size:14px;font-weight:600;padding:0;min-height:48px;cursor:pointer;list-style-position:inside';
      var body = document.createElement('div');
      while (rail.firstChild) body.appendChild(rail.firstChild);
      d.appendChild(s); d.appendChild(body); rail.appendChild(d);
    `
  },
  B2: {
    css: `.rail{max-height:none!important;overflow:visible!important}`,
    js: `
      var rail = document.querySelector('.rail');
      var blocks = Array.prototype.slice.call(rail.querySelectorAll('.rail-block, .rail-sep'));
      var d = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '另外 10 组：亮暗 / 色带 / 内容量 / 安静度 / 结构 / 门槛 / 调性 / 状态 / 闸门 / 怎么用';
      s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:7px 0;cursor:pointer;line-height:1.6';
      blocks[0].after(d); d.appendChild(s);
      var box = document.createElement('div');
      blocks.slice(1).forEach(function (b) { box.appendChild(b); });
      d.appendChild(box);
    `
  },
  B3: {
    css: `
      .rail{max-height:none!important;overflow:visible!important;padding:8px 0 6px 16px!important;border-bottom:2px solid var(--ink)!important}
      .rail>.rail-block,.rail>.rail-sep,.rail>.rail-note,.rail>.rail-hint,.rail>.rail-lead{display:none!important}
      .rail>#stay{display:block!important;margin:0!important}
      #stay h2{font-size:11px;margin-bottom:3px;color:var(--ink-3)}
      #stay .chips{flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden}
      #stay .chips button{flex:none}
      #stay .chips button:nth-child(n+10){display:none}
      #stay .rail-hint,#stay .scene-toggle{display:none!important}
    `,
    js: `
      var rail = document.querySelector('.rail');
      var scene = document.querySelector('#flt-scene').closest('.rail-block');
      scene.id = 'stay';
    `
  },
  C1: {
    css: `.bar{padding-bottom:8px!important;gap:8px!important}`,
    js: `
      var bar = document.querySelector('.bar');
      var cnt = bar.querySelector('#count'), sort = bar.querySelector('.sort'), reset = bar.querySelector('#reset');
      var d = document.createElement('details');
      var s = document.createElement('summary');
      s.textContent = '排序与清空（当前：方案号）';
      s.style.cssText = 'font-size:13px;color:var(--ink-3);padding:4px 0;cursor:pointer;line-height:1.6';
      sort.after(d); d.appendChild(s);
      var box = document.createElement('div');
      box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 0 0';
      box.appendChild(sort); box.appendChild(reset); box.appendChild(cnt); d.appendChild(box);
    `
  },
  C2: {
    css: `
      .bar{padding-bottom:8px!important;gap:6px 8px!important}
      .search{flex:1 1 100%!important}
      .search span{display:none}
      .count{order:2;flex:1 1 auto;font-size:12px}
      .sort{order:3;gap:4px}
      .sort label{display:none}
      .sort select{padding:5px 6px;font-size:13px}
      #reset{order:4;padding:5px 8px;font-size:13px}
    `, js: ''
  },
  D1: {
    css: `
      .row-head .tag:not(.tag-fr){display:none}
      .row-head{gap:4px 8px}
      .row-family{-webkit-line-clamp:1!important}
      .shots .shot{position:relative}
      .shots .shot img{max-height:140px!important}
      .shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}
      .row-foot .cap{display:none}
    `, js: ''
  },
  D2: {
    css: `
      .shots{display:none!important}
      .row-family{display:none!important}
      .row-head .tag:not(.tag-fr){display:none}
      .row-head h3{font-size:17px}
      .row{grid-template-columns:40px minmax(0,1fr)!important;padding:9px 0!important;gap:12px!important}
      .row-foot{grid-column:1/-1!important;font-size:12px}
      .row-foot .cap{display:none}
      .row-def{-webkit-line-clamp:1!important;font-size:13px}
      .no{font-size:17px!important}
    `, js: ''
  },
  D3: {
    css: `
      .shots .shot img{max-height:84px!important}
      .shots .shot{position:relative}
      .shots figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 5px;background:rgba(220,220,214,.92)}
      .row-family{-webkit-line-clamp:1!important}
      .row-head .tag:not(.tag-fr):not(.tag-thr){display:none}
      .row-foot .cap{display:none}
      .row{padding:10px 0!important}
    `, js: ''
  },
  E1: {
    css: '',
    js: `
      var facts = document.querySelector('.mast-facts');
      var ledger = document.querySelector('#ledger');
      ledger.parentNode.insertBefore(facts, ledger.nextSibling);
      facts.style.margin = '18px 0 0';
      facts.style.paddingTop = '14px';
      facts.style.borderTop = '2px solid var(--rule)';
    `
  },
  E2: {
    css: `.mast{padding-bottom:8px}`,
    js: `
      var bar = document.querySelector('.bar');
      var search = bar.querySelector('.search');
      var rail = document.querySelector('.rail');
      var wrap = document.createElement('div');
      wrap.style.cssText = 'padding:10px 16px 8px;border-bottom:2px solid var(--ink);background:var(--ground)';
      wrap.appendChild(search);
      rail.parentNode.insertBefore(wrap, rail);
      search.style.flex = '1 1 auto';
    `
  },
  // 我的新方案：把 rail 变成「筛选抽屉」，只在清单上方留一条 40px 的按钮行
  G1: {
    css: `
      .rail{max-height:none!important;overflow:visible!important;padding:0!important;border-bottom:0!important}
      #drawerbtn{display:flex;align-items:center;justify-content:space-between;gap:8px;
        margin:10px 16px 0;padding:9px 12px;border:1px solid var(--rule-2);
        font-size:14px;font-weight:600;color:var(--ink);background:var(--card);cursor:pointer}
      #drawerbtn .chev{font-family:var(--num);font-size:13px;color:var(--ink-3)}
      #drawer{display:none;max-height:70vh;overflow-y:auto;padding:10px 16px 14px;
        border-bottom:2px solid var(--ink);background:var(--ground)}
    `,
    js: `
      var rail = document.querySelector('.rail');
      var btn = document.createElement('button');
      btn.id = 'drawerbtn'; btn.type = 'button';
      btn.innerHTML = '<span>筛选 · 11 组 / 47 颗芯片</span><span class="chev">展开 ▾</span>';
      var drawer = document.createElement('div');
      drawer.id = 'drawer';
      while (rail.firstChild) drawer.appendChild(rail.firstChild);
      rail.appendChild(btn); rail.appendChild(drawer);
      btn.addEventListener('click', function () {
        var open = drawer.style.display === 'block';
        drawer.style.display = open ? 'none' : 'block';
        btn.querySelector('.chev').textContent = open ? '展开 ▾' : '收起 ▴';
      });
    `
  },
  // 我的方案：清单行改双列（390 宽放 2 列卡）？——先量单列最省
  H1: {
    css: `
      .mast-claim,.mast-exit{display:none!important}
      .mast{padding:12px 16px 10px}
      .mast-wizard{margin-top:8px}
      .mast-facts>div{border-top-width:1px;padding-top:4px}
      .mast-facts dd{font-size:17px}
      .mast-facts dt{font-size:11px}
    `, js: ''
  }
};

const COMBOS = {
  F1: { parts: ['A1', 'B2', 'C1', 'D1'], note: '折两段散文 + 筛选只留第 1 组 + 工具条收进按钮 + 行卡温和瘦身' },
  F2: { parts: ['A2', 'B1', 'C1', 'D1'], note: '页头三段全折 + 筛选整条 48px + 工具条收 + 行卡温和' },
  F3: { parts: ['A1', 'B3', 'C2', 'D1'], note: '散文折 + 筛选 1 行横滑 + 工具条两行不折 + 行卡温和' },
  F4: { parts: ['A2', 'B1', 'C1', 'D1', 'D3'], note: 'F2 + 行卡再瘦（截图 190→84）' },
  F5: { parts: ['A4', 'G1', 'C1', 'D3'], note: '我的推荐候选：A4 保留定位句 + G1 抽屉按钮 + C1 工具条 + D3 行卡' },
  F6: { parts: ['A2', 'G1', 'C2', 'D3'], note: '激进 + 抽屉 + 工具条不折 + D3' },
  F7: { parts: ['A2', 'B1', 'C1', 'D2'], note: '极限：连截图都不要（看 1 屏能放几张卡）' },
  F8: { parts: ['A4', 'B1', 'C1', 'D3'], note: 'A4 + B1 + C1 + D3（不用抽屉）' }
};

const { browser, page } = await launchPage(W, H);

async function run(keys, combos) {
  await gotoSelection(page);
  const applySrc = keys.map((k) => `/* ${k} */ (function(){ ${(combos ? A[k] : A[k]).js || ''} })();`).join('\n');
  const cssSrc = keys.map((k) => A[k].css || '').join('\n');
  return page.eval(`(async () => {
    ${INPAGE}
    ${TAIL}
    var st = document.createElement('style'); st.textContent = ${JSON.stringify(cssSrc)}; document.head.appendChild(st);
    new Function(${JSON.stringify(applySrc)})();
    await new Promise(function (r) { setTimeout(r, 150); });
    return __measure();
  })()`);
}

const results = {};
await gotoSelection(page);
const base = await page.eval(`(async () => { ${INPAGE} ${TAIL} return __measure(); })()`);
results.V0 = { name: '现状（基线）', note: '不动。', m: base };
console.log(`V0   现状`);
console.log(`     mast=${base.mast} rail=${base.rail} bar=${base.bar} | 首卡 top=${base.firstRowTop} h=${base.firstRowH} bottom=${base.firstRowBottom} 可见=${base.firstRowVisiblePct}%`);
console.log(`     首屏完整卡=${base.fullCards} 部分=${base.partialCards} | 行 min/med/max/avg=${base.rowMin}/${base.rowMed}/${base.rowMax}/${base.rowAvg} | scrollH=${base.docScrollH} | 首屏控件=${base.firstScreenControls}`);

async function report(key, name, note, keys, isCombo) {
  const m = await run(keys);
  results[key] = { name, note, parts: isCombo ? keys : undefined, m };
  console.log(`\n${key.padEnd(4)} ${name}`);
  console.log(`     mast=${m.mast} rail=${m.rail} bar=${m.bar} | 首卡 top=${m.firstRowTop} h=${m.firstRowH} bottom=${m.firstRowBottom} 可见=${m.firstRowVisiblePct}%`);
  console.log(`     首屏完整卡=${m.fullCards} 部分=${m.partialCards} | 行 ${m.rowMin}/${m.rowMed}/${m.rowMax}/${m.rowAvg} | scrollH=${m.docScrollH} | 横向溢出=${m.docHOverflow} | rail内滚=${m.railInner}`);
  console.log(`     隐藏正文=${m.hiddenChars} 字 | 首屏控件=${m.firstScreenControls} | chrome合计=${m.chrome}`);
  if (m.hiddenEls.length) console.log('     丢了: ' + m.hiddenEls.map((h) => `${h.el}(${h.chars}字)`).join(', ').slice(0, 300));
}

for (const [k, v] of Object.entries({ A1: '折页头·只折两段散文', A2: '折页头·三段全折（含向导按钮）', A3: '页头重排·不折字', A4: '折页头·保留定位句' })) {
  await report(k, v, '', [k], false);
}
for (const [k, v] of Object.entries({ B1: '折筛选栏·整条 48px', B2: '折筛选栏·只留第 1 组', B3: '筛选变 1 行横滑条', G1: '筛选变抽屉按钮' })) {
  await report(k, v, '', [k], false);
}
for (const [k, v] of Object.entries({ C1: '工具条·收进按钮', C2: '工具条·两行不折' })) {
  await report(k, v, '', [k], false);
}
for (const [k, v] of Object.entries({ D1: '行卡·温和', D2: '行卡·票据（无图）', D3: '行卡·中（图 84）' })) {
  await report(k, v, '', [k], false);
}
for (const [k, v] of Object.entries({ E1: 'facts 移到清单后', E2: '搜索框提到页头下', H1: '页头只留 h1+向导' })) {
  await report(k, v, '', [k], false);
}
for (const [k, v] of Object.entries(COMBOS)) {
  await report(k, v.note, '', v.parts, true);
}

await browser.close();
writeFileSync(join(HERE, 'data-p5-list-variants.json'), JSON.stringify(results, null, 2), 'utf8');
