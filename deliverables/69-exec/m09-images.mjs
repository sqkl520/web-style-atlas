// 确认漂移来源：把 <img> 换成纯色块后，整页 PNG 是否逐字节可复现。
// 如果可复现 → 漂移来自图片解码（AVIF/JPEG 解码器的微小舍入），不是布局/字体。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { diffPngs } from './png.mjs';
import { createHash } from 'node:crypto';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });

async function prep(url, maskImages) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1500);
  await page.eval(`(() => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } return Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); })()`).catch(() => {});
  await sleep(900);
  await page.eval(`(async () => {
    const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H);
    for (let y = 0; y <= max; y += Math.round(H*0.5)) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,120)); }
    window.scrollTo({top:max,behavior:'instant'}); await new Promise(r=>setTimeout(r,260));
    for (let y = max; y >= 0; y -= Math.round(H*0.5)) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,120)); }
    window.scrollTo({top:0,behavior:'instant'});
    await Promise.all([...document.images].map(i=>i.decode().catch(()=>null)));
    return true;
  })()`).catch(() => {});
  await sleep(700);
  if (maskImages) {
    await page.eval(`(() => {
      // 只用 visibility，不改几何：img 仍占同样的盒子
      const s = document.createElement('style');
      s.textContent = 'img{visibility:hidden!important}';
      document.head.appendChild(s);
      return true;
    })()`).catch(() => {});
    await sleep(500);
  }
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(600);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(400);
  return page;
}

// 差异坐标处是什么元素
async function who(page, pts) {
  return page.eval(`(pts => pts.map(([x, y]) => {
    const el = document.elementFromPoint(Math.min(innerWidth - 1, x), y - scrollY);
    const chain = []; let e = el;
    for (let i = 0; e && i < 6; i++, e = e.parentElement) chain.push(e.tagName + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''));
    return chain.join(' < ');
  }))`, pts).catch(() => []);
}

for (const [id, dir] of [['S13', 'S13-blind-debossed-dispatch'], ['S21', 'S21-interlocking-release-book']]) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  console.log(`\n########## ${id}`);
  for (const mask of [false, true]) {
    const got = [];
    for (let run = 0; run < 2; run++) {
      const page = await prep(url, mask);
      const shots = [];
      for (let i = 0; i < 3; i++) {
        shots.push(Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64'));
        await sleep(350);
      }
      got.push({ shots, page });
      if (run === 1) {
        // 定位差异
        const d = diffPngs(got[0].shots[0], shots[0]);
        if (d.sizeMismatch) console.log('    尺寸不同', d.a, d.b);
        else if (d.n) {
          console.log(`    maskImages=${mask}: run0 vs run1 差 ${d.n} px, maxΔ ${d.maxDelta}, y[${d.minY}..${d.maxY}]`);
          const w = await who(page, d.samples.slice(0, 4).map(s => [s.x, s.y]));
          for (const s of d.samples.slice(0, 4)) console.log(`      (${s.x},${s.y}) Δ${s.d}`);
          for (const x of w) console.log(`        → ${x}`);
        } else {
          console.log(`    maskImages=${mask}: run0 vs run1 ★0 像素差异`);
        }
      }
    }
    const all = [...got[0].shots, ...got[1].shots];
    const hs = all.map(sha);
    console.log(`    maskImages=${mask}: ${hs.map(h => h.slice(0, 8)).join(' ')}  ${new Set(hs).size === 1 ? '★六张逐字节一致' : '✗仍不稳（' + new Set(hs).size + ' 种）'}`);
    await got[0].page.close();
    await got[1].page.close();
  }
}
await browser.close();
srv.server.close();
