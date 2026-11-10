// 归因 2：S13 每屏的空白到底来自哪儿
//   a) 正文行宽 vs 栏宽（32 汉字 = 480px，而 1–11 栏 ≈ 1020px）
//   b) 每屏里各 section 的包围盒与文字块数量
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const REPO = resolve('D:/Web/style');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(REPO + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8801, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await page.goto('http://127.0.0.1:8801/prototypes/S13-blind-debossed-dispatch/index.html', { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)');
await sleep(1800);

const out = await page.eval(`(() => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), top: Math.round(r.top + scrollY), h: Math.round(r.height) }; };
  const para = document.querySelector('.clause p');
  const pr = para ? para.getBoundingClientRect() : null;
  const pcs = para ? getComputedStyle(para) : null;
  // 最长一行正文字符数（用 Range 逐行量）
  const lineWidths = (() => { const el = document.querySelector('.clause p'); if (!el) return null; const rg = document.createRange(); rg.selectNodeContents(el); const rects = [...rg.getClientRects()].map((r) => Math.round(r.width)); return { max: Math.max(...rects), min: Math.min(...rects), lines: rects.length, size: parseFloat(getComputedStyle(el).fontSize) }; })();
  const sections = ['.letterhead', '.clauses', '.signature', '.annex', '.plates', '.levels', '.log', '.colophon'].map((s) => ({ sel: s, box: box(s) }));
  return {
    page: { height: document.documentElement.scrollHeight, vh: innerHeight },
    clausePara: pr ? { x: Math.round(pr.x), w: Math.round(pr.width), maxWidth: pcs.maxWidth, fontSize: pcs.fontSize, lineHeight: pcs.lineHeight } : null,
    lineWidths,
    cols: box('.clauses'),
    sections,
    charsPerLine: lineWidths ? Math.round(lineWidths.max / (lineWidths.size * 1.0)) : null,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
