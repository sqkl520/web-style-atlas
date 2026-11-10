// _lab.mjs — 四件事，全部 CDP 实测：
//  1) 关闭态 details + ::details-content 展开后，正文在**无障碍树**里还在吗（桌面档最关键的未知）
//  2) 390 档：facts 改「一行四个读数」能省多少；行卡 24 种组合的首卡 top / 卡高 / 完整卡数
//  3) 横向溢出 20px 是谁造成的（逐元素右边界）
//  4) 1440 档 de-fold 之后：mast / rail / bar / 首卡 / 完整卡数 与改动前逐项对比
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 源码形态的 DOM 重排（页头只折 claim+exit；向导留在外面）
const BUILD = `
  var claim = document.querySelector('.mast-claim');
  var exit  = document.querySelector('.mast-exit');
  var fold = document.createElement('details');
  fold.className = 'mast-fold'; fold.id = 'mast-fold';
  var sum = document.createElement('summary');
  sum.textContent = '这个图集是什么 · 想直接拿成品去哪';
  claim.parentNode.insertBefore(fold, claim);
  fold.appendChild(sum); fold.appendChild(claim); fold.appendChild(exit);
  fold.open = false;

  var rail = document.querySelector('.rail');
  var rfold = document.createElement('details');
  rfold.className = 'rail-fold'; rfold.id = 'rail-fold';
  var rsum = document.createElement('summary');
  rsum.textContent = '筛选 · 11 组（先按你是做什么的挑）';
  var rbody = document.createElement('div');
  rbody.className = 'rail-fold-body';
  while (rail.firstChild) rbody.appendChild(rail.firstChild);
  rfold.appendChild(rsum); rfold.appendChild(rbody);
  rail.appendChild(rfold); rfold.open = false;

  var bar = document.querySelector('.bar');
  var sort = document.querySelector('.sort');
  var bfold = document.createElement('details');
  bfold.className = 'bar-fold'; bfold.id = 'bar-fold';
  var bsum = document.createElement('summary'); bsum.textContent = '排序';
  bfold.appendChild(bsum);
  sort.parentNode.insertBefore(bfold, sort);
  bfold.appendChild(sort);
  bfold.open = false;
`;

// 窄档 CSS（将来写进 @media (max-width:620px)）
const narrowCSS = (o) => `
  .mast-fold { margin-top: 8px; }
  .mast-fold > summary {
    min-height: 44px; display: flex; align-items: center;
    padding: 8px 0; cursor: pointer; font-size: 13px; font-weight: 600;
    line-height: 1.4; color: var(--ink-2); list-style-position: inside;
  }
  .mast-fold[open] > summary { margin-bottom: 4px; }
  .mast-fold .mast-claim { margin-top: 0; }
  .mast-fold .mast-exit { margin-top: 10px; }

  ${o.factsInline ? `
  .mast-facts { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: 12px;
    border-top: 1px solid var(--ink); padding-top: 6px; }
  .mast-facts > div { display: flex; align-items: baseline; gap: 4px; border-top: none; padding-top: 0; }
  .mast-facts dt { font-size: 13px; line-height: 1.45; }
  .mast-facts dd { font-size: 16px; line-height: 1.45; margin-top: 0; }` : ''}

  .rail { max-height: none; overflow: visible; padding: 4px 16px 6px; }
  .rail-fold > summary {
    min-height: 44px; display: flex; align-items: center; padding: 4px 0;
    cursor: pointer; font-size: 13px; font-weight: 600; line-height: 1.4;
    list-style-position: inside;
  }
  .rail-fold-body { padding-bottom: 4px; }

  .bar { gap: 8px 10px; padding-bottom: 12px; }
  .search { flex: 1 1 100%; }
  .bar-fold > summary {
    min-height: 34px; display: flex; align-items: center; padding: 6px 10px;
    cursor: pointer; font-size: 13px; line-height: 1.3;
    border: 1px solid var(--rule-2); color: var(--ink-2); list-style-position: inside;
  }
  .bar-fold[open] { flex: 1 1 100%; }
  .bar-fold[open] > summary { margin-bottom: 6px; }
`;

const cardCSS = (o) => `
  .shots .shot img { max-height: ${o.img}px; }
  ${o.overlay ? `.shot { position: relative; }
  .shot figcaption { position: absolute; right: 0; bottom: 0; padding: 1px 5px;
    background: rgba(242,242,238,.92); font-size: 13px; }` : ''}
  .row { gap: ${o.gap}px; padding: ${o.pad}px 0; }
  .row-meta { gap: 4px 10px; margin-top: 8px; }
  ${o.family === 1 ? '.row-family { -webkit-line-clamp: 1; }' : ''}
  .row-foot { gap: 4px 10px; margin-top: 0; }
`;

// 宽档 de-fold
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
      if (e) { const b = e.getBoundingClientRect(); inner[k] = +b.height.toFixed(1); }
    }
    inner._rowTopRel = rt;
  }
  return {
    mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    railScrollH: q('.rail')?.scrollHeight,
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h, firstBottom: boxes[0] ? +(boxes[0].top + boxes[0].h).toFixed(1) : null,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    inner,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

// 溢出元凶：右边界超出视口的元素
const OVERFLOW_FIND = () => {
  const w = document.documentElement.clientWidth;
  const bad = [];
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const b = e.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) continue;
    if (b.right > w + 0.5 || b.left < -0.5) {
      bad.push({ el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''),
        left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), scrollW: e.scrollWidth, clientW: e.clientWidth });
    }
  }
  return { viewport: w, docScrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 14) };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString() };

// ── 1) 无障碍树 ─────────────────────────────────────────────────────────
{
  const p = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
  await p.goto(PAGE, { settleMs: 1500 });
  await p.eval((code) => { new Function(code)(); }, BUILD);
  await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, DEFOLD);
  await sleep(300);
  const { nodes } = await p.send('Accessibility.enable').then(() => p.browser.send('Accessibility.getFullAXTree', { depth: -1 }, p.sessionId));
  const texts = nodes.map((n) => (n.name && n.name.value) || '').filter(Boolean);
  const hasClaimFrag = texts.some((t) => t.includes('每个方案都有一个可运行的原型'));
  const hasExitFrag = texts.some((t) => t.includes('只想要') || t.includes('企业站 M01'));
  const hasWizard = texts.some((t) => t.includes('走选型向导'));
  const linkNames = nodes.filter((n) => n.role && n.role.value === 'link').map((n) => n.name?.value).filter(Boolean);
  // 键盘可达性：能不能 Tab 进 de-fold 后的链接
  const focusable = await p.eval(() => {
    const a = document.querySelector('.mast-exit a');
    a.focus();
    const ok = document.activeElement === a;
    const cs = getComputedStyle(a);
    return { focused: ok, visibility: cs.visibility, tabIndex: a.tabIndex, rectH: +a.getBoundingClientRect().height.toFixed(1) };
  });
  out.axTree = { hasClaimFrag, hasExitFrag, hasWizard, linkNames: linkNames.slice(0, 12), focusable };
  console.log('【1】AX 树（1440，关闭态 + ::details-content 展开）');
  console.log('   claim 在树里:', hasClaimFrag, '| exit 在树里:', hasExitFrag, '| 向导按钮:', hasWizard);
  console.log('   links:', linkNames.join(' | '));
  console.log('   Tab 到 exit 链接:', focusable);
  await p.close();
}

// ── 2) 390 档组合搜索 ───────────────────────────────────────────────────
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vp390 = { combos: {} };

  // 基线（同时查溢出）
  out.vp390.baseline = await p.eval(MEASURE);
  out.vp390.baselineOverflow = await p.eval(OVERFLOW_FIND);
  console.log('\n【2】390 基线:', JSON.stringify(out.vp390.baseline));
  console.log('   基线溢出:', JSON.stringify(out.vp390.baselineOverflow));

  // 应用 BUILD 后逐个组合：每次重载复位
  const combos = [];
  for (const factsInline of [false, true]) {
    for (const img of [104, 88, 80]) {
      for (const family of [2, 1]) {
        for (const overlay of [true, false]) {
          combos.push({ factsInline, img, family, overlay, gap: 12, pad: 8 });
        }
      }
    }
  }
  // 加两个「紧 gap」对照
  combos.push({ factsInline: true, img: 88, family: 2, overlay: true, gap: 10, pad: 7 });
  combos.push({ factsInline: true, img: 96, family: 2, overlay: true, gap: 12, pad: 8 });

  for (const c of combos) {
    await p.goto(PAGE, { settleMs: 1200 });
    await p.eval((code) => { new Function(code)(); }, BUILD);
    await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, narrowCSS(c) + cardCSS(c));
    await sleep(220);
    const m = await p.eval(MEASURE);
    const key = `fi=${c.factsInline ? 'Y' : 'N'} img=${c.img} fam=${c.family} ov=${c.overlay ? 'Y' : 'N'} gap=${c.gap} pad=${c.pad}`;
    out.vp390.combos[key] = { ...c, ...m };
    const okTop = m.firstRowTop <= 600, okFit = m.completeCards >= 1;
    console.log(`   ${key.padEnd(46)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(4)} bar=${String(m.barH).padStart(5)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ${okTop ? '✓top' : '✗top'} ${okFit ? '✓fit' : '✗fit'}`);
  }

  // 选一组最好的，查溢出
  const best = { factsInline: true, img: 88, family: 2, overlay: true, gap: 12, pad: 8 };
  await p.goto(PAGE, { settleMs: 1200 });
  await p.eval((code) => { new Function(code)(); }, BUILD);
  await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, narrowCSS(best) + cardCSS(best));
  await sleep(250);
  out.vp390.finalOverflow = await p.eval(OVERFLOW_FIND);
  out.vp390.final = await p.eval(MEASURE);
  console.log('\n   最终组合溢出检查:', JSON.stringify(out.vp390.finalOverflow, null, 1));
  await p.close();
}

// ── 3) 1440 de-fold 对比 ────────────────────────────────────────────────
{
  const p = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vp1440 = { before: await p.eval(MEASURE) };
  await p.eval((code) => { new Function(code)(); }, BUILD);
  await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, DEFOLD);
  await sleep(300);
  out.vp1440.after = await p.eval(MEASURE);
  out.vp1440.afterOverflow = await p.eval(OVERFLOW_FIND);
  const b = out.vp1440.before, a = out.vp1440.after;
  console.log('\n【3】1440 de-fold 对比');
  console.log(`   mast  ${b.mastH} -> ${a.mastH}   (Δ ${(a.mastH - b.mastH).toFixed(1)})`);
  console.log(`   rail  ${b.railH} -> ${a.railH}   内滚 ${b.railScrollH} -> ${a.railScrollH}`);
  console.log(`   bar   ${b.barH} -> ${a.barH}`);
  console.log(`   首卡  ${b.firstRowTop} -> ${a.firstRowTop}  (Δ ${(a.firstRowTop - b.firstRowTop).toFixed(1)})  卡高 ${b.firstRowH} -> ${a.firstRowH}`);
  console.log(`   完整卡 ${b.completeCards} -> ${a.completeCards} | 部分 ${b.partialCards} -> ${a.partialCards} | ovX ${a.overflowX}`);
  console.log('   溢出:', JSON.stringify(out.vp1440.afterOverflow));
  await p.close();
}

writeFileSync(join(HERE, 'data-67-lab.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-lab.json');
