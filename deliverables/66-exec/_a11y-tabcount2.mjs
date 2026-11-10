/* 把"打开一个案之后还得按几次 Tab"量对。
 *
 * 上一版 _a11y-tabcalib 的 C 口径写错了：它先把 detail.hidden 置 true 再从行卡起按 Tab ——
 * 面板是隐藏的，焦点当然永远进不去，于是数到 240（循环上限）。那是探针的错，不是页面的。
 *
 * 正确的问题有三个，各自答案不同，必须分开说：
 *   ① 审计的「87 次」= 纯 DOM 顺序下标（m7-tabindex.mjs 的算法）。
 *      已核实：95 个可聚焦元素，#detail 里第一个排在 87。
 *   ② 从页首第一个可聚焦元素真按 Tab：86 次（与 ①的一致性 = 口径对得上）。
 *   ③ **修好之后**打开一个案，焦点已经在面板里 —— 这就是"0 次"。
 * 修之前是"③ 不成立，用户要么从页首数 86 次、要么从行卡数很多次"。
 * 这一版把 ③ 的改前/改后都量出来：改前焦点停在行卡上，从行卡继续按 Tab 要几次才进面板。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGES = {
  '改前': 'file:///' + join(HERE, '_before-clone', 'index.html').replace(/\\/g, '/'),
  '改后': 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/'),
};
const TAB = async (p) => {
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await sleep(25);
};

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [tag, url] of Object.entries(PAGES)) {
  for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }, { k: '390', w: 390, h: 844, m: true }]) {
    const p = await b.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
    await p.goto(url, { settleMs: 1700 });
    /* 用键盘打开 S01，然后看焦点在哪 */
    await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); r.focus(); });
    await sleep(200);
    await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(500);

    const before = await p.eval(() => ({
      activeTag: document.activeElement.tagName.toLowerCase(),
      activeCls: (document.activeElement.className || '').toString().trim(),
      inDetail: document.getElementById('detail').contains(document.activeElement),
      detailOpen: !document.getElementById('detail').hidden,
    }));

    /* 从当前焦点继续按 Tab，数到进面板 */
    let n = 0;
    for (let i = 0; i < 260; i++) {
      await TAB(p); n++;
      if (await p.eval(() => document.getElementById('detail').contains(document.activeElement))) break;
    }
    out[tag + '_' + vp.k] = { focusAfterOpen: before, tabCountFromThereIntoPanel: n };
    await p.close();
  }
}
await b.close();
console.log(JSON.stringify(out, null, 1));
