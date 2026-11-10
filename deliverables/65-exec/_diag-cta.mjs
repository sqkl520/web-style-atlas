/* 诊断 2：为什么 .prompt-cta 在 390 档有时量到 393.5px、有时 112/73px。
   怀疑点：(a) 字体是否已就绪（CJK 回退字重不同，换行数不同）；
          (b) 页面是否还在入场动画里（.detail.is-in 的 rise 动画把 transform/opacity 带进来，
              getBoundingClientRect 在动画期间读到的是变换后的框）；
          (c) 弹层宽度是否真的 390（mobile 模拟下 sticky 头部 + 900px 的桌面面板宽度）。
   这个脚本在几个不同等待时长下反复量同一处，把 cta 的子元素逐个打出来。 */
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const snap = () => {
  const d = document.getElementById('detail');
  const cta = document.querySelector('#d-body .prompt-cta');
  const rr = (el) => {
    const r = el.getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  return {
    innerW: innerWidth,
    detailW: +d.getBoundingClientRect().width.toFixed(1),
    fonts: document.fonts.status,
    anim: getComputedStyle(d).animationName,
    cta: cta ? rr(cta) : null,
    ctaChildren: cta ? [...cta.children].map((c) => ({ tag: c.tagName, cls: c.className, text: (c.textContent || '').slice(0, 18), ...rr(c) })) : null,
    ctaFlexWrap: cta ? getComputedStyle(cta).flexWrap : null,
    firstField: (() => { const f = document.querySelector('#d-body .field'); if (!f) return null; const r = f.getBoundingClientRect(); return +(r.top - d.getBoundingClientRect().top + d.scrollTop).toFixed(1); })(),
    contentH: d.scrollHeight,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 600 });
  for (const wait of [0, 100, 300, 800, 1500, 3000]) {
    await page.eval(() => { location.hash = '#S15'; });
    await sleep(wait);
    const m = await page.eval(snap);
    console.log(`\n--- wait ${wait}ms after hash ---`);
    console.log(JSON.stringify(m, null, 1));
  }
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(400);
  console.log('\n--- after fonts.ready ---');
  console.log(JSON.stringify(await page.eval(snap), null, 1));
  await page.close();
} finally { await browser.close(); await srv.close(); }
