/* 精确核对 S13 / S29 的「版式骨架」：不是找一个最小 left，
 * 而是量「正文主栏的左右边界」——按行统计文字密度，取承载最多文字的 x 区间。
 */
import { Browser } from '../../../../prototypes/_build/vendor/cdp.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const FILES = ['S04-a', 'S04-b', 'S15-a', 'S15-b'];

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
    const W = document.documentElement.clientWidth;
    /* 只统计「直接承载文字」的元素，且要求它自己有非空白文本节点 */
    const leaves = [];
    for (const el of document.body.querySelectorAll('p,li,td,th,h1,h2,h3,h4,dt,dd,figcaption')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'absolute') continue;
      const direct = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 0)
        .reduce((a, n) => a + n.textContent.trim().length, 0);
      if (direct < 4) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 8) continue;
      leaves.push({ l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top + scrollY), h: Math.round(r.height), n: direct });
    }
    /* 按 20px 分桶，统计每桶承载的文字量 → 找主栏 */
    const bucket = {};
    for (const x of leaves) for (let k = Math.floor(x.l / 20) * 20; k < x.r; k += 20) bucket[k] = (bucket[k] || 0) + x.n;
    const xs = Object.keys(bucket).map(Number).sort((a, b) => a - b);
    const total = Object.values(bucket).reduce((a, b) => a + b, 0);
    /* 主栏 = 连续区间，其累计文字量 >= 70% */
    let best = { l: 0, r: W };
    let acc = 0, start = xs[0];
    for (let i = 0; i < xs.length; i++) {
      acc += bucket[xs[i]];
      if (acc / total >= 0.7) { best = { l: start, r: xs[i] + 20 }; break; }
      if (i + 1 < xs.length && xs[i + 1] - xs[i] > 40) { acc = 0; start = xs[i + 1]; }
    }
    /* 段落左边界的最常见值（众数） */
    const leftCount = {};
    for (const x of leaves) leftCount[x.l] = (leftCount[x.l] || 0) + 1;
    const modeLeft = Object.entries(leftCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + '×' + v);
    return {
      pageH: document.documentElement.scrollHeight,
      textLeaves: leaves.length,
      textTotalChars: total,
      mainColumn: best.l + '→' + best.r + '  (' + (best.r - best.l) + 'px)',
      modeLeft,
      minLeft: Math.min(...leaves.map(x => x.l)),
      maxRight: Math.max(...leaves.map(x => x.r)),
    };
  })()`);
  await pg.close?.();
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
