// 同页连拍 6 张，用 Node 解码 PNG 逐像素定位不稳定点。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { diffPngs } from './png.mjs';
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
  return page;
}

for (const [id, dir] of [['S21', 'S21-interlocking-release-book'], ['S13', 'S13-blind-debossed-dispatch']]) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  console.log(`\n########## ${id}`);
  const page = await prep(url);
  const bufs = [];
  for (let i = 0; i < 6; i++) {
    const b = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
    bufs.push(b);
    await sleep(400);
  }
  console.log('  6 连拍 sha: ' + bufs.map(b => sha(b).slice(0, 8) + '/' + b.length).join('  '));
  const base = bufs[0];
  let found = false;
  for (let i = 1; i < bufs.length; i++) {
    if (sha(bufs[i]) === sha(base)) continue;
    found = true;
    const d = diffPngs(base, bufs[i]);
    console.log(`  第 0 张 vs 第 ${i} 张：差异 ${d.n} / ${d.totalPx} 像素（${(d.n / d.totalPx * 100).toFixed(4)}%），最大差 ${d.maxDelta}/255`);
    console.log(`    包围盒 x[${d.minX}..${d.maxX}] y[${d.minY}..${d.maxY}]`);
    console.log(`    差异最多的行（y: 个数）: ${d.topRows.map(([y, c]) => y + ':' + c).join('  ')}`);
    for (const s of d.samples.slice(0, 6)) console.log(`    (${s.x},${s.y}) ${s.a.join(',')} → ${s.b.join(',')}  Δ${s.d}`);
    // 差异点在哪
    const who = await page.eval(`(pts => pts.map(([x, y]) => {
      const el = document.elementFromPoint(Math.min(innerWidth - 1, x), y - scrollY);
      const chain = []; let e = el;
      for (let i = 0; e && i < 5; i++, e = e.parentElement) chain.push(e.tagName + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''));
      return { x, y, chain: chain.join(' < ') };
    }))`, [[d.minX, d.minY], [d.maxX, d.maxY], [d.samples[0].x, d.samples[0].y]]);
    for (const w of who) console.log(`    (${w.x},${w.y}) ${w.chain}`);
    writeFileSync(`D:/Web/style/deliverables/69-exec/_unstable-${id}-${i}.png`, bufs[i]);
    break;
  }
  if (!found) console.log('  ★ 6 连拍全部一致');
  writeFileSync(`D:/Web/style/deliverables/69-exec/_unstable-${id}-0.png`, base);
  await page.close();
}
await browser.close();
srv.server.close();
