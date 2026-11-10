// 核实：机械判据能否发现「布局整体崩坏」
// 用端到端验证 Agent 的 S28 第一版场景复现：.index 漏了 grid-column
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8550, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

for (const id of ['S20', 'S21', 'S28']) {
  await page.goto(`http://127.0.0.1:8550/deliverables/69-test/${id}/index.html`, { settleMs: 1800 });

  // 基线：测量「机械判据能看到的」+「整页结构特征」
  const base = await page.eval(`(() => {
    const o = {};
    // 机械判据关心的那些
    o.hex = (() => { const s=new Set(); for(const el of document.querySelectorAll('*')){ const c=getComputedStyle(el); for(const k of ['color','backgroundColor','borderTopColor']) { const v=c[k]; if(v&&!/rgba\\(0, 0, 0, 0\\)/.test(v)) s.add(v); } } return s.size; })();
    o.radii = [...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).borderTopLeftRadius!=='0px').length;
    o.outerShadow = [...document.querySelectorAll('*')].filter(e=>{const v=getComputedStyle(e).boxShadow; return v&&v!=='none'&&!v.includes('inset');}).length;
    o.docH = document.documentElement.scrollHeight;
    o.viewportH = window.innerHeight;
    o.screens = +(o.docH/window.innerHeight).toFixed(2);
    // 「布局崩坏」信号：单字竖排（宽度极小但高度很大）
    const narrow = [...document.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      const txt = (el.textContent||'').trim();
      return txt.length > 8 && r.width > 0 && r.width < 40 && r.height > 200;
    });
    o.narrowColumns = narrow.length;
    // 元素高度分布
    const hs = [...document.querySelectorAll('*')].map(el=>el.getBoundingClientRect().height).filter(h=>h>0).sort((a,b)=>a-b);
    o.medianH = hs[Math.floor(hs.length/2)] || 0;
    o.maxH = hs[hs.length-1] || 0;
    return o;
  })()`);

  // 注入「漏 grid-column」的复现：把某个 grid 容器里的子元素 grid-column 清空
  const broken = await page.eval(`(() => {
    // 找一个用 grid-template-columns 多列且有子元素的容器
    const cands = [...document.querySelectorAll('*')].filter(el => {
      const c = getComputedStyle(el);
      return /repeat|px/.test(c.gridTemplateColumns) && c.gridTemplateColumns.split(' ').length >= 3 && el.children.length >= 2;
    });
    if (!cands.length) return { ok: false, reason: 'no grid container' };
    const host = cands[0];
    // 清空所有子元素的 grid-column / grid-row
    for (const ch of host.children) { ch.style.gridColumn = 'auto'; ch.style.gridRow = 'auto'; }
    return { ok: true, host: host.tagName.toLowerCase() + '.' + (host.className||'').toString().slice(0,24), children: host.children.length, cols: getComputedStyle(host).gridTemplateColumns };
  })()`);
  await new Promise(r => setTimeout(r, 400));

  const after = await page.eval(`(() => {
    const o = {};
    o.hex = (() => { const s=new Set(); for(const el of document.querySelectorAll('*')){ const c=getComputedStyle(el); for(const k of ['color','backgroundColor','borderTopColor']) { const v=c[k]; if(v&&!/rgba\\(0, 0, 0, 0\\)/.test(v)) s.add(v); } } return s.size; })();
    o.radii = [...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).borderTopLeftRadius!=='0px').length;
    o.outerShadow = [...document.querySelectorAll('*')].filter(e=>{const v=getComputedStyle(e).boxShadow; return v&&v!=='none'&&!v.includes('inset');}).length;
    o.docH = document.documentElement.scrollHeight;
    o.viewportH = window.innerHeight;
    o.screens = +(o.docH/window.innerHeight).toFixed(2);
    const narrow = [...document.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      const txt = (el.textContent||'').trim();
      return txt.length > 8 && r.width > 0 && r.width < 40 && r.height > 200;
    });
    o.narrowColumns = narrow.length;
    const hs = [...document.querySelectorAll('*')].map(el=>el.getBoundingClientRect().height).filter(h=>h>0).sort((a,b)=>a-b);
    o.medianH = hs[Math.floor(hs.length/2)] || 0;
    o.maxH = hs[hs.length-1] || 0;
    return o;
  })()`);

  console.log(`\n=== ${id} ===`);
  console.log(`  破坏点: ${broken.ok ? broken.host + ' (${broken.children} 子元素, ${broken.cols})' : broken.reason}`);
  console.log(`  机械判据能看到的: hex ${base.hex}→${after.hex}  圆角 ${base.radii}→${after.radii}  外影 ${base.outerShadow}→${after.outerShadow}`);
  console.log(`  页高: ${base.docH}→${after.docH} (${base.screens}→${after.screens} 屏)`);
  console.log(`  ★ 崩坏信号 narrowColumns: ${base.narrowColumns}→${after.narrowColumns}   中位元素高 ${base.medianH}→${after.medianH}  最大 ${base.maxH}→${after.maxH}`);
  const detected = base.hex !== after.hex || base.radii !== after.radii || base.outerShadow !== after.outerShadow;
  const detected2 = Math.abs(base.screens - after.screens) > 0.15;
  const detected3 = after.narrowColumns > base.narrowColumns;
  console.log(`  → 机械判据(色/圆角/影) 察觉: ${detected ? '是' : '否'}   页高察觉: ${detected2 ? '是' : '否'}   崩坏信号察觉: ${detected3 ? '是' : '否'}`);
}
await browser.close();
server.close();
