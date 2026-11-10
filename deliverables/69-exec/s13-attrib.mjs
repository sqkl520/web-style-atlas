/* S13 empty-screens：逐屏归因。
 *
 * 审计的结论是「正文行长 480px 塞在 897px 栏里，右侧 516px 永久空着」。
 * 这句要先验算再采信：如果空的是**几块不同元素**共同造成的，只放宽 .clause__body
 * 就会得到"改了一个数、闸门绿了、但解释是错的"——那是量错对象。
 *
 * 做法：对每一屏统计 bare 采样点，并按 x 分桶，再看每个 bare 点最外层是哪个元素。
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
await sleep(800);

const pageH = await page.eval('document.documentElement.scrollHeight');
const n = Math.ceil(pageH / 900);
console.log(`页高 ${pageH}，${n} 屏\n`);

for (let i = 0; i < n; i++) {
  const y = i * 900;
  await page.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
  await sleep(300);
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
    let f = 0, s = 0; const bare = [];
    for (let gx = 0; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
      const x = (gx + 0.5) * (W / 24), yy = (gy + 0.5) * (H / 15); s++;
      if (textRects.some(rr => x >= rr.left - 6 && x <= rr.right + 6 && yy >= rr.top - 4 && yy <= rr.bottom + 4)) { f++; continue; }
      let el = document.elementFromPoint(x, yy); let hit = false, culprit = null;
      for (let k = 0; el && k < 6 && el !== document.body && el !== document.documentElement; k++, el = el.parentElement) {
        if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { hit = true; culprit = 'media'; break; }
        const cs2 = getComputedStyle(el);
        if (cs2.backgroundImage !== 'none') { hit = true; culprit = 'bgimg'; break; }
        const bg = cs2.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { culprit = bg !== pageBg ? 'colour' : 'pagebg'; if (bg !== pageBg) hit = true; break; }
      }
      if (hit) f++; else bare.push({ x: Math.round(x), y: Math.round(yy) });
    }
    // 文本右缘：这一屏所有文字矩形的最大右边界
    const textRight = textRects.length ? Math.max(...textRects.map(r2 => r2.right)) : 0;
    const textLeft = textRects.length ? Math.min(...textRects.map(r2 => r2.left)) : 0;
    // bare 点按 x 分桶（每 120px 一桶）
    const buckets = {};
    for (const b of bare) { const k = Math.floor(b.x / 120) * 120; buckets[k] = (buckets[k] || 0) + 1; }
    return { filled: Math.round((f / s) * 100) / 100, bareN: bare.length, textRight: Math.round(textRight), textLeft: Math.round(textLeft), buckets };
  })()`);
  const bk = Object.entries(r.buckets).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`屏 ${i + 1} (y=${y})  填充 ${r.filled}  bare ${r.bareN}/360  文字 x[${r.textLeft}..${r.textRight}]`);
  console.log(`      bare 的 x 分桶(每120px): ${bk}`);
}
await browser.close();
srv.server.close();
