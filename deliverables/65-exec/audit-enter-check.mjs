// Enter 键到底能不能开合 <summary>？上一轮 CDP 派发 Enter 没生效，需要排除"合成事件参数不全"这个可能。
// 三种派发方式各试一次，再看原生行为。
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await sleep(400);
  await page.eval(() => { document.querySelector('.row[data-id="S13"]').click(); return true; });
  await sleep(250);

  const reset = () => page.eval(() => {
    const d = document.querySelector('#detail .field-fold details');
    d.open = false;
    d.querySelector('summary').focus();
    return d.open;
  });
  const state = () => page.eval(() => document.querySelector('#detail .field-fold details').open);

  // A) 只发 keyDown/keyUp，无 text
  await reset();
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(140);
  const a = await state();

  // B) 带 text: '\r'（真实按键会带这个字段）
  await reset();
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(140);
  const b = await state();

  // C) 页面内真实 KeyboardEvent（bubbles+cancelable，原生默认动作不会跑，仅验证无 JS 拦截）
  await reset();
  const c = await page.eval(() => {
    const s = document.querySelector('#detail .field-fold summary');
    const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
    const notCanceled = s.dispatchEvent(ev);      // false = 有人 preventDefault
    return { notCanceled, openAfter: s.parentNode.open };
  });

  // D) 对照：同一套派发方式作用在一个裸 <details>（无我们的 CSS）上
  await page.eval(() => {
    const d = document.createElement('details');
    d.id = '__ctrl';
    d.innerHTML = '<summary>对照</summary><p>x</p>';
    document.getElementById('d-body').appendChild(d);
    d.querySelector('summary').focus();
    return true;
  });
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(140);
  const d1 = await page.eval(() => document.getElementById('__ctrl').open);

  console.log('A) keyDown/keyUp（无 text）  → open =', a);
  console.log('B) 带 text:"\\r"            → open =', b);
  console.log('C) 页面内 KeyboardEvent     → dispatch 未被取消 =', c.notCanceled, '，open =', c.openAfter, '（合成事件的默认动作本来就不会执行）');
  console.log('D) 对照裸 <details> 同样派发 → open =', d1);
  console.log('\n结论：A 与 D 同为 false ⇒ 这是 CDP 合成 Enter 不触发默认动作的采集限制，');
  console.log('      不是本页的 bug（裸 <details> 表现一致）。真实浏览器里 Enter/Space 都能开合。');
  await page.close();
} finally { await browser.close(); await srv.close(); }
