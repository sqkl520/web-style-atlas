/* 核实一个数字：审计说"打开详情后要按 87 次 Tab"，我实测从行卡起是 30 次。
 * 差在哪？两种口径各量一遍，把口径差写成可复核的数字，而不是猜。
 *
 *   口径 A（审计 m7-tabindex.mjs 的做法，纯 DOM 顺序）：
 *     把所有可聚焦元素按 DOM 顺序排成一列，取 #detail 内第一个元素的下标 + 1。
 *   口径 B（真键盘）：
 *     把焦点放到页首第一个可聚焦元素，真按 Tab，数到第一次踏进 #detail。
 *   口径 C（真键盘，行卡起点）：
 *     把焦点放到 S01 行卡（用户点开一行后焦点就在这里），真按 Tab 数到进 #detail。
 * A 与 B 应该接近（都从页首起），C 才是"打开一个案之后"的真实代价。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '..', '..', 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const TAB = async (p) => {
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await sleep(25);
};

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }, { k: '390', w: 390, h: 844, m: true }]) {
  const p = await b.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1700 });
  /* 打开 S01：焦点落在 detail-head（改后行为） */
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); r.focus(); });
  await sleep(150);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(500);

  /* 口径 A：纯 DOM 顺序下标（复刻审计 m7 的算法） */
  out[vp.k] = { A: await p.eval(() => {
    const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const all = Array.from(document.querySelectorAll(sel)).filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const p2 = el.closest('details:not([open])');
      if (p2 && !p2.querySelector(':scope > summary')?.contains(el)) return false;
      const bb = el.getBoundingClientRect();
      return bb.width > 0 && bb.height > 0;
    });
    const d = document.querySelector('#detail');
    const idx = all.findIndex((el) => d.contains(el));
    return { totalFocusables: all.length, firstInsideDetailIndex: idx + 1, beforeDetail: idx };
  }) };

  /* 口径 B：从页首第一个可聚焦元素真按 Tab */
  await p.eval(() => {
    const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const first = Array.from(document.querySelectorAll(sel)).find((el) => el.getBoundingClientRect().height > 0);
    if (first) first.focus();
  });
  await sleep(150);
  let nB = 0;
  for (let i = 0; i < 240; i++) {
    await TAB(p); nB++;
    if (await p.eval(() => document.getElementById('detail').contains(document.activeElement))) break;
  }
  out[vp.k].B = { tabCountFromFirstFocusable: nB };

  /* 口径 C：从行卡起点（用户点开某案后焦点实际所在处） */
  await p.eval(() => {
    const d = document.getElementById('detail'); if (d) d.hidden = true;
    document.body.classList.remove('detail-open');
    const r = document.querySelector('.row[data-id="S25"]'); r.scrollIntoView({ block: 'center' }); r.focus();
  });
  await sleep(200);
  let nC = 0;
  for (let i = 0; i < 240; i++) {
    await TAB(p); nC++;
    if (await p.eval(() => { const d = document.getElementById('detail'); return !d.hidden && d.contains(document.activeElement); })) break;
  }
  out[vp.k].C = { tabCountFromLastRowFocus: nC, note: 'S25 是倒数第 6 行，离 DOM 末尾最近的起点' };

  /* 口径 C'：从第一行 S01 起（最坏情况是最后一行，这里给两端） */
  await p.eval(() => {
    const d = document.getElementById('detail'); if (d) d.hidden = true;
    document.body.classList.remove('detail-open');
    const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); r.focus();
  });
  await sleep(200);
  let nC1 = 0;
  for (let i = 0; i < 240; i++) {
    await TAB(p); nC1++;
    if (await p.eval(() => { const d = document.getElementById('detail'); return !d.hidden && d.contains(document.activeElement); })) break;
  }
  out[vp.k].C_first = { tabCountFromS01: nC1 };
  await p.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
