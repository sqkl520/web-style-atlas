// _candidates.mjs — 最终候选设计（1..5）在 390 与 1440 两档的实测
// 与 _variants 的区别：这些是"准备落源码"的形态，含「向导留在首屏」「家族保 2 行」等不丢内容的取舍。
// 每个候选都在 DOM 上模拟，并在 1440 档额外验证「de-fold（≥621px 展开）」是否回到 304.0。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 模拟「源码形态」：按计划改好的 index.html 结构 + style.css 的窄档规则 ─────────
const BUILD = `
  // ① 页头：claim + exit 折进 details，向导链接挪进 summary 同一行
  var mastId = document.querySelector('.mast-id');
  var claim = document.querySelector('.mast-claim');
  var exit  = document.querySelector('.mast-exit');
  var wiz   = document.querySelector('.mast-wizard');
  var fold = document.createElement('details');
  fold.className = 'mast-fold';
  fold.id = 'mast-fold';
  var sum = document.createElement('summary');
  var lede = document.createElement('span');
  lede.className = 'mast-fold-lede';
  lede.textContent = '这个图集是什么 · 想直接拿成品去哪';
  var wizA = wiz.querySelector('a');
  wizA.className = 'mast-fold-wizard';
  sum.appendChild(lede);
  sum.appendChild(wizA);
  claim.parentNode.insertBefore(fold, claim);
  fold.appendChild(sum);
  fold.appendChild(claim);
  fold.appendChild(exit);
  wiz.remove();
  fold.open = false;

  // ② 筛选栏：整条内容进 details
  var rail = document.querySelector('.rail');
  var rfold = document.createElement('details');
  rfold.className = 'rail-fold';
  rfold.id = 'rail-fold';
  var rsum = document.createElement('summary');
  rsum.textContent = '筛选 · 11 组（先按你是做什么的挑）';
  var rbody = document.createElement('div');
  rbody.className = 'rail-fold-body';
  while (rail.firstChild) rbody.appendChild(rail.firstChild);
  rfold.appendChild(rsum); rfold.appendChild(rbody);
  rail.appendChild(rfold);
  rfold.open = false;

  // ③ 工具条：搜索常驻；排序进 details，计数与清空留在可见行
  var bar = document.querySelector('.bar');
  var sort = document.querySelector('.sort');
  var reset = document.querySelector('#reset');
  var bfold = document.createElement('details');
  bfold.className = 'bar-fold';
  bfold.id = 'bar-fold';
  var bsum = document.createElement('summary');
  bsum.textContent = '排序';
  bfold.appendChild(bsum);
  bfold.appendChild(sort);
  bar.appendChild(bfold); bar.appendChild(reset);
  bfold.open = false;
`;

const CSS_COMMON = `
  /* ── 窄档（≤620px）规则，等价于将来写进 @media (max-width:620px) ── */
  .mast-fold { margin-top: 8px; }
  .mast-fold > summary {
    min-height: 44px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 8px 0; cursor: pointer; font-size: 14px; font-weight: 600; line-height: 1.4;
    color: var(--ink-2); list-style-position: inside;
  }
  .mast-fold[open] > summary { margin-bottom: 6px; }
  .mast-fold-lede { flex: 1 1 auto; min-width: 0; }
  .mast-fold-wizard {
    flex: 0 0 auto; font-size: 13px; font-weight: 600; line-height: 1.3;
    padding: 6px 8px; background: var(--ink); color: var(--card); text-decoration: none;
  }
  .mast-fold .mast-claim { margin-top: 0; font-size: 14px; line-height: 1.6; }
  .mast-fold .mast-exit { margin-top: 10px; padding-top: 8px; font-size: 13px; }
  .mast-facts { display: flex; gap: 10px; margin-top: 12px; }
  .mast-facts > div { flex: 1 1 0; min-width: 0; border-top: 1px solid var(--ink); padding-top: 4px; }
  .mast-facts dt { font-size: 11px; line-height: 1.25; }
  .mast-facts dd { font-size: 16px; line-height: 1.2; margin-top: 0; }

  .rail { max-height: none; overflow: visible; padding: 6px 16px 8px; }
  .rail-fold > summary {
    min-height: 44px; display: flex; align-items: center; padding: 6px 0; cursor: pointer;
    font-size: 14px; font-weight: 600; line-height: 1.4; list-style-position: inside;
  }
  .rail-fold-body { padding-bottom: 6px; }

  .bar { gap: 8px 10px; padding-bottom: 12px; }
  .search { flex: 1 1 100%; }
  .bar-fold > summary {
    min-height: 36px; display: flex; align-items: center; padding: 6px 10px; cursor: pointer;
    font-size: 13px; line-height: 1.3; border: 1px solid var(--rule-2); color: var(--ink-2);
    list-style-position: inside;
  }
  .bar-fold[open] > summary { margin-bottom: 6px; }
`;

const CARD = {
  C0: '',
  // 家族保 2 行 + 图注叠图
  'C1': '.shots .shot img{max-height:104px}.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;line-height:1.4;padding:1px 4px;background:rgba(242,242,238,.92)}'
    + '.row{gap:14px;padding:10px 0}.row-meta{gap:4px 10px;margin-top:8px}'
    + '.row-foot{gap:4px 10px;font-size:12px;line-height:1.45;margin-top:0}',
  // 家族 1 行 + 图注叠图
  'C2': '.shots .shot img{max-height:104px}.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;line-height:1.4;padding:1px 4px;background:rgba(242,242,238,.92)}'
    + '.row{gap:14px;padding:10px 0}.row-meta{gap:4px 10px;margin-top:8px}'
    + '.row-family{-webkit-line-clamp:1}'
    + '.row-foot{gap:4px 10px;font-size:12px;line-height:1.45;margin-top:0}',
  // 家族 2 行 + 图注仍在图下（不叠图），图 96
  'C3': '.shots .shot img{max-height:96px}'
    + '.row{gap:14px;padding:10px 0}.row-meta{gap:4px 10px;margin-top:8px}'
    + '.row-foot{gap:4px 10px;font-size:12px;line-height:1.45;margin-top:0}',
};

const CAND = {
  F0: { label: '现状基线', build: false, css: '', card: 'C0' },
  F1: { label: 'F1 折页头＋折筛选＋工具条折排序＋卡(图104/叠图注/家族2行)', build: true, css: CSS_COMMON, card: 'C1' },
  F2: { label: 'F2 同 F1 但家族 1 行', build: true, css: CSS_COMMON, card: 'C2' },
  F3: { label: 'F3 同 F1 但图注在图下、图 96（不叠图）', build: true, css: CSS_COMMON, card: 'C3' },
  F4: { label: 'F4 同 F1 但 facts 不压（原 4 列大数字）', build: true, css: CSS_COMMON.replace(/\.mast-facts[^}]*\}/g, ''), card: 'C1' },
};

// ≥621px 的 de-fold：作者样式把关闭态正文放出来，summary 收起
const DEFOLD = `
  @media (min-width: 621px) {
    .mast-fold::details-content, .rail-fold::details-content, .bar-fold::details-content {
      content-visibility: visible !important;
    }
    .mast-fold > summary, .rail-fold > summary, .bar-fold > summary { display: none; }
  }
`;

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const r0 = rows[0];
  const inner = {};
  if (r0) {
    const rt = r0.getBoundingClientRect().top;
    for (const [k, sel] of Object.entries({ main: '.row-main', head: '.row-head', def: '.row-def', meta: '.row-meta', family: '.row-family', shots: '.shots', img: '.shots .shot:first-child img', cap: '.shots figcaption', foot: '.row-foot' })) {
      const e = r0.querySelector(sel);
      if (e) { const b = e.getBoundingClientRect(); inner[k] = { top: +(b.top - rt).toFixed(1), h: +b.height.toFixed(1) }; }
    }
  }
  return {
    mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    firstBottom: boxes[0] ? +(boxes[0].top + boxes[0].h).toFixed(1) : null,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    slack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    inner,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    folds: [...document.querySelectorAll('details')].filter((d) => d.className.includes('fold')).map((d) => ({ cls: d.className, open: d.open, sumH: +d.querySelector('summary').getBoundingClientRect().height.toFixed(1), textLen: d.textContent.replace(/\s+/g, '').length })),
    mastParts: [...document.querySelectorAll('.mast-id > *, .mast-facts')].map((e) => e.tagName.toLowerCase() + '.' + (e.className || '') + ' h=' + e.getBoundingClientRect().height.toFixed(1)),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, dsf: 2, mobile: true }, { k: '1440', w: 1440, h: 900, dsf: 1, mobile: false }]) {
  out[vp.k] = {};
  console.log(`\n===== ${vp.k} =====`);
  for (const [k, c] of Object.entries(CAND)) {
    const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.dsf, mobile: vp.mobile });
    await p.goto(PAGE, { settleMs: 1500 });
    if (c.build) {
      await p.eval((code) => { new Function(code)(); }, BUILD);
      await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, c.css + (vp.k === '1440' ? DEFOLD : '') + '\n' + (CARD[c.card] || ''));
      await sleep(250);
    }
    const m = await p.eval(MEASURE);
    m.label = c.label;
    out[vp.k][k] = m;
    console.log(`${k.padEnd(3)} ${c.label}`);
    console.log(`    mast=${m.mastH} rail=${m.railH} bar=${m.barH} | 首卡 top=${m.firstRowTop} h=${m.firstRowH} bottom=${m.firstBottom} 完整=${m.completeCards} 部分=${m.partialCards} 余量=${m.slack} ovX=${m.overflowX}`);
    if (m.inner.img) console.log(`    行内 main=${m.inner.main?.h} family=${m.inner.family?.h} shots=${m.inner.shots?.h} img=${m.inner.img.h} cap=${m.inner.cap?.h} foot=${m.inner.foot?.h}`);
    if (m.folds.length) console.log(`    折叠：${m.folds.map((f) => `${f.cls} open=${f.open} sum=${f.sumH} len=${f.textLen}`).join(' | ')}`);
    if (vp.k === '1440') console.log(`    mast 组成：${m.mastParts.join(' / ')}`);
    await p.close();
  }
}
writeFileSync(join(HERE, 'data-67-candidates.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-candidates.json');
