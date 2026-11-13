/* 页面级骨架：不靠 measure 的 gridSel（它在 S29 选了不同元素），
 * 直接量「页面框架」：左缘装订带宽度、内容区左偏移、版心最大宽度、
 * 以及每个 <section>/<article> 的高度序列，归一化为占页高比例。
 */
import { Browser } from '../../../../prototypes/_build/vendor/cdp.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const FILES = ['S04-a','S04-b','S13-a','S13-b','S29-a','S29-b','S08-a','S08-b','S15-a','S15-b'];

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
  await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_ci-scratch/${f}.html`, { settleMs: 700 });
  out[f] = await pg.eval(`(() => {
    const de = document.documentElement;
    const H = de.scrollHeight, W = de.clientWidth;
    /* 内容区左缘：所有正文段落里最小的 left（排除 fixed 装饰） */
    let minLeft = W;
    for (const el of document.body.querySelectorAll('p,li,td,h1,h2,h3,section,article,main')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 80 || r.height < 10) continue;
      if (el.textContent.trim().length < 20) continue;
      minLeft = Math.min(minLeft, Math.round(r.left));
    }
    /* 版心最大宽度 */
    let maxW = 0;
    for (const el of document.body.querySelectorAll('main,section,article,div')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.height < 100) continue;
      maxW = Math.max(maxW, Math.round(r.width));
    }
    /* 视觉区块序列：与上一区块间隙 > 40px 的段落群，按 y 归并 */
    const items = [...document.body.querySelectorAll('p,li,h1,h2,h3,td,figcaption')]
      .filter(el => el.textContent.trim().length > 4)
      .map(el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; })
      .sort((a,b) => a.top - b.top);
    let gaps = 0, prevBottom = -1e9;
    const segTops = [];
    for (const it of items) {
      if (it.top - prevBottom > 40) { gaps++; segTops.push(Math.round(it.top / H * 100)); }
      prevBottom = Math.max(prevBottom, it.top + it.h);
    }
    return {
      pageH: H,
      contentLeft: minLeft,
      contentWidth: maxW,
      segCount: gaps,
      segTopsPct: segTops.slice(0, 14),
      hrCount: document.body.querySelectorAll('hr').length,
      borderTopCount: [...document.body.querySelectorAll('*')].filter(e => { const b = getComputedStyle(e).borderTopWidth; return parseFloat(b) > 0; }).length,
    };
  })()`);
  await pg.close?.();
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
