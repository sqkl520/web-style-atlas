// _variants.mjs — 390×844 / 1440×900 两档：5 种压缩方案的 DOM 动态实测
// A 折页头 / B 折筛选栏 / C 工具条收进按钮 / D 行卡瘦身 / E 组合（E1..E3 梯度）
// 每种方案记录：首卡 top / 卡高 / 首屏完整卡数 / chrome 分解 / 横向溢出 / 丢掉了什么（人工写在 report 里）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

// ── 实验用的通用件（只在 lab 里存在，不进源码）────────────────────────────
const HELPERS = `
  var LAB = 'style[data-lab], details[data-lab], div[data-lab]';
  function addStyle(css){ var s=document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent=css; document.head.appendChild(s); }
  function fold(el, summaryText, cssText){
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = summaryText;
    s.style.cssText = cssText || 'min-height:44px;display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.4;font-weight:600;padding:8px 0;cursor:pointer';
    var body = document.createElement('div'); body.setAttribute('data-lab','1');
    while (el.firstChild) body.appendChild(el.firstChild);
    d.appendChild(s); d.appendChild(body);
    el.appendChild(d);
    return d;
  }
`;

const V = {
  // ── 基线 ───────────────────────────────────────────────────────────────
  V0: { label: '现状（不动）', code: '' },

  // ── A 折页头：claim + exit 两段散文进 <details>，标题/kicker/向导/facts 全留 ──
  A: { label: 'A 折页头（claim+exit 进 details，向导与 facts 留）', code: `
    var claim = document.querySelector('.mast-claim');
    var exit  = document.querySelector('.mast-exit');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;line-height:1.4;font-weight:600;padding:8px 0;cursor:pointer;margin-top:6px';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    addStyle('.mast-claim{margin-top:8px}');` },

  // ── A2 更狠：连向导按钮也进折页，facts 压成一行 ──────────────────────────
  'A2': { label: 'A2 折页头加强（claim+exit+向导 进 details，facts 压一行）', code: `
    var claim = document.querySelector('.mast-claim');
    var exit  = document.querySelector('.mast-exit');
    var wiz   = document.querySelector('.mast-wizard');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '这个图集是什么 · 走选型向导 · 三个现成模板';
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;line-height:1.4;font-weight:600;padding:8px 0;cursor:pointer;margin-top:6px';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(wiz); d.appendChild(exit);
    d.open = false;
    addStyle('.mast-claim{margin-top:8px}'
      + '.mast-facts{display:flex;gap:10px;margin-top:12px}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:4px;min-width:0}'
      + '.mast-facts dt{font-size:11px;line-height:1.25}'
      + '.mast-facts dd{font-size:16px;line-height:1.2;margin-top:0}');` },

  // ── B 折筛选栏：整条 rail 折成一个 48px 的真 details（内容全在）──────────
  B: { label: 'B 折筛选栏（rail 整体进 details，内容全在）', code: `
    var rail = document.querySelector('.rail');
    var d = fold(rail, '筛选：11 组 · 47 颗芯片（你是做什么的 / 底色 / 结构 / 闸门…）',
      'min-height:48px;display:flex;align-items:center;font-size:14px;line-height:1.4;font-weight:600;padding:6px 0;cursor:pointer');
    d.open = false;
    rail.style.maxHeight='none'; rail.style.overflow='visible'; rail.style.padding='6px 16px 8px';` },

  // ── C 工具条收进按钮：搜索常驻；计数/排序/清空 折起 ──────────────────────
  C: { label: 'C 工具条收进按钮（搜索常驻，排序+清空进 details）', code: `
    var bar = document.querySelector('.bar');
    var sort = document.querySelector('.sort');
    var reset = document.querySelector('#reset');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '排序与清空';
    s.style.cssText = 'min-height:36px;display:flex;align-items:center;font-size:13px;line-height:1.3;padding:6px 8px;border:1px solid var(--rule-2);cursor:pointer;color:var(--ink-2)';
    bar.appendChild(d); d.appendChild(s);
    d.appendChild(sort); d.appendChild(reset);
    d.open = false;
    addStyle('.search{flex:1 1 100%}.sort{margin-top:8px}.bar{gap:8px 10px;padding-bottom:12px}');` },

  // ── D 行卡瘦身：只动行内排版密度，一个字段都不删 ─────────────────────────
  D: { label: 'D 行卡瘦身（图 104 + 图注叠图 + gap/内距收紧 + 家族 1 行）', code: `
    addStyle('.shots .shot img{max-height:104px}'
      + '.shot{position:relative}'
      + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;line-height:1.4;padding:1px 4px;background:rgba(238,236,229,.92)}'
      + '.row{gap:14px;padding:10px 0}'
      + '.row-family{-webkit-line-clamp:1}'
      + '.row-foot{gap:4px 10px;font-size:12px;line-height:1.45;margin-top:0}'
      + '.row-meta{gap:4px 10px;margin-top:8px}');` },

  // ── E 组合：A2 + B + C + D ────────────────────────────────────────────
  E: { label: 'E 组合（A2 页头 + B 筛选栏 + C 工具条 + D 行卡）', code: '' },

  // ── E2 组合但保留向导按钮在页头 ───────────────────────────────────────
  'E2': { label: 'E2 组合（A 页头＋B＋C＋D，向导留在页头第一屏）', code: '' },

  // ── E3 组合但行卡不瘦身（验证完全靠 chrome 能否达标）───────────────────
  'E3': { label: 'E3 组合（A2＋B＋C，行卡不动）', code: '' },
};

// 组合型：由零件拼装，避免重复字符串
const PARTS = {
  mastFoldA: `
    var claim = document.querySelector('.mast-claim');
    var exit  = document.querySelector('.mast-exit');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;line-height:1.4;font-weight:600;padding:8px 0;cursor:pointer;margin-top:6px';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    addStyle('.mast-claim{margin-top:8px}');`,
  mastFoldA2: `
    var claim = document.querySelector('.mast-claim');
    var exit  = document.querySelector('.mast-exit');
    var wiz   = document.querySelector('.mast-wizard');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '这个图集是什么 · 走选型向导 · 三个现成模板';
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;line-height:1.4;font-weight:600;padding:8px 0;cursor:pointer;margin-top:6px';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(wiz); d.appendChild(exit);
    d.open = false;
    addStyle('.mast-claim{margin-top:8px}'
      + '.mast-facts{display:flex;gap:10px;margin-top:12px}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:4px;min-width:0}'
      + '.mast-facts dt{font-size:11px;line-height:1.25}'
      + '.mast-facts dd{font-size:16px;line-height:1.2;margin-top:0}');`,
  railFold: `
    var rail = document.querySelector('.rail');
    var d = fold(rail, '筛选：11 组 · 47 颗芯片（你是做什么的 / 底色 / 结构 / 闸门…）',
      'min-height:48px;display:flex;align-items:center;font-size:14px;line-height:1.4;font-weight:600;padding:6px 0;cursor:pointer');
    d.open = false;
    rail.style.maxHeight='none'; rail.style.overflow='visible'; rail.style.padding='6px 16px 8px';`,
  barFold: `
    var bar = document.querySelector('.bar');
    var sort = document.querySelector('.sort');
    var reset = document.querySelector('#reset');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '排序与清空';
    s.style.cssText = 'min-height:36px;display:flex;align-items:center;font-size:13px;line-height:1.3;padding:6px 8px;border:1px solid var(--rule-2);cursor:pointer;color:var(--ink-2)';
    bar.appendChild(d); d.appendChild(s);
    d.appendChild(sort); d.appendChild(reset);
    d.open = false;
    addStyle('.search{flex:1 1 100%}.sort{margin-top:8px}.bar{gap:8px 10px;padding-bottom:12px}');`,
  rowSlim: `
    addStyle('.shots .shot img{max-height:104px}'
      + '.shot{position:relative}'
      + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;line-height:1.4;padding:1px 4px;background:rgba(238,236,229,.92)}'
      + '.row{gap:14px;padding:10px 0}'
      + '.row-family{-webkit-line-clamp:1}'
      + '.row-foot{gap:4px 10px;font-size:12px;line-height:1.45;margin-top:0}'
      + '.row-meta{gap:4px 10px;margin-top:8px}');`,
};
V.E.code = PARTS.mastFoldA2 + PARTS.railFold + PARTS.barFold + PARTS.rowSlim;
V.E2.code = PARTS.mastFoldA + PARTS.railFold + PARTS.barFold + PARTS.rowSlim;
V.E3.code = PARTS.mastFoldA2 + PARTS.railFold + PARTS.barFold;

const MEASURE = () => {
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const t = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().top.toFixed(1) : null; };
  const de = document.documentElement;
  // 行卡内部构成（第一张）
  const inner = {};
  if (rows[0]) {
    const r = rows[0];
    for (const [k, sel] of Object.entries({ main: '.row-main', head: '.row-head', def: '.row-def', meta: '.row-meta', shots: '.shots', img: '.shots .shot:first-child img', cap: '.shots figcaption', foot: '.row-foot' })) {
      const e = r.querySelector(sel);
      if (e) { const b = e.getBoundingClientRect(); inner[k] = { top: +(b.top - r.getBoundingClientRect().top).toFixed(1), h: +b.height.toFixed(1) }; }
    }
  }
  return {
    mastH: g('.mast'), railH: g('.rail'), barH: g('.bar'), ledgerTop: t('.ledger'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    visibleFraction: boxes[0] ? +Math.max(0, Math.min(1, (vh - Math.max(0, boxes[0].top)) / boxes[0].h)).toFixed(3) : null,
    inner,
    docH: de.scrollHeight, overflowX: de.scrollWidth - de.clientWidth,
    // 折叠块是否可见 / 内容是否还在
    folds: [...document.querySelectorAll('details[data-lab]')].map((d) => ({ summary: d.querySelector('summary')?.textContent.trim().slice(0, 24), open: d.open, textLen: d.textContent.replace(/\s+/g, '').length })),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), note: '全部在 DOM 上动态改，未改源码', vps: {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const vp of [{ k: '390', w: 390, h: 844, mobile: true }, { k: '1440', w: 1440, h: 900, mobile: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.k === '390' ? 2 : 1, mobile: vp.mobile });
  await p.goto(PAGE, { settleMs: 1700 });
  out.vps[vp.k] = {};
  console.log(`\n===== ${vp.k} (${vp.w}x${vp.h}) =====`);
  console.log('变体'.padEnd(24) + 'mast   rail   bar   ledger  首卡top  卡高   完整 部分 可见%');
  for (const [k, v] of Object.entries(V)) {
    await p.goto(PAGE, { settleMs: 1300 });   // 每次复位：整页重载
    if (v.code) await p.eval((payload) => { new Function(payload.helpers + payload.code)(); }, { helpers: HELPERS, code: v.code });
    await sleep(250);
    const m = await p.eval(MEASURE);
    m.label = v.label; m.consoleErrors = p.consoleErrors.length;
    out.vps[vp.k][k] = m;
    console.log(
      k.padEnd(24) +
      String(m.mastH).padStart(5) + ' ' + String(m.railH).padStart(6) + ' ' + String(m.barH).padStart(5) + ' ' +
      String(m.ledgerTop).padStart(7) + ' ' + String(m.firstRowTop).padStart(8) + ' ' + String(m.firstRowH).padStart(6) + ' ' +
      String(m.completeCards).padStart(5) + String(m.partialCards).padStart(4) + ' ' + String(Math.round(m.visibleFraction * 100)).padStart(4) + '%' +
      (m.overflowX ? '  ⚠ovX=' + m.overflowX : '')
    );
    if (m.inner.img) console.log(' '.repeat(24) + `行内：main=${m.inner.main?.h} shots=${m.inner.shots?.h} img=${m.inner.img.h} cap=${m.inner.cap?.h} foot=${m.inner.foot?.h}`);
  }
  await p.close();
}

writeFileSync(join(HERE, 'data-67-variants.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-variants.json');
