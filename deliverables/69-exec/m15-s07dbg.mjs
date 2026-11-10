// 诊断 S07 desktop 的"几何有差但遮罩像素逐字节同"：逐字段列出差异。
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';

const srvB = await serve('D:/Web/style/deliverables/69-exec/_before-tree');
const srvA = await serve('D:/Web/style');
const browser = await Browser.launch({ width: 1440, height: 900 });

const SNAP = `(() => {
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT','STYLE','CODE'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push({
      key: el.tagName + '.' + (typeof el.className === 'string' ? el.className : '') + (el.id ? '#' + el.id : ''),
      rect: [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100),
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight, color: cs.color, opacity: cs.opacity, display: cs.display,
      visibility: cs.visibility, transform: cs.transform, whiteSpace: cs.whiteSpace,
      textAlign: cs.textAlign, overflow: cs.overflow, writingMode: cs.writingMode,
      margin: [cs.marginTop, cs.marginLeft, cs.marginBottom, cs.marginRight].join(','),
      padding: [cs.paddingTop, cs.paddingLeft].join(','),
      border: [cs.borderTopWidth, cs.borderLeftWidth].join(','),
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
    });
  }
  return rows;
})()`;

async function snap(srv, dir) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(srv.url(dir), { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1600);
  await page.eval(`(async () => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } await Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); const H=innerHeight,max=document.documentElement.scrollHeight-H; for(let y=0;y<=max;y+=450){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,110));} window.scrollTo({top:max,behavior:'instant'}); await new Promise(r=>setTimeout(r,240)); for(let y=max;y>=0;y-=450){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,110));} window.scrollTo({top:0,behavior:'instant'}); await new Promise(r=>setTimeout(r,600)); return true; })()`).catch(() => {});
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(500);
  await page.eval(`(async () => {
    const snap = () => (document.body.getAttribute('data-ink')||'')+'|'+((document.getElementById('seep-text')||{}).textContent||'')+'|'+[...document.querySelectorAll('.ghost text')].map(t=>getComputedStyle(t).opacity).join(',');
    let last=null,same=0,n=0;
    while(n++<60){ await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,70))); const now=snap(); if(now===last){ if(++same>=3) return true; } else { same=0; last=now; } }
    return false;
  })()`).catch(() => {});
  await sleep(250);
  const s = await page.eval(SNAP);
  await page.close();
  return s;
}

const a = await snap(srvB, 'S07-slate-ink-contents/index.html');
const b = await snap(srvA, 'prototypes/S07-slate-ink-contents/index.html');
console.log(`before ${a.length} / after ${b.length}`);
const props = ['rect','fontSize','fontWeight','letterSpacing','lineHeight','color','opacity','display','visibility','transform','whiteSpace','textAlign','overflow','writingMode','margin','padding','border','text'];
let n = 0;
for (let i = 0; i < Math.min(a.length, b.length); i++) {
  for (const p of props) {
    const va = JSON.stringify(a[i][p]), vb = JSON.stringify(b[i][p]);
    if (va !== vb) { n++; if (n <= 20) console.log(`  #${i} ${a[i].key}  ${p}: ${va}  →  ${vb}`); }
  }
}
console.log(`差异字段 ${n} 个`);
await browser.close();
srvB.server.close();
srvA.server.close();
