// p5-shots.mjs — 改前/改后截图（2026-10-28）。
//
// 【"改前"是怎么来的】不 checkout、不 restore（本轮 5 个 Agent 共用仓库，那会抹掉别人的未提交成果）。
// 改成在**同一份页面**上把本次改动逐条逆向还原：
//   · DOM：把 4 条 `<details><summary>…</summary><p class=fold-body>` 还原成原始的 `<dt>/<dd>`
//     （还原的是 longField 那一支的确切结构，不加任何推测）
//   · CSS：撤掉本轮的 `.field-fold > summary{padding:2px 0}`（那一处也影响了老的那条折叠条）
// 然后**断言 scrollHeight 回到基线**（p1-baseline.json 里同案同档的数）。
// 数字对上了，"改前"就是真的改前，而不是我画出来的近似。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, openCase, sleep } from './lib.mjs';

const SHOTS = join(HERE, '..', 'shots-detail');
mkdirSync(SHOTS, { recursive: true });
const BASE = JSON.parse(readFileSync(join(HERE, 'p1-baseline.json'), 'utf8'));

const REVERT = () => {
  // ① DOM：details(长字段) → dt + dd
  document.querySelectorAll('#d-body .field-long > details').forEach((det) => {
    const f = det.closest('.field');
    const sum = det.querySelector(':scope > summary');
    const lab = sum ? sum.querySelector('.fl-lab') : null;
    const p = det.querySelector(':scope > p.fold-body');
    const dt = document.createElement('dt');
    dt.textContent = lab ? lab.textContent : '';
    const dd = document.createElement('dd');
    dd.textContent = p ? p.textContent : '';
    f.className = 'field';
    f.removeChild(det);
    f.appendChild(dt); f.appendChild(dd);
  });
  // ② CSS：撤掉给 .field-fold summary 加的上下 2px
  const s = document.createElement('style');
  s.setAttribute('data-revert', '1');
  s.textContent = '#d-body .field-fold details > summary{padding-top:0;padding-bottom:0}';
  document.head.appendChild(s);
  return document.getElementById('detail').scrollHeight;
};

const SCROLL_TO = (sel) => {
  const d = document.getElementById('detail');
  const el = document.querySelector(sel);
  if (!el) return null;
  d.scrollTop = el.getBoundingClientRect().top - d.getBoundingClientRect().top + d.scrollTop - 8;
  return d.scrollTop;
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const report = { at: new Date().toISOString(), shots: [], checks: [] };
const CASES = ['S01', 'S15', 'S29'];

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });

  for (const id of CASES) {
    // ── 改后 ──
    await openCase(p, id);
    const afterH = await p.eval(() => document.getElementById('detail').scrollHeight);
    await p.eval(SCROLL_TO, '#d-body .field-long, #d-body .fields');
    await sleep(140);
    let file = join(SHOTS, `${vp.k}-${id}-after.png`);
    await p.screenshot({ path: file, format: 'png' });
    report.shots.push({ vp: vp.k, id, state: 'after', file, scrollH: afterH });

    // ── 改前（逆向还原 + 断言）──
    const beforeH = await p.eval(REVERT);
    await sleep(140);
    await p.eval(SCROLL_TO, '#d-body .fields');
    await sleep(120);
    file = join(SHOTS, `${vp.k}-${id}-before.png`);
    await p.screenshot({ path: file, format: 'png' });
    const baseRow = BASE.base[vp.k].find((r) => r.id === id);
    const ok = beforeH === baseRow.scrollH;
    report.checks.push({ vp: vp.k, id, afterH, revertedH: beforeH, baselineH: baseRow.scrollH, match: ok });
    report.shots.push({ vp: vp.k, id, state: 'before', file, scrollH: beforeH });
    console.log(`[${vp.k}] ${id} 改后=${afterH} 还原=${beforeH} 基线=${baseRow.scrollH} ${ok ? '✓ 一致' : '✗ 不一致'}`);
  }

  // 面板顶部那一屏（S01），折叠条第一次出现在视口里的样子
  for (const st of ['after', 'before']) {
    await openCase(p, 'S01');
    if (st === 'before') await p.eval(REVERT);
    await sleep(160);
    const file = join(SHOTS, `${vp.k}-S01-top-${st}.png`);
    await p.screenshot({ path: file, format: 'png' });
    report.shots.push({ vp: vp.k, id: 'S01-top', state: st, file });
  }
  await p.close();
}

writeFileSync(join(HERE, 'p5-shots.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log('\nshots: ' + report.shots.length);
console.log(report.checks.every((c) => c.match) ? 'revert(before) 与基线逐案一致 ✓' : '有不一致，见 p5-shots.json');
