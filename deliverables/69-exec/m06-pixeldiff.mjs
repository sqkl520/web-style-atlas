// 找出「同一页面内两张整页 PNG 到底差在哪几个像素」。
// 做法：把两张 PNG 都喂回页面（canvas 解码），逐像素比，输出差异数量、包围盒、样例颜色。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { createHash } from 'node:crypto';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });

async function prep(url) {
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
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(600);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(400);
  return page;
}

for (const [id, dir] of [['S21', 'S21-interlocking-release-book'], ['S13', 'S13-blind-debossed-dispatch']]) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  console.log(`\n########## ${id}`);
  const page = await prep(url);
  const shots = [];
  for (let i = 0; i < 5; i++) {
    const b = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
    shots.push({ h: sha(b), b64: b.toString('base64'), len: b.length });
    await sleep(350);
  }
  console.log('  5 连拍: ' + shots.map(s => s.h.slice(0, 8) + '/' + s.len).join('  '));

  // 找两张不同的
  const first = shots[0].h;
  const idx = shots.findIndex(s => s.h !== first);
  if (idx === -1) { console.log('  ★ 5 连拍全部一致'); await page.close(); continue; }

  const r = await page.eval(`(async (a) => {
    const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const [ia, ib] = await Promise.all([load(a.u1), load(a.u2)]);
    const W = ia.naturalWidth, H = ia.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(ia, 0, 0); const d1 = x.getImageData(0, 0, W, H).data;
    x.clearRect(0, 0, W, H); x.drawImage(ib, 0, 0); const d2 = x.getImageData(0, 0, W, H).data;
    let n = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1; const samples = [];
    for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
      const o = (y * W + px) * 4;
      if (d1[o] !== d2[o] || d1[o+1] !== d2[o+1] || d1[o+2] !== d2[o+2] || d1[o+3] !== d2[o+3]) {
        n++; if (px < minX) minX = px; if (px > maxX) maxX = px; if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (samples.length < 12) samples.push({ x: px, y, a: [d1[o],d1[o+1],d1[o+2],d1[o+3]], b: [d2[o],d2[o+1],d2[o+2],d2[o+3]] });
      }
    }
    return { W, H, n, box: n ? { minX, minY, maxX, maxY } : null, samples };
  })()`, { u1: 'data:image/png;base64,' + shots[0].b64, u2: 'data:image/png;base64,' + shots[idx].b64 });

  console.log(`  图像 ${r.W}x${r.H}，差异像素 ${r.n} 个`);
  if (r.box) console.log(`  差异包围盒 x[${r.box.minX}..${r.box.maxX}] y[${r.box.minY}..${r.box.maxY}]`);
  for (const s of r.samples) console.log(`    (${s.x},${s.y})  ${s.a.join(',')}  →  ${s.b.join(',')}`);

  // 差异点在文档里的位置 → 是哪个元素
  if (r.box) {
    const who = await page.eval(`(a => {
      const out = [];
      for (const [x, y] of a) {
        // 截图坐标 = 文档坐标（scale 1, scrollY 0）
        const els = document.elementsFromPoint(Math.min(innerWidth - 1, x), Math.max(0, Math.min(innerHeight - 1, y - scrollY)));
        out.push({ x, y, els: els.slice(0, 4).map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '')) });
      }
      return out;
    })`, [[r.box.minX, r.box.minY], [r.box.maxX, r.box.maxY], [r.samples[0].x, r.samples[0].y]]);
    console.log('  差异点处的元素：');
    for (const w of who) console.log(`    (${w.x},${w.y}) ${w.els.join('  <  ')}`);
  }
  await page.close();
}
await browser.close();
srv.server.close();
