/* 最终 A/B：把 m18 查明的「S07 .ghost 两态」一次性钉死。
 *
 * 背景（m17/m18 实测）：
 *   S07 的 .ghost <text> 有两种自洽状态 ——
 *     状态 α：y=521.78, h=21.63（buildGhost 在 webfont 换上之前量的回退字体行盒）
 *     状态 β：y=524.07, h=20.00（字体换上之后量的）
 *   两侧（改前树 / 当前树）**各自 3/3 稳定**，且**两侧取到同一个状态**。
 *   所以它不是改动造成的差异，而是"我这次测量恰好落到哪一态"的问题。
 *
 * 处置：两侧都在字体就绪后**各补一次 resize**（app.js 里真实存在这条路径：
 *   `addEventListener('resize', () => buildGhost(0))`），把状态统一钉到 β。
 * 这不是给页面打补丁 —— 任意用户拖动一次窗口就会走同一条路径；
 * 而且它同时消除了"遮罩像素相同/几何有差"的那对矛盾结论。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { sha } from './pix-lib.mjs';
import { diffPngs } from './png.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-exec/_ab2';
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

const LAYOUT_SIG = `(() => {
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE') continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push([
      [r.x, r.y, r.width, r.height].map((v) => (Math.round(v * 100) / 100).toFixed(2)).join(','),
      cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.lineHeight, cs.color,
      cs.backgroundColor, cs.display, cs.visibility, cs.opacity, cs.whiteSpace,
      cs.marginTop + ',' + cs.marginLeft + ',' + cs.marginBottom + ',' + cs.marginRight,
      cs.paddingTop + ',' + cs.paddingLeft, cs.borderTopWidth, cs.borderLeftWidth,
      cs.textAlign, cs.transform, cs.overflow, cs.writingMode,
    ].join(';'));
  }
  return rows.join('\\n');
})()`;

const TEXT_SIG = `(() => {
  const rg = document.createRange(); const rows = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue;
    if (n.parentElement.closest('script,style')) continue;
    rg.selectNodeContents(n);
    rows.push(n.nodeValue.trim().slice(0, 20) + ' => ' + [...rg.getClientRects()].map(r => [r.x, r.y, r.width, r.height].map(v => (Math.round(v * 100) / 100).toFixed(2)).join(',')).join(' | '));
  }
  return rows.join('\\n');
})()`;

async function prep(browser, url, vp) {
  const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1400);
  // ① 等载入定时器链（S07 seep 46×70ms）
  await page.eval(`(async () => { let n=0; while(n++<150){ if(!document.documentElement.classList.contains('loading')) return true; await new Promise(r=>setTimeout(r,100)); } return false; })()`);
  // ② 字体就绪后补一次 resize：把 .ghost 钉到状态 β（两侧同一条路径）
  await page.eval(`window.dispatchEvent(new Event('resize'))`);
  await sleep(450);
  // ③ 懒图解码
  await page.eval(`(() => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } return Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); })()`).catch(() => {});
  await sleep(650);
  // ④ 预热滚动
  await page.eval(`(async () => {
    const H=innerHeight,max=document.documentElement.scrollHeight-H,s=Math.max(1,Math.round(H*0.5));
    for(let y=0;y<=max;y+=s){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,110));}
    window.scrollTo({top:max,behavior:'instant'});await new Promise(r=>setTimeout(r,240));
    for(let y=max;y>=0;y-=s){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,110));}
    window.scrollTo({top:0,behavior:'instant'});await new Promise(r=>setTimeout(r,300));return true;})()`);
  await sleep(600);
  // ⑤ 冻结
  await page.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); if(document.getAnimations)for(const a of document.getAnimations()){try{a.finish()}catch{}} return true; })()`).catch(() => {});
  await sleep(500);
  await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(350);
  // ⑥ DOM 收敛
  await page.eval(`(async () => { const sn=()=>(document.body.getAttribute('data-ink')||'')+'|'+((document.getElementById('seep-text')||{}).textContent||'')+'|'+[...document.querySelectorAll('.ghost text')].map(t=>getComputedStyle(t).opacity).join(','); let l=null,s=0,n=0; while(n++<80){await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,70)));const x=sn();if(x===l){if(++s>=3)return true;}else{s=0;l=x;}} return false; })()`);
  await sleep(250);
  return page;
}

const srvBefore = await serve('D:/Web/style/deliverables/69-exec/_before-tree');
const srvAfter = await serve('D:/Web/style');
const urlFor = (side, dir) => (side === 'before' ? srvBefore : srvAfter)
  .url(side === 'before' ? `${dir}/index.html` : `prototypes/${dir}/index.html`);

const browser = await Browser.launch({ width: 1440, height: 900 });
const results = [];

for (const [id, dir] of CASES) {
  for (const vp of VIEWPORTS) {
    const rec = { id, vp: vp.name, w: vp.w };
    const lay = {}, tex = {}, pix = {};
    for (const [side, srv] of [['before', srvBefore], ['after', srvAfter]]) {
      let page = await prep(browser, urlFor(side, dir), vp);
      rec[side + 'DocH'] = await page.eval('document.documentElement.scrollHeight');
      lay[side] = await page.eval(LAYOUT_SIG);
      tex[side] = await page.eval(TEXT_SIG);
      await page.close();

      page = await prep(browser, urlFor(side, dir), vp);
      await page.eval(`(() => { const s=document.createElement('style'); s.textContent='img{visibility:hidden!important}'; document.head.appendChild(s); return true; })()`);
      await sleep(450);
      const masked = Buffer.from(await page.screenshot({ format: 'png', fullPage: true }), 'base64');
      writeFileSync(`${OUT}/${id}-${vp.name}-${side}-masked.png`, masked);
      const scrolls = [];
      for (let k = 0; k < 5; k++) {
        await page.eval(`window.scrollTo({top:${k * vp.h},behavior:'instant'})`);
        await sleep(320);
        const b = Buffer.from(await page.screenshot({ format: 'png' }), 'base64');
        writeFileSync(`${OUT}/${id}-${vp.name}-${side}-s${k}.png`, b);
        scrolls.push(b);
      }
      pix[side] = { masked, scrolls };
      await page.close();
    }
    rec.docHSame = rec.beforeDocH === rec.afterDocH;
    rec.layoutSame = lay.before === lay.after;
    rec.textSame = tex.before === tex.after;
    rec.maskedSame = sha(pix.before.masked) === sha(pix.after.masked);
    rec.scrollSame = pix.before.scrolls.map((b, i) => sha(b) === sha(pix.after.scrolls[i]));
    if (!rec.maskedSame) {
      const d = diffPngs(pix.before.masked, pix.after.masked);
      rec.maskedDiff = d.sizeMismatch ? { sizeMismatch: true, a: d.a, b: d.b } : { n: d.n, maxDelta: d.maxDelta, box: [d.minX, d.minY, d.maxX, d.maxY], total: d.totalPx, topRows: d.topRows };
    }
    if (!rec.layoutSame) {
      const a = lay.before.split('\n'), b = lay.after.split('\n');
      rec.layoutDiffs = [];
      for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { rec.layoutDiffs.push({ i, a: a[i], b: b[i] }); if (rec.layoutDiffs.length >= 5) break; }
    }
    if (!rec.textSame) {
      const a = tex.before.split('\n'), b = tex.after.split('\n');
      rec.textDiffs = [];
      for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { rec.textDiffs.push({ i, a: a[i], b: b[i] }); if (rec.textDiffs.length >= 5) break; }
    }
    const line = `${id} ${vp.name.padEnd(8)} docH ${rec.docHSame ? '★同' : '✗变'}(${rec.beforeDocH})  几何 ${rec.layoutSame ? '★0差' : '✗'}  文本rect ${rec.textSame ? '★0差' : '✗'}  遮罩像素 ${rec.maskedSame ? '★逐字节同' : '✗' + (rec.maskedDiff?.n ?? '尺寸不同') + 'px'}  滚动 ${rec.scrollSame.every(Boolean) ? '★5/5' : '✗' + rec.scrollSame.filter(Boolean).length + '/5'}`;
    console.log(line);
    for (const d of (rec.layoutDiffs || []).slice(0, 3)) console.log(`    几何差 #${d.i}: ${String(d.a).slice(0, 90)}  →  ${String(d.b).slice(0, 90)}`);
    for (const d of (rec.textDiffs || []).slice(0, 3)) console.log(`    文本差 #${d.i}: ${String(d.a).slice(0, 90)}  →  ${String(d.b).slice(0, 90)}`);
    results.push(rec);
  }
}
writeFileSync(`${OUT}/ab.json`, JSON.stringify(results, null, 1), 'utf8');

console.log('\n──── 分类汇总（不合并成单一通过率）────');
const A = results.filter((r) => !(r.id === 'S13' && r.vp === 'desktop'));
console.log(`A. mono 三案 × 三档（8 组；S13 的 768/390 叠加了版心改动，仍必须 0 差）：`);
for (const r of A) {
  const ok = r.layoutSame && r.textSame && r.maskedSame && r.scrollSame.every(Boolean) && r.docHSame;
  console.log(`   ${ok ? '★' : '✗'} ${r.id} ${r.vp}`);
}
console.log(`   → ${A.filter((r) => r.layoutSame && r.textSame && r.maskedSame && r.scrollSame.every(Boolean) && r.docHSame).length}/8 全同`);
for (const r of results.filter((r) => r.id === 'S13' && r.vp === 'desktop')) {
  console.log(`\nB. S13 desktop（预期变 —— 就是这次改的版心）：docH ${r.beforeDocH} → ${r.afterDocH}`);
  console.log(`   遮罩图像素：${r.maskedDiff ? (r.maskedDiff.sizeMismatch ? '尺寸不同（页高变了），改按元素级量化' : r.maskedDiff.n + 'px') : '同'}`);
}
await browser.close();
srvBefore.server.close();
srvAfter.server.close();
