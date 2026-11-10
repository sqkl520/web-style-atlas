/* 探针自检：确认上一版 summaryToggle 的 open=false 是**探针缺陷**，不是页面缺陷。
 *
 * 起因：_a11y-regress.mjs 里对焦点的 summary 按 Enter，details 没有开合。
 * 但 app.js 里没有任何对 Enter 的 preventDefault（detail 上的监听只认 Escape 就 return），
 * 所以怀疑是 CDP 的 Enter 少了 text 字段 —— 那会让浏览器只发一个"虚拟键"而**不合成字符**，
 * 原生控件（<summary> 的默认激活行为走的是 click 合成）就不会被触发。
 * 这里把 text:'\r' 补上再量一次，同时确认 Space 能开合。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '..', '..', 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

/* 三种按法对照：无 text / 有 text / Space */
async function key(page, variant) {
  const base = { windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  if (variant === 'enter-text') {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', ...base });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', ...base });
  } else if (variant === 'enter-plain') {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', ...base });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', ...base });
  } else {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
  }
  await sleep(300);
}

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 2, mobile: false });
const out = {};

for (const variant of ['enter-plain', 'enter-text', 'space']) {
  await p.goto(PAGE, { settleMs: 1500 });
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
  await sleep(400);
  await p.eval(() => { document.querySelector('#detail summary').focus(); });
  await sleep(150);
  const before = await p.eval(() => document.querySelector('#detail summary').parentElement.open);
  await key(p, variant);
  const afterFirst = await p.eval(() => ({ open: document.querySelector('#detail summary').parentElement.open, detailOpen: !document.getElementById('detail').hidden }));
  await key(p, variant);
  const afterSecond = await p.eval(() => ({ open: document.querySelector('#detail summary').parentElement.open, detailOpen: !document.getElementById('detail').hidden }));
  out[variant] = { before, afterFirst, afterSecond };
  console.log(variant + ': ' + JSON.stringify(out[variant]));
}

/* 另外单独证明：Esc 之后 Space 仍能开合（Esc 的 stopPropagation 不该粘住后续按键） */
await p.goto(PAGE, { settleMs: 1500 });
await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
await sleep(400);
await p.eval(() => { document.querySelector('#detail summary').focus(); });
await sleep(120);
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await sleep(350);
const afterEsc = await p.eval(() => ({ detailOpen: !document.getElementById('detail').hidden, active: document.activeElement.className }));
/* Esc 之后焦点在 detail-head，重新聚焦 summary 再按 Space */
await p.eval(() => { document.querySelector('#detail summary').focus(); });
await sleep(120);
await key(p, 'space');
out.escThenSpace = { afterEsc, summaryOpen: await p.eval(() => ({ open: document.querySelector('#detail summary').parentElement.open, detailOpen: !document.getElementById('detail').hidden })) };
console.log('escThenSpace: ' + JSON.stringify(out.escThenSpace));

await p.close();
await b.close();
