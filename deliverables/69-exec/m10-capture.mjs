/* 像素级取证：三案 × 三视口 ×（几何签名 + 遮罩整页 + 不遮罩整页 + 5 位滚动）
 *
 *   node m10-capture.mjs before
 *   node m10-capture.mjs after
 *
 * 为什么要"遮罩"和"不遮罩"两份：
 *   m07/m09 实测出的噪声下限 —— 同一 URL、同一页面连拍或跨加载，S13 的整页 PNG
 *   仍有 32 px（Δ1/255）到 48536 px（Δ7）的漂移，且差异全部落在 <img> 覆盖区
 *   （y 3000–3274 = .plates__grid），几何签名则是 0 处差异。也就是说：
 *   漂的是图片解码器，不是排版。
 *   · 遮罩图（img{visibility:hidden}，盒子不变）→ 文字与色块像素可逐字节比较；
 *   · 不遮罩 → 记录"两侧各自的噪声下限"，改前改后的差若不超过同态重复的差，
 *     才是"零像素代价"的诚实表述。
 * 两份都必须给，只给遮罩那组等于把不利证据藏起来。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { sha } from './pix-lib.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const label = process.argv[2] || 'before';
const OUT = 'D:/Web/style/deliverables/69-exec/_pix';
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

// 几何签名：全量元素 × rect(0.01px) + 15 个排版属性。m04 实测跨加载 0 处差异。
const BOX_SIG = `(() => {
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push([tag,
      (typeof el.className === 'string' ? el.className : ''),
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

async function prep(browser, url, vp, maskImages) {
  const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1500);
  await page.eval(`(() => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } return Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); })()`).catch(() => {});
  await sleep(800);
  await page.eval(`(async () => {
    const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H);
    const step = Math.max(1, Math.round(H * 0.5));
    for (let y = 0; y <= max; y += step) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,110)); }
    window.scrollTo({top:max,behavior:'instant'}); await new Promise(r=>setTimeout(r,240));
    for (let y = max; y >= 0; y -= step) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,110)); }
    window.scrollTo({top:0,behavior:'instant'});
    await Promise.all([...document.images].map(i=>i.decode().catch(()=>null)));
    return true;
  })()`).catch(() => {});
  await sleep(650);
  if (maskImages) {
    await page.eval(`(() => { const s=document.createElement('style'); s.textContent='img{visibility:hidden!important}'; document.head.appendChild(s); return true; })()`).catch(() => {});
    await sleep(400);
  }
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(550);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(350);
  return page;
}

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { label, at: new Date().toISOString(), cases: {} };

for (const [id, dir] of CASES) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  out.cases[id] = { dir, url, runs: [] };
  for (let run = 0; run < 2; run++) {
    const rec = { run, viewports: {} };
    for (const vp of VIEWPORTS) {
      // ① 露图版（记录噪声；两份图都存，便于事后逐像素定位）
      let page = await prep(browser, url, vp, false);
      const boxes = await page.eval(BOX_SIG);
      const meta = await page.eval(`(() => ({ docH: document.documentElement.scrollHeight,
        images: [...document.images].map(i=>i.complete+':'+i.naturalWidth).join(','),
        fonts: [...document.fonts].map(f=>f.family+':'+f.status).sort().join(',') }))()`);
      const raw = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
      writeFileSync(`${OUT}/${id}-${vp.name}-run${run}-raw.png`, raw);
      await page.close();

      // ② 遮罩图版（文字/色块可逐字节比较 + 5 位滚动）
      page = await prep(browser, url, vp, true);
      const masked = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
      writeFileSync(`${OUT}/${id}-${vp.name}-run${run}-masked.png`, masked);
      const scrolls = {};
      const stepPx = Math.round(vp.h);
      for (let k = 0; k < 5; k++) {
        const y = k * stepPx;
        await page.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
        await sleep(300);
        const b = Buffer.from(await page.screenshot({ format: 'png' }), 'base64');
        scrolls['y' + y] = sha(b);
        writeFileSync(`${OUT}/${id}-${vp.name}-run${run}-scroll${k}.png`, b);
      }
      await page.close();

      rec.viewports[vp.name] = {
        w: vp.w, h: vp.h, docH: meta.docH, images: meta.images, fonts: meta.fonts,
        boxesN: boxes.n, boxesSig: sha(Buffer.from(boxes.sig, 'utf8')),
        rawSha: sha(raw), rawBytes: raw.length,
        maskedSha: sha(masked), maskedBytes: masked.length,
        scrolls,
      };
      console.log(`  ${label} ${id} ${vp.name} r${run}: docH=${meta.docH} boxes=${boxes.n} masked=${sha(masked).slice(0,8)} raw=${sha(raw).slice(0,8)}`);
    }
    out.cases[id].runs.push(rec);
  }
}
writeFileSync(`${OUT}/${label}.json`, JSON.stringify(out, null, 1), 'utf8');
console.log(`\n已写 ${OUT}/${label}.json`);
await browser.close();
srv.server.close();
