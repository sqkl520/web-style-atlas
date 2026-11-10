// 用 CDP 实测：可见文本按字号分布，看 13px 是否真的成了"正文主导字号"
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
await new Promise(r => server.listen(8411, '127.0.0.1', r));

const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport({ width: w, height: h, mobile: w < 500 });
  await page.goto('http://127.0.0.1:8411/prototypes/_selection/index.html', { settleMs: 1200 });
  const out = await page.eval(`(() => {
    const res = {};
    // 按字号统计"可见正文文本"的字符数（跳过 script/style/折叠隐藏内容）
    const bySize = {};
    let totalChars = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    const seen = new Set();
    while ((node = walker.nextNode())) {
      const t = node.nodeValue;
      if (!t || !t.trim()) continue;
      const el = node.parentElement;
      if (!el) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // 检查祖先链是否可见
      let vis = true;
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        if (pcs.display === 'none' || pcs.visibility === 'hidden') { vis = false; break; }
        if (p.tagName.toLowerCase() === 'details' && !p.open) {
          // 只有 summary 里的文字可见
          if (!p.querySelector('summary')?.contains(el)) { vis = false; break; }
        }
      }
      if (!vis) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (cs.position === 'absolute' && (r.width <= 2 || r.height <= 2)) continue;
      const fs = Math.round(parseFloat(cs.fontSize));
      const n = t.trim().length;
      bySize[fs] = (bySize[fs] || 0) + n;
      totalChars += n;
    }
    res.bySize = bySize;
    res.totalChars = totalChars;
    // 判"正文"：取字符数最多的字号
    const sorted = Object.entries(bySize).sort((a, b) => b[1] - a[1]);
    res.dominant = sorted[0] ? { size: +sorted[0][0], chars: sorted[0][1], share: +(sorted[0][1] / totalChars * 100).toFixed(1) } : null;
    res.top5 = sorted.slice(0, 5).map(([s, c]) => ({ size: +s, chars: c, share: +(c / totalChars * 100).toFixed(1) }));
    // 状态：必填项与折叠状态
    res.folds = [...document.querySelectorAll('details')].map(d => ({ cls: d.className, open: d.open }));
    res.pics = [...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return r.width >= 40 && r.height >= 40; }).length;
    return res;
  })()`);
  console.log(`\n=== ${w}x${h} ===`);
  console.log('  主导字号:', JSON.stringify(out.dominant));
  console.log('  top5:', JSON.stringify(out.top5));
  console.log('  可见总字符:', out.totalChars, ' 厨房大图:', out.pics);
  console.log('  折叠块:', JSON.stringify(out.folds));
}
await browser.close();
server.close();
