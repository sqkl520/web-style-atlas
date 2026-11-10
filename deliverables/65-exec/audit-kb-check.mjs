// 收尾核查：键盘可操作、prefers-reduced-motion、控制台报错、以及 768 档不炸。
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
try {
  for (const vp of [
    { label: 'desktop', w: 1440, h: 900 },
    { label: 'tablet', w: 768, h: 1024 },
    { label: 'mobile', w: 390, h: 844, m: true },
  ]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m, reducedMotion: true });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await sleep(400);
    await page.eval(() => { document.querySelector('.row[data-id="S13"]').click(); return true; });
    await sleep(250);

    // 键盘：Tab 到 summary 后按 Enter / Space 应当能开合
    const kb = await page.eval(() => {
      const s = document.querySelector('#detail .field-fold summary');
      s.focus();
      const focused = document.activeElement === s;
      return { focused, tabbable: s.tabIndex, openBefore: s.parentNode.open };
    });
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await sleep(150);
    const afterEnter = await page.eval(() => document.querySelector('#detail .field-fold details').open);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await sleep(150);
    const afterSpace = await page.eval(() => document.querySelector('#detail .field-fold details').open);

    const info = await page.eval(() => {
      const d = document.getElementById('detail');
      const f = document.querySelector('#detail .field-fold');
      const s = f.querySelector('summary');
      const cs = getComputedStyle(s);
      const body = getComputedStyle(f.querySelector('.fold-body'));
      return {
        overflowX: d.scrollWidth - d.clientWidth,
        docOverflowX: document.documentElement.scrollWidth - innerWidth,
        summaryCursor: cs.cursor,
        markerDisplay: cs.display,
        bodyFont: body.fontSize,
        bodyLine: body.lineHeight,
        bodyColor: body.color,
        rowOverflowX: [...document.querySelectorAll('.row')].reduce((a, r) => Math.max(a, r.scrollWidth - r.clientWidth), 0),
        famClamped: [...document.querySelectorAll('.row-family')].every((x) => getComputedStyle(x).webkitLineClamp === '2'),
      };
    });
    const errs = page.consoleErrors;
    console.log(`\n=== ${vp.label} ${vp.w}×${vp.h} (reducedMotion) ===`);
    console.log('  summary 可聚焦:', kb.focused, ' tabIndex:', kb.tabbable, ' 初始 open:', kb.openBefore);
    console.log('  Enter 之后 open:', afterEnter, ' Space 之后 open:', afterSpace);
    console.log('  面板横向溢出:', info.overflowX, ' 文档横向溢出:', info.docOverflowX, ' 行卡横向溢出:', info.rowOverflowX);
    console.log('  summary cursor:', info.summaryCursor, ' display:', info.markerDisplay);
    console.log('  正文 字号/行高/色:', info.bodyFont, info.bodyLine, info.bodyColor);
    console.log('  30 行 family 都 clamp=2:', info.famClamped);
    console.log('  控制台异常:', errs.length ? errs : '（无）');
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
