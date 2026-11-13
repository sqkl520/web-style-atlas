/* 最终裁定：区分「提示词约束的结构」与「不受约束的量」。
 * 1) 正文可见字数（内容量 —— 提示词明说由用户决定）
 * 2) 页高 / 字数 的密度比（归一化后比较密度，而不是绝对值）
 * 3) 48px 以上的水平分区数（版式骨架）
 * 4) 主栏宽度（提示词约束的版心）
 */
import { Browser } from '../../../../prototypes/_build/vendor/cdp.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const FILES = ['S04-a', 'S04-b', 'S13-a', 'S13-b', 'S29-a', 'S29-b', 'S08-a', 'S08-b', 'S15-a', 'S15-b'];

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
    const H = de.scrollHeight;
    const W = de.clientWidth;
    const text = (document.body.innerText || '').replace(/\\s+/g, '');
    /* 主栏：承载最多文字宽度的连续 x 区间（只在正文叶子上统计，每字符只计一次） */
    const leaves = [];
    for (const el of document.body.querySelectorAll('p,li,td,th,dd,dt,figcaption,blockquote')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'absolute') continue;
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.replace(/\\s+/g, '')).join('');
      if (own.length < 6) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 30 || r.height < 8) continue;
      leaves.push({ l: Math.round(r.left), r: Math.round(r.right), n: own.length });
    }
    /* 每 10px 一档，统计「这一档被多少个字符跨过」（按字符数加权） */
    const col = {};
    for (const x of leaves) {
      for (let k = Math.floor(x.l / 10) * 10; k < x.r; k += 10) col[k] = (col[k] || 0) + x.n / Math.max(1, (x.r - x.l) / 10);
    }
    const ks = Object.keys(col).map(Number).sort((a, b) => a - b);
    const peak = ks.length ? Math.max(...ks.map(k => col[k])) : 0;
    /* 主栏 = 覆盖率 >= 峰值 60% 的最长连续段 */
    let run = [], bestRun = [];
    for (const k of ks) {
      if (col[k] >= peak * 0.6) run.push(k); else { if (run.length > bestRun.length) bestRun = run; run = []; }
    }
    if (run.length > bestRun.length) bestRun = run;
    const mainL = bestRun.length ? bestRun[0] : 0;
    const mainR = bestRun.length ? bestRun[bestRun.length - 1] + 10 : 0;
    /* 水平分区数：把有文字的块按 y 聚集，相邻簇间距 > 48px 就断开 */
    const ys = [...document.body.querySelectorAll('p,li,td,h1,h2,h3,h4,figcaption')]
      .filter(el => el.textContent.replace(/\\s+/g, '').length > 6)
      .map(el => { const r = el.getBoundingClientRect(); return { t: r.top + scrollY, b: r.bottom + scrollY }; })
      .sort((a, b) => a.t - b.t);
    let bands = 0, lastB = -1e9;
    for (const y of ys) { if (y.t - lastB > 48) bands++; lastB = Math.max(lastB, y.b); }
    return {
      pageH: H,
      textChars: text.length,
      densityPer1000px: +(text.length / (H / 1000)).toFixed(1),
      mainCol: mainL + '→' + mainR,
      mainColWidth: mainR - mainL,
      hBands: bands,
      textPerBand: +(text.length / bands).toFixed(0),
    };
  })()`);
  await pg.close?.();
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
