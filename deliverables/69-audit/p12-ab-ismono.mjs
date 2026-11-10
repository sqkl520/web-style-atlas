// A/B：原始 S13 与"包 code"副本，各自跑 probe.mjs 的 isMono 原判据 + DOM 真实字宽作对照
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const PAGES = [
  ['orig', 'D:/Web/style/prototypes/S13-blind-debossed-dispatch', 8771],
  ['wrapped2', 'D:/Web/style/deliverables/69-audit/exp-s13-code/wrapped2', 8772],
];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const servers = [];
for (const [, root0, port] of PAGES) {
  const root = resolve(root0);
  const s = createServer((req, res) => {
    try {
      let f = resolve(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (f !== root && !f.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((r) => s.listen(port, '127.0.0.1', r));
  servers.push(s);
}
const browser = await Browser.launch({ width: 1440, height: 900 });
for (const [tag, , port] of PAGES) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { timeoutMs: 30000, settleMs: 600 });
  await page.eval('document.fonts.ready.then(() => true)');
  await sleep(1600);
  const r = await page.eval(`(() => {
    const mctx = document.createElement('canvas').getContext('2d');
    const probe = (family) => { mctx.font = '40px ' + family; const a = mctx.measureText('iiiiiiii').width, b = mctx.measureText('WWWWWWWW').width; return { i: a, W: b, mono: Math.abs(a - b) < 1 }; };
    // DOM 真值：实测 i 与 W 的渲染宽度
    const spanW = (ff, ch) => { const sp = document.createElement('span'); sp.textContent = ch.repeat(8); sp.style.cssText = 'font-family:' + ff + ';font-size:40px;white-space:pre;position:absolute;left:-9999px;top:0'; document.body.appendChild(sp); const w = sp.getBoundingClientRect().width; sp.remove(); return Math.round(w); };
    const truth = (ff) => { const a = spanW(ff, 'i'), b = spanW(ff, 'W'); return { i: a, W: b, mono: a === b }; };
    const fams = [...new Set([...document.querySelectorAll('body *')].map((e) => getComputedStyle(e).fontFamily))].slice(0, 6);
    const codeEl = document.querySelector('code');
    return {
      fontsStatus: [...document.fonts].map((f) => f.family + ':' + f.status),
      checks: {
        noto: document.fonts.check('40px "Noto Serif SC"'),
        dmono: document.fonts.check('40px "DM Mono"'),
        garamond: document.fonts.check('40px "EB Garamond"'),
      },
      perFamily: fams.map((f) => ({ family: f, canvas: probe(f), domTruth: truth(f) })),
      hasCode: !!codeEl,
      codeFF: codeEl ? getComputedStyle(codeEl).fontFamily : null,
    };
  })()`);
  console.log(`\n########## ${tag}`);
  console.log(JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
for (const s of servers) s.close();
