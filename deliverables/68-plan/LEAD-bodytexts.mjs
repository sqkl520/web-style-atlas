// 复刻 probe.mjs 的 bodyTexts 判据，找出 _selection 里哪些 ≥60 字符的文本决定了 body=13px
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
await new Promise(r => server.listen(8413, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  await page.setViewport({ width: w, height: h, mobile: w < 500 });
  await page.goto('http://127.0.0.1:8413/prototypes/_selection/index.html', { settleMs: 1500 });
  const out = await page.eval(`(() => {
    // 复刻 probe.mjs 的 texts 收集（近似）：可见文本节点
    const texts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const raw = node.nodeValue;
      if (!raw || !raw.trim()) continue;
      const el = node.parentElement;
      if (!el) continue;
      const tag = el.tagName.toLowerCase();
      if (/^(script|style|noscript|svg)$/.test(tag)) continue;
      const cs = getComputedStyle(el);
      let vis = cs.display !== 'none' && cs.visibility !== 'hidden';
      if (vis) for (let p = el; p && p !== document.body; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        if (pcs.display === 'none' || pcs.visibility === 'hidden') { vis = false; break; }
        if (p.tagName.toLowerCase() === 'details' && !p.open && !(p.querySelector('summary') && p.querySelector('summary').contains(el))) { vis = false; break; }
      }
      if (!vis) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const chars = raw.trim().length;
      texts.push({ size: Math.round(parseFloat(cs.fontSize)), chars, text: raw.trim().slice(0, 70), cls: (el.className || '').toString().slice(0, 30), tag });
    }
    // probe.mjs 判据
    const bodyTexts = texts.filter(t => t.size >= 10 && t.size <= 24 && t.chars >= 60);
    const by = {};
    for (const t of bodyTexts) { const k = t.size; by[k] = (by[k] || 0) + t.chars; }
    const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
    return {
      allTexts: texts.length,
      bodyTextsCount: bodyTexts.length,
      bySize: sorted.map(([s, c]) => ({ size: +s, chars: c })),
      dominant: sorted[0] ? { size: +sorted[0][0], chars: +sorted[0][1] } : null,
      sample13: bodyTexts.filter(t => t.size === 13).slice(0, 10),
      sample16: bodyTexts.filter(t => t.size === 16).slice(0, 6),
    };
  })()`);
  console.log(`\n=== ${w}x${h} ===`);
  console.log(`  可见文本节点 ${out.allTexts} 个，其中 chars>=60 的 ${out.bodyTextsCount} 个`);
  console.log(`  按字号累计字符（仅 chars>=60 的节点）: ${JSON.stringify(out.bySize)}`);
  console.log(`  主导: ${JSON.stringify(out.dominant)}`);
  console.log(`  --- 13px 且 >=60 字符的样本 ---`);
  for (const t of out.sample13) console.log(`    [${t.tag}.${t.cls}] ${t.chars}字: ${t.text}`);
  console.log(`  --- 16px 且 >=60 字符的样本 ---`);
  for (const t of out.sample16) console.log(`    [${t.tag}.${t.cls}] ${t.chars}字: ${t.text}`);
}
await browser.close();
server.close();
