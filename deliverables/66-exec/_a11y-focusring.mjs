/* 焦点可见性自检：焦点移到 .detail-head 之后，屏幕上的使用者看得到任何变化吗？
 *
 * 为什么值得单独一测：缺陷 2 的修法是"把焦点移进面板"，但如果移过去**没有任何视觉指示**，
 * 那么对"看得见但用键盘"的用户来说，修与不修在观感上没有区别 —— 只有屏读器用户受益。
 * 这不是可选项：WCAG 2.4.7 Focus Visible 的精神是"焦点在哪必须看得见"。
 * 而 Chrome 的 :focus-visible 启发式是"最近一次交互是键盘操作才画环"，
 * 所以这里分别量 键盘打开 / 鼠标打开 两种情形。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '..', '..', 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const outlineOf = () => {
  const a = document.activeElement;
  const cs = getComputedStyle(a);
  return {
    activeTag: a.tagName.toLowerCase(),
    activeCls: (a.className || '').toString().trim(),
    matchesFocusVisible: a.matches(':focus-visible'),
    outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset,
    boxShadow: cs.boxShadow,
    hasVisibleOutline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
  };
};

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 2, mobile: false });
const out = {};

/* A. 键盘路径 */
await p.goto(PAGE, { settleMs: 1600 });
await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); r.focus(); });
await sleep(200);
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await sleep(500);
out.byKeyboard = await p.eval(outlineOf);

/* B. 鼠标路径 */
await p.goto(PAGE, { settleMs: 1600 });
const box = await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); const q = r.getBoundingClientRect(); return { x: Math.round(q.left + 60), y: Math.round(q.top + 30) }; });
await sleep(200);
await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await sleep(500);
out.byMouse = await p.eval(outlineOf);

/* C. 对照：面板里按一次 Tab（落到「收起」按钮）时有没有环 —— 这是已知有环的参照物 */
await p.eval(() => { const h = document.querySelector('.detail-head'); if (h) h.focus(); });
await sleep(120);
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
await sleep(300);
out.nextTabAfterHead = await p.eval(outlineOf);

console.log(JSON.stringify(out, null, 1));
await p.close();
await b.close();
