// 诊断：为什么包了 <code> 之后，mono 反而把正文族报成等宽？
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style/deliverables/69-audit/exp-s13-code/wrapped2');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const s = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => s.listen(8751, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await page.goto('http://127.0.0.1:8751/index.html', { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)');
await sleep(1500);

const out = await page.eval(`(() => {
  const mctx = document.createElement('canvas').getContext('2d');
  const probeFont = (family) => { mctx.font = '40px ' + family; return { i: mctx.measureText('iiiiiiii').width, W: mctx.measureText('WWWWWWWW').width, used: mctx.font }; };
  const isMono = (family) => { mctx.font = '40px ' + family; const a = mctx.measureText('iiiiiiii').width, b = mctx.measureText('WWWWWWWW').width; return Math.abs(a - b) < 1; };
  const rows = [];
  for (const el of document.body.querySelectorAll('h1,h2,h3,p,li,dt,dd,a,span,td')) {
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    if (!direct.trim() || direct.trim().length < 3) continue;
    const cs = getComputedStyle(el);
    rows.push({ t: direct.replace(/\\s+/g,' ').trim().slice(0,18), ff: cs.fontFamily, inCode: !!el.closest('code'), isMonoFF: isMono(cs.fontFamily) });
    if (rows.length >= 12) break;
  }
  return {
    test: {
      notoQuoted: probeFont('"Noto Serif SC", serif'),
      notoBare: probeFont('Noto Serif SC, serif'),
      dmono: probeFont('"DM Mono", ui-monospace, monospace'),
    },
    codeCount: document.querySelectorAll('code').length,
    codeCSS: (() => { const c = document.querySelector('code'); return c ? getComputedStyle(c).fontFamily : null; })(),
    rows,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close(); s.close();
