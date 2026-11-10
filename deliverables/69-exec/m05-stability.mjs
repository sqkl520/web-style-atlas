// 稳定性隔离：把「同一页面内重复截图」与「跨加载重复截图」分开，
// 再对整页 PNG 做字节级定位（找出差异落在哪一行像素），而不是笼统说"漂了"。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

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
  // 状态汇总
  const st = await page.eval(`(() => ({
    docH: document.documentElement.scrollHeight,
    n: document.querySelectorAll('body *').length,
    images: [...document.images].map(i => i.complete + ':' + i.naturalWidth).join(','),
    fonts: [...document.fonts].map(f => f.family + ':' + f.status).sort().join(','),
    pressed: document.querySelectorAll('.is-pressed,.is-armed,.is-visible,.is-loading,.is-flipped,.is-cut').length,
    anims: document.getAnimations ? document.getAnimations().length : -1,
    ghostLines: document.querySelectorAll('.ghost text').length,
    ink: document.body.getAttribute('data-ink'),
    seep: (document.getElementById('seep-text')||{}).textContent,
  }))()`);
  return { page, st };
}

for (const [id, dir] of [['S07', 'S07-slate-ink-contents'], ['S21', 'S21-interlocking-release-book'], ['S13', 'S13-blind-debossed-dispatch']]) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  console.log(`\n########## ${id}`);

  // A. 同一页面连拍 3 张
  const A = await prep(url);
  console.log('  状态:', JSON.stringify(A.st).slice(0, 260));
  const same = [];
  for (let i = 0; i < 3; i++) {
    const b = Buffer.from(await A.page.screenshot({ format: 'png', fullPage: true }), 'base64');
    same.push({ h: sha(b), len: b.length });
    writeFileSync(`D:/Web/style/deliverables/69-exec/_st-${id}-same${i}.png`, b);
    await sleep(300);
  }
  console.log(`  同页连拍: ${same.map(s => s.h.slice(0, 8) + '/' + s.len).join('  ')}  ${new Set(same.map(s => s.h)).size === 1 ? '★完全一致' : '✗同页内就不稳'}`);
  await A.page.close();

  // B. 跨加载 2 次
  const B = await prep(url);
  const b1 = Buffer.from(await B.page.screenshot({ format: 'png', fullPage: true }), 'base64');
  writeFileSync(`D:/Web/style/deliverables/69-exec/_st-${id}-load2.png`, b1);
  console.log(`  状态(第二次): ${JSON.stringify(B.st).slice(0, 260)}`);
  console.log(`  跨加载: ${same[0].h.slice(0, 8)}/${same[0].len}  vs  ${sha(b1).slice(0, 8)}/${b1.length}  ${sha(b1) === same[0].h ? '★完全一致' : '✗跨加载不同'}`);

  // 定位差异：解码 PNG 太重，改用截图切片二分（只在跨加载不同时做）
  if (sha(b1) !== same[0].h) {
    const diffDims = await B.page.eval(`(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))()`);
    console.log(`  页面尺寸 ${diffDims.w}x${diffDims.h}；逐带切片比较（每带 400px）：`);
    const bands = [];
    for (let y = 0; y < diffDims.h; y += 400) {
      const clip = { x: 0, y, width: diffDims.w, height: Math.min(400, diffDims.h - y) };
      const s1 = await A.page ? null : null;
      void s1;
      const bb = Buffer.from(await B.page.screenshot({ format: 'png', clip }), 'base64');
      bands.push({ y, h: sha(bb).slice(0, 8), len: bb.length, buf: bb });
    }
    // 与"同页三次"的那张做同样的切片（用 load2 自己的同页第二次拍来对比）
    const bands2 = [];
    for (let y = 0; y < diffDims.h; y += 400) {
      const clip = { x: 0, y, width: diffDims.w, height: Math.min(400, diffDims.h - y) };
      const bb = Buffer.from(await B.page.screenshot({ format: 'png', clip }), 'base64');
      bands2.push({ y, h: sha(bb).slice(0, 8) });
    }
    for (let i = 0; i < bands.length; i++) {
      const ok = bands[i].h === bands2[i].h;
      if (!ok) console.log(`    y=${bands[i].y}  ✗ ${bands[i].h}/${bands[i].len}B  vs  ${bands2[i].h}`);
    }
    console.log('    （只打印同页内第二次拍仍不同的带；同页内稳定则说明差异来自加载期状态）');
  }
  await B.page.close();
}
await browser.close();
srv.server.close();
