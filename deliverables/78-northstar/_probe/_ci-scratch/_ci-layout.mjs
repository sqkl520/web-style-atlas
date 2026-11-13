/* 视觉骨架度量：对每份产物取「顶层区块的矩形序列」，用来判断两次产物的
 * **版面结构**是否一致（DOM 标签树不同不等于版式不同 —— 一个是 div 包 all，
 * 一个是 main/section/footer，视觉上可能一样）。
 */
import { Browser } from '../../../../prototypes/_build/vendor/cdp.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const FILES = ['S04-a', 'S04-b', 'S13-a', 'S13-b', 'S29-a', 'S29-b'];

const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    const buf = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { try { res.writeHead(404); res.end(); } catch {} }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await Browser.launch({ width: 1440, height: 900 });

const out = {};
for (const f of FILES) {
  const pg = await browser.newPage({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_ci-scratch/${f}.html`, { settleMs: 800 });
  out[f] = await pg.eval(`(() => {
    const W = document.documentElement.clientWidth;
    const H = document.documentElement.scrollHeight;
    /* 版心容器：文字量最大的、宽度 > 60% 视口的块 */
    const blocks = [...document.body.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > 40 && r.width > W * 0.5 && ['block','flex','grid','list-item','table'].includes(getComputedStyle(el).display);
    });
    /* 顶层水平带：按 y 排序、去嵌套（只留最外层） */
    const bands = [];
    for (const el of blocks) {
      const r = el.getBoundingClientRect();
      const y = Math.round(r.top + window.scrollY), h = Math.round(r.height);
      if (bands.some(b => y >= b.y - 8 && y + h <= b.y + b.h + 8 && b.y <= y)) continue;
      bands.push({ y, h, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 24) });
    }
    bands.sort((a,b)=>a.y-b.y);
    /* 字体尺度：所有可见文本块的 font-size 分布 */
    const sizes = {};
    for (const el of document.body.querySelectorAll('h1,h2,h3,h4,p,li,td,th,a,span,div')) {
      if (!el.textContent.trim()) continue;
      const fs = Math.round(parseFloat(getComputedStyle(el).fontSize));
      sizes[fs] = (sizes[fs] || 0) + 1;
    }
    const sizeKeys = Object.keys(sizes).map(Number).sort((a,b)=>a-b);
    return {
      pageW: W, pageH: H,
      bandCount: bands.length,
      bands: bands.slice(0, 16).map(b => (b.y/100).toFixed(1) + 'h' + (b.h/100).toFixed(1) + ':' + b.tag + (b.cls ? '.' + b.cls.split(' ')[0] : '')),
      sizeCount: sizeKeys.length, sizes: sizeKeys,
      maxSize: Math.max(...sizeKeys), minSize: Math.min(...sizeKeys),
      sectionCount: document.body.querySelectorAll('section').length,
      articleCount: document.body.querySelectorAll('article').length,
      tableCount: document.body.querySelectorAll('table').length,
      ulCount: document.body.querySelectorAll('ul,ol').length,
      imgCount: document.body.querySelectorAll('img').length,
    };
  })()`);
  await pg.close?.();
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
