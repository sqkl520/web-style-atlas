/* S07 desktop 的残留不稳：几何指纹"有差"、遮罩像素却"逐字节同"。
 *
 * 这两个结论互相矛盾 —— 如果真有元素移动，像素不可能完全相同。
 * 所以要么(a)差异在"有几何但不上色"的隐藏元素上，要么(b)我的 LAYOUT_SIG 把
 * 噪声也当成了差异（例如 opacity 从 0.08 变 0.0800001）。
 * 本脚本：把两侧的签名**逐行 diff 出来**，并连跑 5 次看它到底稳不稳。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';

const srvB = await serve('D:/Web/style/deliverables/69-exec/_before-tree');
const srvA = await serve('D:/Web/style');
const browser = await Browser.launch({ width: 1440, height: 900 });

const SIG = `(() => {
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE') continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push([
      tag + '.' + (typeof el.className === 'string' ? el.className : ''),
      [r.x, r.y, r.width, r.height].map((v) => (Math.round(v * 100) / 100).toFixed(2)).join(','),
      cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.lineHeight, cs.color,
      cs.backgroundColor, cs.display, cs.visibility, cs.opacity, cs.whiteSpace,
      cs.marginTop + ',' + cs.marginLeft + ',' + cs.marginBottom + ',' + cs.marginRight,
      cs.paddingTop + ',' + cs.paddingLeft, cs.borderTopWidth, cs.borderLeftWidth,
      cs.textAlign, cs.transform, cs.overflow, cs.writingMode,
      (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
    ]);
  }
  return rows;
})()`;

async function prep(url) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1200);
  await page.eval(`(async () => { let n=0; while(n++<150){ if(!document.documentElement.classList.contains('loading')) return true; await new Promise(r=>setTimeout(r,100)); } return false; })()`);
  await page.eval(`(() => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } return Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); })()`).catch(() => {});
  await sleep(700);
  await page.eval(`(async () => {
    const H=innerHeight,max=document.documentElement.scrollHeight-H,s=Math.round(H*0.5);
    for(let y=0;y<=max;y+=s){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,110));}
    window.scrollTo({top:max,behavior:'instant'});await new Promise(r=>setTimeout(r,240));
    for(let y=max;y>=0;y-=s){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,110));}
    window.scrollTo({top:0,behavior:'instant'});await new Promise(r=>setTimeout(r,300));return true;})()`);
  await sleep(650);
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(550);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(350);
  await page.eval(`(async () => { const sn=()=>(document.body.getAttribute('data-ink')||'')+'|'+((document.getElementById('seep-text')||{}).textContent||''); let l=null,s=0,n=0; while(n++<80){await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,70)));const x=sn();if(x===l){if(++s>=3)return true;}else{s=0;l=x;}} return false; })()`);
  await sleep(250);
  const sig = await page.eval(SIG);
  const extra = await page.eval(`(() => ({ ink: document.body.getAttribute('data-ink'), seep: (document.getElementById('seep-text')||{}).textContent, loading: document.documentElement.classList.contains('loading'), ghostO: getComputedStyle(document.querySelector('.pages')).getPropertyValue('--ghost-o') }))()`);
  await page.close();
  return { sig, extra };
}

const B = [];
const A = [];
for (let i = 0; i < 3; i++) {
  B.push(await prep(srvB.url('S07-slate-ink-contents/index.html')));
  A.push(await prep(srvA.url('prototypes/S07-slate-ink-contents/index.html')));
}
console.log('--- 每侧的额外状态（data-ink / seep 文案 / loading / --ghost-o）---');
for (let i = 0; i < 3; i++) {
  console.log(`  before#${i} ${JSON.stringify(B[i].extra)}`);
  console.log(`  after #${i} ${JSON.stringify(A[i].extra)}`);
}

// 侧内稳定性：before 各次之间是否一致
const cmp = (x, y, label) => {
  const diffs = [];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    for (let k = 0; k < x[i].length; k++) {
      if (String(x[i][k]) !== String(y[i][k])) diffs.push({ i, key: x[i][0], col: k, a: x[i][k], b: y[i][k] });
    }
  }
  console.log(`\n${label}: ${diffs.length} 处差异`);
  for (const d of diffs.slice(0, 10)) console.log(`  #${d.i} ${d.key}  col${d.col}: ${JSON.stringify(d.a)} → ${JSON.stringify(d.b)}`);
  return diffs;
};
cmp(B[0].sig, B[1].sig, 'before#0 vs before#1（侧内噪声）');
cmp(A[0].sig, A[1].sig, 'after#0 vs after#1（侧内噪声）');
cmp(B[0].sig, A[0].sig, 'before#0 vs after#0（A/B 差异）');

await browser.close();
srvB.server.close();
srvA.server.close();
