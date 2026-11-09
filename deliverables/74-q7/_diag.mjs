import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/deliverables/74-q7';
const PORT = 9608;
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'out-S07-v2.html' : p.slice(1));
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900, dsf: 2 });
await page.goto(`http://localhost:${PORT}/out-S07-v2.html`, { settleMs: 800 });

const out = await page.eval(() => {
  const badHex = [], badFont = [], bw = {};
  [...document.querySelectorAll('*')].forEach((el) => {
    const s = getComputedStyle(el);
    const cols = { color: s.color, bg: s.backgroundColor, btc: s.borderTopColor, blc: s.borderLeftColor, brc: s.borderRightColor, bbc: s.borderBottomColor };
    for (const [k, v] of Object.entries(cols)) {
      if (v === 'rgb(0, 0, 0)' ) badHex.push(el.tagName + '.' + el.className + ' ' + k);
    }
    const first = s.fontFamily.split(',')[0].replace(/"/g, '');
    if (first === 'Noto Sans SC') badFont.push(el.tagName + '.' + (el.className || '') + ' | ' + s.fontFamily);
    const w = [s.borderTopWidth, s.borderLeftWidth, s.borderRightWidth, s.borderBottomWidth];
    w.forEach((x) => { if (parseFloat(x) > 0) bw[x] = (bw[x] || 0) + 1; });
  });
  const cellCS = getComputedStyle(document.querySelector('.cell'));
  return {
    badHex, badFont: badFont.slice(0, 12), bw,
    cellBorderLeft: cellCS.borderLeftWidth,
    hairTest: (() => {
      const d = document.createElement('div');
      d.style.cssText = 'border-left:0.5px solid #000;position:absolute';
      document.body.appendChild(d);
      const w = getComputedStyle(d).borderLeftWidth;
      const r = d.getBoundingClientRect().width;
      d.remove();
      return { computed: w, layoutWidth: r };
    })(),
  };
});
console.log(JSON.stringify(out, null, 2));
await b.close(); server.close();
