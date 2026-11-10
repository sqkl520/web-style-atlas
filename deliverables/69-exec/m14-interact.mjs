/* 交互之后的标记是否仍然成立？
 *
 * 这是「包 code」这个改法最容易被忽略的失效面：页面自己的脚本会重写 textContent。
 *   · S13 #azimuthOut：flip() 写 `azimuthOut.textContent = to + '°'`；
 *     若 id 留在 <span> 上、<code> 在内部，一次点击就会把 <code> 整个抹掉 ⇒
 *     用户点过签发之后，等宽又跑回 code 外面（闸门初始态看不出来，因为它渲染的是首屏静态页面）。
 *   · S21 的 .lockbar 灯效、时段切换会重建 <tbody> 内容类操作；要确认 code 不被卷走。
 *   · S21 的「号牌翻转」：`.plate[data-flip]` 的 flip() **直接写 p.textContent** ——
 *     那会把子节点（含 code）整块替换成纯文本，再 140ms 后写回 orig。
 *     这是既有行为（原本就替换全部子节点），这里要确认它不会把 code 永久丢掉。
 *
 * 判据：每个交互后，重新跑一遍 probe 的 mono 判据（等宽字符是否落在 code 外）。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });

const MONO_PROSE = `(() => {
  const cv = document.createElement('canvas').getContext('2d');
  const isMono = (ff) => {
    const first = ff.split(',')[0].replace(/["']/g, '').trim();
    cv.font = '40px ' + JSON.stringify(first);
    return Math.abs(cv.measureText('iiiiiiii').width - cv.measureText('WWWWWWWW').width) < 1;
  };
  let prose = 0, total = 0; const samples = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue; if (!t || !t.trim()) continue;
    const el = n.parentElement; if (!el) continue;
    const tag = el.tagName.toLowerCase(); if (tag === 'script' || tag === 'style') continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const chars = t.trim().length; total += chars;
    if (isMono(cs.fontFamily) && !el.closest('pre,code,kbd,samp,textarea')) {
      prose += chars; if (samples.length < 4) samples.push(t.trim().slice(0, 20));
    }
  }
  return { prose, total, samples, codes: document.querySelectorAll('code').length,
           azimuthOutParent: (() => { const a = document.getElementById('azimuthOut'); return a ? a.tagName.toLowerCase() : null; })(),
           azimuthText: (document.getElementById('azimuthOut') || {}).textContent || null };
})()`;

async function go(dir) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(srv.url(`prototypes/${dir}/index.html`), { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1600);
  return page;
}

// ── S13 ──
console.log('===== S13 交互后 mono 是否仍在 code 内 =====');
{
  const page = await go('S13-blind-debossed-dispatch');
  console.log('  初始      ', JSON.stringify(await page.eval(MONO_PROSE)));
  // 点签发（第一次会走失败面，第二次成功并 flip 到 315°）
  for (const i of [1, 2]) {
    await page.eval(`document.getElementById('issueBtn').click()`);
    await sleep(900);
    console.log(`  点签发 ×${i}`, JSON.stringify(await page.eval(MONO_PROSE)));
  }
  // 再点驳回、转呈、归档
  for (const b of ['rejectBtn', 'forwardBtn', 'archiveBtn']) {
    await page.eval(`document.getElementById('${b}').click()`);
    await sleep(500);
    console.log(`  点 ${b.padEnd(10)}`, JSON.stringify(await page.eval(MONO_PROSE)));
  }
  await page.close();
}

// ── S21 ──
console.log('\n===== S21 交互后 mono 是否仍在 code 内 =====');
{
  const page = await go('S21-interlocking-release-book');
  console.log('  初始      ', JSON.stringify(await page.eval(MONO_PROSE)));
  // 悬停每一枚锁闭条（按实际 data-lock 值迭代，不要按 1..n —— 演示条用的是 data-lock="0"）
  const locks = await page.eval('[...document.querySelectorAll(".lockbar[data-lock]")].map(e => e.getAttribute("data-lock"))');
  for (const v of locks) {
    await page.eval(`(() => { const e=document.querySelector('.lockbar[data-lock="${v}"]'); if(e) e.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true})); })()`);
    await sleep(60);
  }
  console.log(`  悬停 ${locks.length} 枚锁`, JSON.stringify(await page.eval(MONO_PROSE)));
  // 三个时段
  for (const v of ['b', 'c', 'a']) {
    await page.eval(`(() => { const r=document.querySelector('input[name="slot"][value="${v}"]'); r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await sleep(500);
    console.log(`  切时段 ${v}  `, JSON.stringify(await page.eval(MONO_PROSE)));
  }
  // 号牌翻转（textContent 整体替换）
  await page.eval(`document.querySelector('.plate[data-flip]').click()`);
  await sleep(80);
  const during = await page.eval(MONO_PROSE);
  await sleep(700);
  const after = await page.eval(MONO_PROSE);
  console.log('  翻转中    ', JSON.stringify(during));
  console.log('  翻转后    ', JSON.stringify(after));
  // 展开互斥清单（4 个隐藏的 .excl__no 会显示出来）
  await page.eval(`document.getElementById('excl-btn').click()`);
  await sleep(400);
  console.log('  展开互斥  ', JSON.stringify(await page.eval(MONO_PROSE)));
  await page.close();
}

await browser.close();
srv.server.close();
