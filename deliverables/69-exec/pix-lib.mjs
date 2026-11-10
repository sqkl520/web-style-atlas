// 像素级验证库：同一浏览器、同一服务、同一冻结方式下，量一页的
//   ① 整页 PNG 的 sha256（逐字节）
//   ② 每个元素包围盒 + 关键排版属性的 sha256（比截图更稳的"几何全量对比"）
//   ③ 5 个滚动位置的视口 PNG sha256
// 关键：所有变体都跑在这个函数里，冻结/等待/滚动脚本一模一样，否则比较无效。

import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createHash } from 'node:crypto';

export const sha = (b) => createHash('sha256').update(b).digest('hex');

// 元素几何签名：包含 rect（0.01px 四舍五入）、字号、字体族、字重、字距、行高、颜色、可见性
export const BOX_SIG = `(() => {
  const rows = [];
  const els = [...document.querySelectorAll('body *')];
  for (const el of els) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // 只记"有几何"的元素；display:none 的元素也该记（-0/-0/0/0），否则"隐藏态变了"看不出来
    rows.push([
      tag,
      (el.className && typeof el.className === 'string' ? el.className : ''),
      [r.x, r.y, r.width, r.height].map((v) => (Math.round(v * 100) / 100).toFixed(2)).join(','),
      cs.fontSize, cs.fontFamily, cs.fontWeight, cs.letterSpacing, cs.lineHeight,
      cs.color, cs.backgroundColor, cs.display, cs.visibility, cs.opacity,
      cs.marginTop + '|' + cs.marginLeft + '|' + cs.paddingTop + '|' + cs.paddingLeft,
      cs.borderTopWidth + '|' + cs.borderLeftWidth + '|' + cs.borderTopColor,
      cs.whiteSpace, cs.textAlign, cs.transform, cs.overflow,
    ].join(';'));
  }
  return { n: rows.length, sig: rows.join('\\n') };
})()`;

export async function measureUrl(browser, url, { width, height, mobile = false, scrollShots = false }) {
  const page = await browser.newPage({ width, height, dsf: 1, mobile });
  await page.setViewport({ width, height, dsf: 1, mobile });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1500); // 坑 3：fonts.ready 之后还要 ~900ms 布局才稳，留 1.5s
  // 懒加载图在整页截图里必须已解码，否则两次截图的时机差会变字节
  await page.eval(`(() => {
    for (const i of document.images) { i.loading = 'eager'; i.decoding = 'sync'; }
    return Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
  })()`).catch(() => {});
  await sleep(900);

  /* 预热滚动：**决定性的一步**。不这么做，测量不可复现。
   *
   * 实测噪声下限（m03，同 URL ×3）：S07 与 S21 全部一致，但 S13 的整页图与
   * scrollY 2700 的视口图在 3 次里漂了 1 次。原因不是截图本身，是页面状态：
   *   · S13 的条款靠 IntersectionObserver 逐条加 .is-pressed（= 加 box-shadow），
   *     7 条里哪几条在截图那一刻已经压出，取决于 observer 回调的投递时机；
   *   · box-shadow 不进 getBoundingClientRect ⇒ 几何指纹一致、像素指纹不一致。
   *   · S13 还有 4 张 loading=lazy 的图，未滚动到的位置不保证已解码。
   * 所以：先匀速滚到底再滚回顶，把"该触发的都触发、该解码的都解码"这件事
   * 在 before/after 两侧用同一条路径做完，之后的状态才是可比的。
   */
  const pre = await page.eval(`(async () => {
    const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H);
    for (let y = 0; y <= max; y += Math.round(H * 0.5)) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo({ top: max, behavior: 'instant' }); await new Promise(r => setTimeout(r, 260));
    for (let y = max; y >= 0; y -= Math.round(H * 0.5)) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
    return { max, pressed: document.querySelectorAll('.is-pressed').length, revealed: document.querySelectorAll('.is-armed,.is-visible').length };
  })()`).catch((e) => ({ err: String(e) }));
  await sleep(700);

  // 冻结动效：before/after 用同一套，保证可比
  await page.eval(`(() => {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
    document.head.appendChild(s);
    if (document.getAnimations) for (const a of document.getAnimations()) { try { a.finish(); } catch {} }
    return true;
  })()`).catch(() => {});
  await sleep(600);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})').catch(() => {});
  await sleep(400);

  /* 静默判定：等到"页面自己不再改东西"再量。
   *
   * 为什么必须有这一步（m03 实测）：加了预热滚动后 S13 稳了，但 S07 的
   * boxesSig 在 4 次里仍漂了 1 次（b3560e78 / cdce599e / …）。漂的是
   * .ghost text 的 opacity —— `deepen()` 挂在 scroll 上、用 rAF 节流，
   * 滚回 0 之后它还要再跑一帧才把 --ghost-o 定到最终值。固定 sleep 是在赌
   * 那一帧已经跑完；赌输一次，整组对比就作废。
   * 改成：轮询一个"页面当前状态向量"，连续两次读到相同值才认为收敛。
   */
  const quiesce = await page.eval(`(async () => {
    const snap = () => [...document.querySelectorAll('.ghost text')].map((t) => getComputedStyle(t).opacity).join(',')
      + '|' + (document.body.getAttribute('data-ink') || '')
      + '|' + (document.querySelector('.pages') ? getComputedStyle(document.querySelector('.pages')).getPropertyValue('--ghost-o') : '');
    let last = null, same = 0, tries = 0;
    while (tries++ < 40) {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));
      const now = snap();
      if (now === last) { if (++same >= 2) return { ok: true, tries, value: now.slice(0, 40) }; }
      else { same = 0; last = now; }
    }
    return { ok: false, tries, value: String(last).slice(0, 40) };
  })()`).catch((e) => ({ ok: false, err: String(e) }));
  if (!quiesce.ok) console.log('    ⚠ 静默判定未收敛：' + JSON.stringify(quiesce));

  const state = await page.eval(`(() => ({
    docH: document.documentElement.scrollHeight,
    images: [...document.images].map(i => i.complete + ':' + i.naturalWidth).join(','),
    fonts: [...document.fonts].map(f => f.family + ':' + f.status).sort().join(','),
    scrollY,
    pressed: document.querySelectorAll('.is-pressed').length,
  }))()`);

  const boxes = await page.eval(BOX_SIG);
  const full = await page.screenshot({ format: 'png', fullPage: true });

  let scrolls = null;
  if (scrollShots) {
    scrolls = {};
    for (const y of [0, 900, 1800, 2700, 3600]) {
      await page.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
      await sleep(420);
      scrolls[y] = sha(Buffer.from(await page.screenshot({ format: 'png' }), 'base64'));
    }
    await page.eval('window.scrollTo({top:0,behavior:"instant"})');
    await sleep(200);
  }
  await page.close();
  return {
    docH: state.docH, images: state.images, fonts: state.fonts, pressed: state.pressed,
    boxesN: boxes.n, boxesSig: sha(Buffer.from(boxes.sig, 'utf8')),
    fullSha: sha(Buffer.from(full, 'base64')), fullBytes: Buffer.from(full, 'base64').length,
    scrolls, pre,
  };
}

export { Browser, sleep };
