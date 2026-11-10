// 让文本渲染确定化：关掉 LCD 子像素抗锯齿（--disable-lcd-text），
// 看整页 PNG 是否变成逐字节可复现。这是"先修测量手法，再下结论"的一步。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { diffPngs } from './png.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

const FLAG_SETS = {
  'baseline': [],
  'disable-lcd-text': ['--disable-lcd-text'],
  'disable-lcd-text+font-subpixel-off': ['--disable-lcd-text', '--disable-font-subpixel-positioning'],
};

async function prep(browser, url) {
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

const srv = await serve();
const CASES = [['S07', 'S07-slate-ink-contents'], ['S13', 'S13-blind-debossed-dispatch'], ['S21', 'S21-interlocking-release-book']];

for (const [name, extraArgs] of Object.entries(FLAG_SETS)) {
  console.log(`\n########## flags: ${name}  ${JSON.stringify(extraArgs)}`);
  const browser = await Browser.launch({ width: 1440, height: 900, extraArgs });
  for (const [id, dir] of CASES) {
    const url = srv.url(`prototypes/${dir}/index.html`);
    // 两次独立加载，每次 3 连拍
    const runs = [];
    for (let run = 0; run < 2; run++) {
      const page = await prep(browser, url);
      const shots = [];
      for (let i = 0; i < 3; i++) {
        const b = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
        shots.push(b);
        await sleep(350);
      }
      runs.push(shots);
      await page.close();
    }
    const all = [...runs[0], ...runs[1]];
    const hashes = all.map(sha);
    const same = new Set(hashes).size === 1;
    console.log(`  ${id}: ${hashes.map(h => h.slice(0, 8)).join(' ')}  ${same ? '★六张全部逐字节一致' : '✗仍不稳'}`);
    if (!same) {
      const d = diffPngs(all[0], all[1] || all[0].slice(0));
      if (d.n !== undefined) {
        console.log(`     0 vs 1: ${d.n} px, maxΔ ${d.maxDelta}, box y[${d.minY}..${d.maxY}]`);
      }
      // 跨加载比较（第 0 次 vs 第 3 次）
      const d2 = diffPngs(runs[0][0], runs[1][0]);
      if (d2.n !== undefined) console.log(`     run0 vs run1: ${d2.n} px, maxΔ ${d2.maxDelta}, box y[${d2.minY}..${d2.maxY}]`);
    }
    writeFileSync(`D:/Web/style/deliverables/69-exec/_flag-${name}-${id}.png`, runs[0][0]);
  }
  await browser.close();
}
srv.server.close();
