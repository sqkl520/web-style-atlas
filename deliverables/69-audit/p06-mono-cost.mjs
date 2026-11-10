// 只读探针：S07 / S21 的等宽挂载点逐条清点（判定"改标记 vs 改字体"的成本）
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const CASES = [
  ['S07', 'S07-slate-ink-contents', 8721],
  ['S21', 'S21-interlocking-release-book', 8722],
];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

const browser = await Browser.launch({ width: 1440, height: 900 });
const result = {};
for (const [id, dir, port] of CASES) {
  const ROOT = resolve(`D:/Web/style/prototypes/${dir}`);
  const server = createServer((req, res) => {
    try {
      let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { timeoutMs: 30000, settleMs: 600 });
  await page.eval('document.fonts.ready.then(() => true)');
  await sleep(1200);
  result[id] = await page.eval(`(() => {
    const isMono = (family) => { const c = document.createElement('canvas').getContext('2d'); c.font = '40px ' + family; return Math.abs(c.measureText('iiiiiiii').width - c.measureText('WWWWWWWW').width) < 1; };
    let total = 0, inCode = 0; const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (!isMono(cs.fontFamily.split(',')[0].trim())) continue;
      let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
      if (!direct.trim()) continue;
      total += direct.trim().length;
      const code = !!el.closest('pre, code, kbd, samp, textarea');
      if (code) { inCode += direct.trim().length; continue; }
      out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 28), text: direct.replace(/\\s+/g, ' ').trim().slice(0, 24), chars: direct.trim().length });
    }
    return { totalMonoChars: total, inCodeChars: inCode, proseChars: total - inCode, count: out.length, sample: out.slice(0, 14) };
  })()`);
  await page.close();
  server.close();
}
await browser.close();
writeFileSync('D:/Web/style/deliverables/69-audit/mono-probe.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
