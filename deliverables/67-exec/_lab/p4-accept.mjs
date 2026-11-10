// p4-accept.mjs — 改后验收实测（2026-10-28）。只读页面，不注入任何样式/DOM。
// 覆盖任务书 10 条验收里所有能用机器读的部分。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, IDS, COLLECT, openCase, sleep, summary } from './lib.mjs';

const EXTRA = () => {
  const d = document.getElementById('detail');
  const dTop = d.getBoundingClientRect().top;
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: +(r.top - dTop).toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1) }; };
  const sums = [...document.querySelectorAll('#d-body summary')];
  const longSums = [...document.querySelectorAll('#d-body .field-long > details > summary')];
  const lines = (el) => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const tops = {}; for (const r of rg.getClientRects()) if (r.height > 1) tops[Math.round(r.top)] = 1;
    return Object.keys(tops).length;
  };
  const dd = document.querySelector('#d-body .field dd');
  const longBody = document.querySelector('#d-body .field-long .fold-body');
  return {
    // 每个 summary 的几何 + 开放态
    summaries: sums.map((s) => ({ text: s.textContent.replace(/\s+/g, ' ').trim().slice(0, 46), ...box(s), open: s.parentElement.open })),
    longSummaries: longSums.map((s) => ({
      text: s.textContent.replace(/\s+/g, ' ').trim(),
      ...box(s), open: s.parentElement.open, lines: lines(s),
    })),
    anyOpen: sums.filter((s) => s.parentElement.open).length,
    // 可读性三个变量
    type: dd ? {
      fs: getComputedStyle(dd).fontSize, lh: getComputedStyle(dd).lineHeight,
      ratio: +(parseFloat(getComputedStyle(dd).lineHeight) / parseFloat(getComputedStyle(dd).fontSize)).toFixed(3),
      w: +dd.getBoundingClientRect().width.toFixed(1),
    } : null,
    longType: longBody ? {
      fs: getComputedStyle(longBody).fontSize, lh: getComputedStyle(longBody).lineHeight,
      ratio: +(parseFloat(getComputedStyle(longBody).lineHeight) / parseFloat(getComputedStyle(longBody).fontSize)).toFixed(3),
      w: +longBody.getBoundingClientRect().width.toFixed(1),
    } : null,
    // 折叠块 body 非空 + 字数（"一个字不删"的机器判据）
    foldBodies: [...document.querySelectorAll('#d-body details')].map((det) => ({
      summary: det.querySelector('summary') ? det.querySelector('summary').textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null,
      bodyChars: det.querySelector('.fold-body') ? det.querySelector('.fold-body').textContent.replace(/\s/g, '').length : 0,
    })),
    fieldCount: document.querySelectorAll('#d-body .fields > .field').length,
    hOv: d.scrollWidth - d.clientWidth,
    docHOv: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { at: new Date().toISOString(), vp: {} };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  const rows = [];
  let sample = null, sampleId = null;
  for (const id of IDS) {
    await openCase(p, id);
    const m = await p.eval(COLLECT);
    const x = await p.eval(EXTRA);
    rows.push({ ...m, id, extra: x });
    if (id === 'S01') { sample = x; sampleId = id; }
  }
  out.vp[vp.k] = rows;

  const sh = rows.map((r) => r.scrollH).sort((a, b) => a - b);
  const avg = Math.round(sh.reduce((a, b) => a + b, 0) / 30);
  const firstTops = rows.map((r) => r.firstFieldTop);
  console.log(`\n[${vp.k}] scrollH ${sh[0]}–${sh[sh.length - 1]} (avg ${avg}, med ${sh[15]})`);
  console.log(`  屏数 ${(sh[0] / rows[0].vh).toFixed(2)}–${(sh[sh.length - 1] / rows[0].vh).toFixed(2)}`);
  console.log(`  ≤3000: ${sh.filter((x) => x <= 3000).length}/30   ≤3800: ${sh.filter((x) => x <= 3800).length}/30`);
  console.log(`  首字段 top ${Math.min(...firstTops)}–${Math.max(...firstTops)}  完整字段 avg ${(rows.reduce((a, b) => a + b.fieldsFully, 0) / 30).toFixed(1)}`);
  console.log(`  字段数 ${[...new Set(rows.map((r) => r.extra.fieldCount))].join(',')}  默认展开的折叠块 ${[...new Set(rows.map((r) => r.extra.anyOpen))].join(',')}  details/案 ${[...new Set(rows.map((r) => r.detailsCount))].join(',')}`);
  console.log(`  横向溢出 详情 ${Math.max(...rows.map((r) => r.extra.hOv))} / 文档 ${Math.max(...rows.map((r) => r.extra.docHOv))}`);
  const t = rows[0].extra.type;
  console.log(`  正文 ${t.fs} / ${t.lh} (${t.ratio}) 宽 ${t.w}px；长字段正文 ${rows[0].extra.longType.fs} / ${rows[0].extra.longType.lh} (${rows[0].extra.longType.ratio})`);
  const longH = rows.flatMap((r) => r.extra.longSummaries.map((s) => s.h));
  console.log(`  5 条字段折叠条 summary 高 ${Math.min(...longH)}–${Math.max(...longH)}（含审查点那条）`);
  const allSums = rows.flatMap((r) => r.extra.summaries.map((s) => s.h));
  console.log(`  全部 summary 高 ${Math.min(...allSums)}–${Math.max(...allSums)}  <24px 的个数 ${rows.flatMap((r) => r.extra.summaries).filter((s) => s.h < 24).length}`);
  console.log(`  S01 longSummaries: ${JSON.stringify(sample.longSummaries.map((s) => ({ t: s.text, h: s.h, lines: s.lines })))}`);
  const minBody = Math.min(...rows.flatMap((r) => r.extra.foldBodies).map((b) => b.bodyChars));
  console.log(`  所有折叠块 body 字数 min=${minBody}（>0 即"点开有东西"）`);
  await p.close();
}

// 键盘可达：真 Input.dispatchKeyEvent 把焦点放到第一条长字段 summary 上，按 Enter 看它开不开
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.goto(PAGE, { settleMs: 1600 });
  await openCase(p, 'S01');
  const before = await p.eval(() => {
    const s = document.querySelector('#d-body .field-long > details > summary');
    s.focus();
    return { focused: document.activeElement === s, isSummary: document.activeElement.tagName.toLowerCase() === 'summary', open: s.parentElement.open, h: +s.getBoundingClientRect().height.toFixed(1) };
  });
  for (const type of ['rawKeyDown', 'char', 'keyUp']) {
    await p.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: type === 'char' ? '\r' : undefined });
  }
  await sleep(220);
  const afterEnter = await p.eval(() => {
    const s = document.querySelector('#d-body .field-long > details > summary');
    return { open: s.parentElement.open, activeIsSummary: document.activeElement === s, stillInDetail: document.getElementById('detail').contains(document.activeElement) };
  });
  for (const type of ['rawKeyDown', 'char', 'keyUp']) {
    await p.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: type === 'char' ? '\r' : undefined });
  }
  await sleep(220);
  const afterEnter2 = await p.eval(() => {
    const s = document.querySelector('#d-body .field-long > details > summary');
    return { open: s.parentElement.open };
  });
  // Space 也测一次（原生 summary 支持 Enter/Space 两种）
  for (const type of ['rawKeyDown', 'char', 'keyUp']) {
    await p.send('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, text: type === 'char' ? ' ' : undefined });
  }
  await sleep(220);
  const afterSpace = await p.eval(() => {
    const s = document.querySelector('#d-body .field-long > details > summary');
    return { open: s.parentElement.open, activeIsSummary: document.activeElement === s };
  });
  out.keyboard = { before, afterEnter, afterEnter2, afterSpace };
  console.log(`\n[键盘] 聚焦=${before.focused} open=${before.open} → Enter → open=${afterEnter.open} → Enter → open=${afterEnter2.open} → Space → open=${afterSpace.open}`);
  // Esc 在 summary 上不该关面板（a11y Agent 2026-10-27 修的那条，回归）
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(260);
  out.esc = await p.eval(() => ({
    detailOpen: !document.getElementById('detail').hidden,
    active: document.activeElement && document.activeElement.className,
    inDetail: document.getElementById('detail').contains(document.activeElement),
  }));
  console.log(`[Esc] 面板仍开=${out.esc.detailOpen} 焦点=${out.esc.active}`);
  await p.close();
}

writeFileSync(join(HERE, 'p4-accept.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten p4-accept.json');
