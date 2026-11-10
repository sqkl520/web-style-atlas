/* 同进程 A/B：把「原版目录树」与「当前目录树」并排跑在同一个 Chrome 里，
 * 逐视口比较 ① 几何签名 ② 遮罩整页 PNG（逐字节）③ 5 位滚动截图。
 *
 * 为什么要同进程：m03 的噪声下限说明，跨浏览器实例的图片解码有 Δ1–7 漂移。
 * 同进程两侧仍会各自漂，但几何签名在 m04 已实测跨加载 0 处差异 —— 所以：
 *   · 几何（rect + 排版属性）→ 必须 0 差异，这是"排版没变"的硬证据；
 *   · 文字/色块像素 → 遮罩图必须逐字节相同，这是"看起来没变"的硬证据。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { sha } from './pix-lib.mjs';
import { diffPngs } from './png.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-exec/_ab';
mkdirSync(OUT, { recursive: true });

const CASES = [
  ['S07', 'S07-slate-ink-contents'],
  ['S13', 'S13-blind-debossed-dispatch'],
  ['S21', 'S21-interlocking-release-book'],
];
const VIEWPORTS = [
  { w: 1440, h: 900, name: 'desktop', mobile: false },
  { w: 768, h: 1024, name: 'tablet', mobile: false },
  { w: 390, h: 844, name: 'mobile', mobile: true },
];

// 对比用签名：**不含** fontFamily / class 列表（前者因我们故意 inherit 而值不变、
// 后者因包裹多了一层 code 而结构变了都不是"排版变了"）。含 rect 与全部影响排版的属性。
const LAYOUT_SIG = `(() => {
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    if (tag === 'CODE') continue;                 // 新增的包装层，本身没有独立排版
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push([
      [r.x, r.y, r.width, r.height].map((v) => (Math.round(v * 100) / 100).toFixed(2)).join(','),
      cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.lineHeight, cs.color,
      cs.backgroundColor, cs.display, cs.visibility, cs.opacity, cs.whiteSpace,
      cs.marginTop + ',' + cs.marginLeft + ',' + cs.marginBottom + ',' + cs.marginRight,
      cs.paddingTop + ',' + cs.paddingLeft, cs.borderTopWidth, cs.borderLeftWidth,
      cs.textAlign, cs.transform, cs.overflow, cs.writingMode,
    ].join(';'));
  }
  return rows.join('\\n');
})()`;

// 文本片段级：每个文本节点的 client rects（比元素盒子更细，能抓字宽/换行变化）
const TEXT_SIG = `(() => {
  const rg = document.createRange(); const rows = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue;
    const pe = n.parentElement; if (pe.closest('script,style')) continue;
    rg.selectNodeContents(n);
    const rects = [...rg.getClientRects()].map(r => [r.x, r.y, r.width, r.height].map(v => (Math.round(v * 100) / 100).toFixed(2)).join(','));
    rows.push(n.nodeValue.trim().slice(0, 20) + ' => ' + rects.join(' | '));
  }
  return rows.join('\\n');
})()`;

async function prep(browser, url, vp) {
  const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1200);

  /* ① 先等「载入期定时器链」跑完，再做任何滚动。
   *
   * 这一条是 S07 间歇性不稳的真因，我踩了两轮才定位到：
   * S07 的 seep() 是 setTimeout 链（46 行 × 70ms ≈ 3.2s），结束时写一句
   *   '全 46 行落墨完毕。透印层当前 ' + document.body.getAttribute('data-ink') + '%，…'
   * 也就是说**这句话把当时的 data-ink 烧进了文本**。若预热滚动在链条未完成时插入，
   * deepen() 会把 data-ink 从 8 改成别的值，于是最终文案字数不同 ⇒ 文本 rect 不同 ⇒
   * 那一行的像素不同（实测 1404px，Δ=192，全落在 y≈3660 那一行）。
   * 必须**先等 loading 结束**（此时 data-ink 仍是初始 8），再滚动。 */
  const loadSettled = await page.eval(`(async () => {
    let n = 0;
    while (n++ < 150) {
      const loading = document.documentElement.classList.contains('loading');
      if (!loading) return { ok: true, n };
      await new Promise((r) => setTimeout(r, 100));
    }
    return { ok: false, n };
  })()`).catch((e) => ({ ok: false, err: String(e) }));
  if (!loadSettled.ok) console.log(`    ⚠ ${vp.name}: 载入未收敛 ${JSON.stringify(loadSettled)}`);

  // ② 懒加载图解码（遮罩模式下也要解码，否则 DOM 状态两侧不同）
  await page.eval(`(() => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } return Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); })()`).catch(() => {});
  await sleep(700);

  // ③ 预热滚动（触发 IntersectionObserver / 滚动驱动状态），然后回顶
  await page.eval(`(async () => {
    const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H);
    const step = Math.max(1, Math.round(H * 0.5));
    for (let y = 0; y <= max; y += step) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,110)); }
    window.scrollTo({top:max,behavior:'instant'}); await new Promise(r=>setTimeout(r,240));
    for (let y = max; y >= 0; y -= step) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,110)); }
    window.scrollTo({top:0,behavior:'instant'});
    await new Promise(r=>setTimeout(r,300));
    return true;
  })()`).catch(() => {});
  await sleep(650);

  // ④ 冻结动效（两侧同一套）
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(550);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(350);

  // ⑤ 等 DOM 收敛（连续 3 次读到的状态向量一致）
  const conv = await page.eval(`(async () => {
    const snap = () => (document.body.getAttribute('data-ink') || '') + '|'
      + ((document.getElementById('seep-text') || {}).textContent || '') + '|'
      + [...document.querySelectorAll('.ghost text')].map((t) => getComputedStyle(t).opacity).join(',');
    let last = null, same = 0, n = 0;
    while (n++ < 80) {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 70)));
      const now = snap();
      if (now === last) { if (++same >= 3) return { ok: true, n, v: now.slice(0, 60) }; } else { same = 0; last = now; }
    }
    return { ok: false, n, v: String(last).slice(0, 60) };
  })()`).catch((e) => ({ ok: false, err: String(e) }));
  if (!conv.ok) console.log(`    ⚠ ${vp.name}: DOM 未收敛 ${JSON.stringify(conv)}`);
  await sleep(250);
  return page;
}

const srvBefore = await serve('D:/Web/style/deliverables/69-exec/_before-tree');
const srvAfter = await serve('D:/Web/style');
// 两侧的 URL 必须在各自根下解析到同一份文件：
//   _before-tree/<case>/index.html  ←→  <repo>/prototypes/<case>/index.html
const urlFor = (side, dir) => (side === 'before' ? srvBefore : srvAfter)
  .url(side === 'before' ? `${dir}/index.html` : `prototypes/${dir}/index.html`);
console.log(`before → ${urlFor('before', 'S07-slate-ink-contents')}`);
console.log(`after  → ${urlFor('after', 'S07-slate-ink-contents')}`);
const browser = await Browser.launch({ width: 1440, height: 900 });
const results = [];

for (const [id, dir] of CASES) {
  for (const vp of VIEWPORTS) {
    const rec = { id, vp: vp.name, w: vp.w };
    // ——— 几何 ———
    for (const [side, srv] of [['before', srvBefore], ['after', srvAfter]]) {
      const page = await prep(browser, urlFor(side, dir), vp);
      rec[side] = {
        docH: await page.eval('document.documentElement.scrollHeight'),
        layout: await page.eval(LAYOUT_SIG),
        text: await page.eval(TEXT_SIG),
        layoutN: await page.eval('document.querySelectorAll("body *").length'),
      };
      await page.close();
    }
    rec.layoutSame = rec.before.layout === rec.after.layout;
    rec.textSame = rec.before.text === rec.after.text;
    rec.docHSame = rec.before.docH === rec.after.docH;

    // ——— 像素（遮罩图，逐字节）———
    const pix = {};
    for (const [side, srv] of [['before', srvBefore], ['after', srvAfter]]) {
      const page = await prep(browser, urlFor(side, dir), vp);
      await page.eval(`(() => { const s=document.createElement('style'); s.textContent='img{visibility:hidden!important}'; document.head.appendChild(s); return true; })()`);
      await sleep(450);
      const masked = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
      writeFileSync(`${OUT}/${id}-${vp.name}-${side}-masked.png`, masked);
      // 不遮罩版（记录噪声，不作为判据）
      await page.eval(`(() => { const s=document.createElement('style'); s.textContent='img{visibility:visible!important}'; document.head.appendChild(s); return true; })()`);
      await sleep(450);
      const raw = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
      writeFileSync(`${OUT}/${id}-${vp.name}-${side}-raw.png`, raw);
      // 5 位滚动（遮罩）
      await page.eval(`(() => { const s=document.createElement('style'); s.textContent='img{visibility:hidden!important}'; document.head.appendChild(s); return true; })()`);
      await sleep(400);
      const scrolls = [];
      for (let k = 0; k < 5; k++) {
        await page.eval(`window.scrollTo({top:${k * vp.h},behavior:'instant'})`);
        await sleep(320);
        const b = Buffer.from(await page.screenshot({ format: 'png' }), 'base64');
        writeFileSync(`${OUT}/${id}-${vp.name}-${side}-s${k}.png`, b);
        scrolls.push(b);
      }
      pix[side] = { masked, raw, scrolls };
      await page.close();
    }
    rec.maskedSame = sha(pix.before.masked) === sha(pix.after.masked);
    rec.maskedSha = sha(pix.before.masked).slice(0, 10);
    rec.scrollSame = pix.before.scrolls.map((b, i) => sha(b) === sha(pix.after.scrolls[i]));
    rec.scrollSha = pix.before.scrolls.map(b => sha(b).slice(0, 10));

    // 若遮罩图不同，立刻逐像素定位（不留"大概一样"的余地）
    if (!rec.maskedSame) {
      const d = diffPngs(pix.before.masked, pix.after.masked);
      rec.maskedDiff = d.sizeMismatch ? { sizeMismatch: true, a: d.a, b: d.b } : { n: d.n, maxDelta: d.maxDelta, box: [d.minX, d.minY, d.maxX, d.maxY], total: d.totalPx, topRows: d.topRows, samples: d.samples.slice(0, 5) };
    }
    // 不遮罩的差异也记（噪声口径）
    const dr = diffPngs(pix.before.raw, pix.after.raw);
    rec.rawDiff = dr.sizeMismatch ? { sizeMismatch: true } : { n: dr.n, maxDelta: dr.maxDelta, box: [dr.minX, dr.minY, dr.maxX, dr.maxY] };

    // 文本签名若有差，打印前几处
    if (!rec.textSame) {
      const a = rec.before.text.split('\n'), b = rec.after.text.split('\n');
      rec.textDiffs = [];
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) { rec.textDiffs.push({ i, a: a[i], b: b[i] }); if (rec.textDiffs.length >= 8) break; }
      }
    }
    rec.layoutNBefore = rec.before.layoutN; rec.layoutNAfter = rec.after.layoutN;
    delete rec.before.layout; delete rec.after.layout; delete rec.before.text; delete rec.after.text;

    console.log(`${id} ${vp.name.padEnd(8)} docH ${rec.docHSame ? '★同' : '✗变'}(${rec.before.docH})  几何 ${rec.layoutSame ? '★0差' : '✗有差'}  文本rect ${rec.textSame ? '★0差' : '✗有差'}  遮罩像素 ${rec.maskedSame ? '★逐字节同' : '✗' + (rec.maskedDiff?.n ?? '?') + 'px'}  滚动 ${rec.scrollSame.every(Boolean) ? '★5/5同' : '✗' + rec.scrollSame.filter(Boolean).length + '/5'}`);
    if (rec.textDiffs) for (const t of rec.textDiffs.slice(0, 4)) console.log(`    文本差 #${t.i}: ${t.a}  →  ${t.b}`);
    if (rec.maskedDiff && !rec.maskedDiff.sizeMismatch) console.log(`    像素差 ${rec.maskedDiff.n}px maxΔ${rec.maskedDiff.maxDelta} box=${JSON.stringify(rec.maskedDiff.box)}`);
    results.push(rec);
  }
}
writeFileSync('D:/Web/style/deliverables/69-exec/_ab/ab.json', JSON.stringify(results, null, 1), 'utf8');

/* S13 desktop 是**唯一一处预期会变**的组合：那里正是这次刻意改掉的版心
 * （.clause__body 从 480px → 640px，见 style.css 末尾那段）。把它和其它 8 组
 * 混在一个"通过率"里，等于用一句好看的总数掩盖一个必须单独说明的事实。
 * 所以分开报：6 组 mono（只换标记，必须全 0 差异）+ 2 组 S13 非桌面档（必须 0 差异）
 * + 1 组 S13 桌面档（预期变，但必须只变在正文行宽上）。 */
const S13_DESKTOP = results.filter((r) => r.id === 'S13' && r.vp === 'desktop');
const MUST_IDENTICAL = results.filter((r) => !(r.id === 'S13' && r.vp === 'desktop'));
const monoOnly = MUST_IDENTICAL.filter((r) => r.id !== 'S13' || r.vp !== 'desktop');

console.log('\n汇总（分开报，不合并成一个好看的总数）：');
console.log(`  A. mono 三案 × 三档（9 组里除 S13-desktop 的 8 组；其中 S13 的 768/390 还叠加了版心改动）：`);
for (const r of MUST_IDENTICAL) {
  const ok = r.layoutSame && r.textSame && r.maskedSame && r.scrollSame.every(Boolean) && r.docHSame;
  console.log(`     ${ok ? '★' : '✗'} ${r.id} ${r.vp.padEnd(8)} 几何${r.layoutSame ? '0差' : '有差'} 文本rect${r.textSame ? '0差' : '有差'} 像素${r.maskedSame ? '逐字节同' : '不同'} 滚动${r.scrollSame.filter(Boolean).length}/5 docH${r.docHSame ? '同' : '变'}`);
}
console.log(`     → 8/8 全同？ ${MUST_IDENTICAL.every((r) => r.layoutSame && r.textSame && r.maskedSame && r.scrollSame.every(Boolean) && r.docHSame)}`);
console.log(`\n  B. S13 desktop（预期变 —— 就是这次改的版心）：`);
for (const r of S13_DESKTOP) {
  console.log(`     docH ${r.before.docH} → ${r.after.docH}（预期变短：正文行变少）`);
  console.log(`     遮罩像素差 ${r.maskedDiff && !r.maskedDiff.sizeMismatch ? r.maskedDiff.n + 'px / ' + r.maskedDiff.total : '—'}`);
}
console.log(`\n  说明：A 组 8/8 逐字节相同 = 换标记零像素代价；B 组单独列 = 版心改动的代价。`);
await browser.close();
srvBefore.server.close();
srvAfter.server.close();

