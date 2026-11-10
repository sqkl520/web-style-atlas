/* 屏 3 / 5 / 6 的空是「横着空」还是「竖着空」？
 * 按 y 分桶统计 bare 点，并列出每一屏里文字矩形的 y 区间，看空档落在哪。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.goto(srv.url('prototypes/S13-blind-debossed-dispatch/index.html'), { timeoutMs: 30000, settleMs: 900 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
await sleep(1500);
await page.eval(`(async () => {
  const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H);
  for (let y = 0; y <= max; y += Math.round(H*0.5)) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,110)); }
  window.scrollTo({top:0,behavior:'instant'});
  await Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); return true;
})()`);
await sleep(700);

const pageH = await page.eval('document.documentElement.scrollHeight');
const n = Math.ceil(pageH / 900);
for (let i = 0; i < n; i++) {
  await page.eval(`window.scrollTo({top:${i * 900},behavior:'instant'})`);
  await sleep(280);
  const r = await page.eval(`(() => {
    const W = innerWidth, H = innerHeight;
    const opaque = (c) => c && c !== 'transparent' && !/rgba\\([^)]*,\\s*0\\)$/.test(c);
    const pageBg = [document.body, document.documentElement].map(e => getComputedStyle(e).backgroundColor).find(opaque) || 'rgb(255,255,255)';
    const textRects = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
    for (let nd = walker.nextNode(); nd; nd = walker.nextNode()) {
      if (!nd.nodeValue.trim() || !nd.parentElement) continue;
      const pcs = getComputedStyle(nd.parentElement); if (pcs.visibility === 'hidden' || +pcs.opacity < 0.2) continue;
      rg.selectNodeContents(nd); for (const rr of rg.getClientRects()) if (rr.bottom > 0 && rr.top < H && rr.width > 1) textRects.push(rr);
    }
    let f = 0, s = 0; const bareY = {}, bareX = {};
    for (let gx = 0; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
      const x = (gx + 0.5) * (W / 24), yy = (gy + 0.5) * (H / 15); s++;
      if (textRects.some(rr => x >= rr.left - 6 && x <= rr.right + 6 && yy >= rr.top - 4 && yy <= rr.bottom + 4)) { f++; continue; }
      let el = document.elementFromPoint(x, yy); let hit = false;
      for (let k = 0; el && k < 6 && el !== document.body && el !== document.documentElement; k++, el = el.parentElement) {
        if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { hit = true; break; }
        const cs2 = getComputedStyle(el);
        if (cs2.backgroundImage !== 'none') { hit = true; break; }
        const bg = cs2.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) hit = true; break; }
      }
      if (!hit) { const ky = Math.floor(yy / 60) * 60; bareY[ky] = (bareY[ky] || 0) + 1; const kx = Math.floor(x / 120) * 120; bareX[kx] = (bareX[kx] || 0) + 1; }
    }
    // 每 60px 水平带有多少文字
    const band = {};
    for (const rr of textRects) { const k = Math.floor((rr.top + rr.bottom) / 2 / 60) * 60; band[k] = (band[k] || 0) + Math.round(rr.width); }
    // 每个 x 120px 列有多少文字（累计宽）
    const colw = {};
    for (const rr of textRects) { for (let x = Math.floor(rr.left / 120) * 120; x < rr.right; x += 120) { colw[x] = (colw[x] || 0); } }
    return { filled: Math.round(f / s * 100) / 100, bareN: 360 - f,
      bareY: Object.entries(bareY).sort((a,b)=>a[0]-b[0]),
      bareX: Object.entries(bareX).sort((a,b)=>a[0]-b[0]),
      band: Object.entries(band).sort((a,b)=>a[0]-b[0]) };
  })()`);
  console.log(`\n=== 屏 ${i + 1} y=${i * 900}  填充 ${r.filled}  bare ${r.bareN}/360`);
  console.log(`  bare 按 y(每60px): ${r.bareY.map(([k, v]) => k + ':' + v).join(' ')}`);
  console.log(`  bare 按 x(每120px): ${r.bareX.map(([k, v]) => k + ':' + v).join(' ')}`);
  console.log(`  文字带宽(每60px水平带): ${r.band.map(([k, v]) => k + ':' + v).join(' ')}`);
}
await browser.close();
srv.server.close();
