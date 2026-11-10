// 诊断：同一 URL 两次测量，逐行 diff 出「哪一行不稳」。
// 不猜，直接看哪个元素的哪个属性在变。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { writeFileSync } from 'node:fs';

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });

const SNAP = `(() => {
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push({
      key: tag + '.' + (typeof el.className === 'string' ? el.className : ''),
      rect: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100),
      fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, color: cs.color,
      bg: cs.backgroundColor, display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      margin: cs.marginTop + '|' + cs.marginLeft, padding: cs.paddingTop + '|' + cs.paddingLeft,
      border: cs.borderTopWidth + '|' + cs.borderLeftWidth + '|' + cs.borderTopColor,
      whiteSpace: cs.whiteSpace, textAlign: cs.textAlign, transform: cs.transform, overflow: cs.overflow,
    });
  }
  return rows;
})()`;

async function once(url, label) {
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
  const rows = await page.eval(SNAP);
  const shot = await page.evaluate ? null : null;
  const png = await page.screenshot({ format: 'png', fullPage: true });
  writeFileSync(`D:/Web/style/deliverables/69-exec/_noise-${label}.png`, Buffer.from(png, 'base64'));
  await page.close();
  return rows;
}

for (const [id, dir] of [['S07', 'S07-slate-ink-contents'], ['S21', 'S21-interlocking-release-book'], ['S13', 'S13-blind-debossed-dispatch']]) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  const a = await once(url, `${id}-a`);
  const b = await once(url, `${id}-b`);
  console.log(`\n===== ${id}  ${a.length} vs ${b.length} 元素 =====`);
  let diffs = 0;
  const props = ['rect', 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'lineHeight', 'color', 'bg', 'display', 'visibility', 'opacity', 'margin', 'padding', 'border', 'whiteSpace', 'textAlign', 'transform', 'overflow'];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    for (const p of props) {
      const va = JSON.stringify(a[i][p]), vb = JSON.stringify(b[i][p]);
      if (va !== vb) { diffs++; if (diffs <= 40) console.log(`  #${i} ${a[i].key}  ${p}:  ${va}  ->  ${vb}`); }
    }
  }
  console.log(`  差异字段数：${diffs}`);
}
await browser.close();
srv.server.close();
