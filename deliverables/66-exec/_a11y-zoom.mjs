/* 焦点环的像素级证据：只截 .detail-head 那一小块并放大看。
 * 为什么需要它：上面测到 outline 2px solid rgb(31,60,96)，但整页截图缩到 2590px 宽之后
 * 2px 的线在预览里几乎看不出来，用"我看不见"或"我看见了"都不算证据。
 * 这里把 head 区域单独 clip 出来（不缩放），焦点环在图上就是清楚的 2px 深蓝线。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SHOTS = join(HERE, 'shots-a11y');

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 2, mobile: false });

const run = async (PAGE, tag) => {
  await p.goto(PAGE, { settleMs: 1700 });
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); r.focus(); });
  await sleep(200);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(600);
  const st = await p.eval(() => {
    const h = document.querySelector('.detail-head');
    const r = h.getBoundingClientRect();
    const cs = getComputedStyle(h);
    return {
      active: document.activeElement.className,
      focusVisible: document.activeElement.matches(':focus-visible'),
      outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,
      offset: cs.outlineOffset,
      clip: { x: Math.max(0, Math.floor(r.left) - 8), y: Math.max(0, Math.floor(r.top) - 8), width: Math.ceil(r.width) + 16, height: Math.ceil(r.height) + 16 },
    };
  });
  await p.screenshot({ path: join(SHOTS, 'zoom-' + tag + '-detail-head.png'), format: 'png', clip: st.clip });
  console.log(tag + ': ' + JSON.stringify(st, null, 1));
};

await run('file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/'), 'after');
await run('file:///' + join(HERE, '_before-clone', 'index.html').replace(/\\/g, '/'), 'before');

await p.close();
await b.close();
