/* 验收 11：1440×900 与 390×844 的截图（改前/改后对照）。
 *
 * 上一版探针里的 detail-focus 截图和 detail 截图字节完全相同 —— 因为两次都在
 * 同一个滚动位置、焦点环也不是截图能自动带上的东西，那两张等于只有一张。
 * 这里拆开：每张图都有明确的"要看什么"，并把这个意图写进文件名。
 *
 * 用法：node deliverables/66-exec/_a11y-shots.mjs --tag after
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-a11y');
const tagArg = process.argv.indexOf('--tag');
const TAG = tagArg > 0 ? process.argv[tagArg + 1] : 'after';
mkdirSync(SHOTS, { recursive: true });

const b = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }, { k: '390', w: 390, h: 844, m: true }]) {
  const p = await b.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });

  /* 1) 列表首屏：看页头三个模板链接触控目标 / 页头高度（缺陷 4 与 5 的视觉面） */
  await p.goto(PAGE, { settleMs: 1800 });
  await p.screenshot({ path: join(SHOTS, TAG + '-' + vp.k + '-1-list-fold.jpg') });

  /* 2) 页头特写：只截 .mast，链接就在里面。列表图里页头只占上面一小条，看不清。 */
  const mast = await p.eval(() => {
    const r = document.querySelector('.mast').getBoundingClientRect();
    return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });
  await p.screenshot({ path: join(SHOTS, TAG + '-' + vp.k + '-2-mast.jpg'), clip: mast });

  /* 3) 详情：打开后焦点落在 .detail-head，焦点环应可见（缺陷 2 的视觉证据）。
     用键盘路径（聚焦行卡 + Enter）打开，让焦点环是"用户真的会看到的那一个"。 */
  await p.eval(() => {
    const r = document.querySelector('.row[data-id="S01"]');
    r.scrollIntoView({ block: 'center' });
    r.focus();
  });
  await sleep(200);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(600);
  await p.screenshot({ path: join(SHOTS, TAG + '-' + vp.k + '-3-detail-focus.jpg') });

  /* 4) 空状态（无暂存词）：#q-parked 不该出现。
     390 档它是固定底栏，出现在视口最底部 —— 整张列表图就能证明它在不在。 */
  await p.goto(PAGE, { settleMs: 1500 });
  await p.screenshot({ path: join(SHOTS, TAG + '-' + vp.k + '-4-no-parked.jpg') });

  /* 5) 有暂存词：#q-parked 必须出现（证明缺陷 1 的修复没有把该显示的一起藏掉） */
  await p.eval(() => {
    document.getElementById('q').value = '咖啡店';
    const chip = Array.from(document.querySelectorAll('.scene-chip')).find((c) => /咖啡店/.test(c.textContent));
    if (chip) chip.click();
  });
  await sleep(600);
  await p.screenshot({ path: join(SHOTS, TAG + '-' + vp.k + '-5-parked-visible.jpg') });

  await p.close();
}
await b.close();
console.log('截图已写入 ' + SHOTS);
