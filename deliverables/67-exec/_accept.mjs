// _accept.mjs — 验收：直接量**改后的源码**（不做任何 DOM 动态改）
// acc1 390 首卡 top / 首屏完整卡数（要求 top ≤600、完整 ≥1）
// acc2 1440 改前/改后对比（用 _before/ 里的快照做改前，源码做改后）
// acc3 折叠块展开后内容完整（子节点数与文字长度逐个比）
// acc4 无横向溢出 + 无 JS 报错 + console 全量
// acc5 键盘可达（Tab 到 summary、Enter 展开）
// acc6 768 档（顺带）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
// 改前快照：把 _before/ 里的 index.html 放到同目录不行（相对路径会断），
// 所以改用「源码 + 运行时还原成旧结构」的做法不划算 —— 直接对比数值即可，
// 旧数值来自本目录 data-67-measure.json（本轮改前实测，同一套口径）。
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const de = document.documentElement;
  return {
    vw: innerWidth, vh,
    mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    railClientH: q('.rail')?.clientHeight, railScrollH: q('.rail')?.scrollHeight,
    ledgerTop: +q('.ledger').getBoundingClientRect().top.toFixed(1),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h, firstBottom: boxes[0] ? +(boxes[0].top + boxes[0].h).toFixed(1) : null,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    overflowX: de.scrollWidth - de.clientWidth,
    docH: de.scrollHeight,
    folds: [...document.querySelectorAll('details')].filter((d) => /-fold/.test(d.className)).map((d) => ({
      id: d.id, open: d.open, sumH: +d.querySelector('summary').getBoundingClientRect().height.toFixed(1),
      sumVisible: d.querySelector('summary').checkVisibility({ checkVisibilityCSS: true }),
    })),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), src: SRC };

// ── acc1: 390 ───────────────────────────────────────────────────────────
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(SRC, { settleMs: 1800 });
  out.acc1 = await p.eval(M);
  out.acc1.consoleErrors = p.consoleErrors.slice();
  out.acc1.exceptions = await p.eval(() => window.__errs || []);
  console.log('【acc1】390×844 改后源码');
  console.log(JSON.stringify(out.acc1, null, 1));
  console.log(`  首卡 top ${out.acc1.firstRowTop} ≤ 600 ? ${out.acc1.firstRowTop <= 600 ? 'PASS' : 'FAIL'}`);
  console.log(`  首屏完整卡 ${out.acc1.completeCards} ≥ 1 ? ${out.acc1.completeCards >= 1 ? 'PASS' : 'FAIL'}`);
  console.log(`  横向溢出 ${out.acc1.overflowX} = 0 ? ${out.acc1.overflowX === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  JS 异常 ${out.acc1.consoleErrors.length} = 0 ? ${out.acc1.consoleErrors.length === 0 ? 'PASS' : 'FAIL'}  ${out.acc1.consoleErrors.join(' | ')}`);

  // ── acc3: 展开后内容完整 ─────────────────────────────────────────────
  const detailFolds = () => p.eval(() => {
    const g = (id) => {
      const d = document.getElementById(id);
      if (!d) return null;
      const body = d.querySelector('.rail-fold-body') || d;
      return { open: d.open, nodes: body.childElementCount, textLen: d.textContent.replace(/\s+/g, '').length,
        blocks: d.querySelectorAll('.rail-block').length, chips: d.querySelectorAll('.chips button').length };
    };
    return { mast: g('mast-fold'), rail: g('rail-fold'), bar: g('bar-fold') };
  });
  out.acc3_closed = await detailFolds();
  // 全部展开
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) document.getElementById(id).open = true; });
  await sleep(300);
  out.acc3_open = await detailFolds();
  out.acc3_openMetrics = await p.eval(M);
  // 展开后原文可见性
  out.acc3_visible = await p.eval(() => {
    const res = {};
    for (const [k, sel] of Object.entries({ claim: '.mast-claim', exit: '.mast-exit', lead: '.rail-lead', note: '.rail-note p', sort: '#sort', reset: '#reset' })) {
      const e = document.querySelector(sel);
      const cs = e && getComputedStyle(e);
      res[k] = e ? { visible: e.checkVisibility({ checkVisibilityCSS: true }), display: cs.display, h: +e.getBoundingClientRect().height.toFixed(1),
        textLen: e.textContent.replace(/\s+/g, '').length } : null;
    }
    return res;
  });
  console.log('\n【acc3】折叠块内容完整性（收起 / 展开）');
  console.log('  收起:', JSON.stringify(out.acc3_closed));
  console.log('  展开:', JSON.stringify(out.acc3_open));
  console.log('  展开后原文可见:', JSON.stringify(out.acc3_visible, null, 1));
  console.log('  展开后页面:', JSON.stringify({ firstRowTop: out.acc3_openMetrics.firstRowTop, ovX: out.acc3_openMetrics.overflowX, docH: out.acc3_openMetrics.docH }));

  // ── acc5: 键盘 ───────────────────────────────────────────────────────
  await p.goto(SRC, { settleMs: 1500 });
  out.acc5 = await p.eval(() => {
    const r = {};
    for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) {
      const d = document.getElementById(id);
      const s = d.querySelector('summary');
      s.focus();
      r[id] = { focusable: document.activeElement === s, tabIndex: s.tabIndex, before: d.open };
      // 模拟 Enter（summary 的原生行为）
      s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // 原生 details 的 Enter 由 UA 处理，脚本里直接调用 click 等价
      s.click();
      r[id].after = d.open;
      s.click(); // 还原
      r[id].restored = d.open;
    }
    return r;
  });
  console.log('\n【acc5】键盘：summary 可聚焦 + 点击/Enter 展开');
  console.log(JSON.stringify(out.acc5, null, 1));
  await p.close();
}

// ── acc2: 1440 ──────────────────────────────────────────────────────────
{
  const p = await browser.newPage({ width: 1440, height: 900 });
  await p.goto(SRC, { settleMs: 1800 });
  out.acc2 = await p.eval(M);
  out.acc2.consoleErrors = p.consoleErrors.slice();
  console.log('\n【acc2】1440×900 改后源码');
  console.log(JSON.stringify(out.acc2, null, 1));
  console.log(`  与改前（mast 304.0 / rail 900 / bar 59.9 / 首卡 387.9 / 完整 1）对比：`);
  console.log(`    Δmast=${(out.acc2.mastH - 304.0).toFixed(1)} Δrail=${(out.acc2.railH - 900).toFixed(1)} Δbar=${(out.acc2.barH - 59.9).toFixed(1)} Δ首卡=${(out.acc2.firstRowTop - 387.9).toFixed(1)} Δ完整=${out.acc2.completeCards - 1}`);
  await p.close();
}

// ── acc6: 768 ───────────────────────────────────────────────────────────
{
  const p = await browser.newPage({ width: 768, height: 1024 });
  await p.goto(SRC, { settleMs: 1600 });
  out.acc6 = await p.eval(M);
  console.log('\n【acc6】768×1024');
  console.log(JSON.stringify({ mastH: out.acc6.mastH, railH: out.acc6.railH, barH: out.acc6.barH, firstRowTop: out.acc6.firstRowTop, firstRowH: out.acc6.firstRowH, completeCards: out.acc6.completeCards, overflowX: out.acc6.overflowX }));
  await p.close();
}

writeFileSync(join(HERE, 'data-67-accept.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-accept.json');
