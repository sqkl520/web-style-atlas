// 决定性实验（修正版）：字体必须真的加载，否则 isMono 会把回退字体误判成等宽。
// 做法：把 _fonts 复制到实验目录，使 ../_fonts 在 orig 与 wrapped 两侧解析一致。
// 结论要看两件事：① 像素是否相同 ② 闸门 mono 是否消失
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, appendFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const SRC = 'D:/Web/style/prototypes/S13-blind-debossed-dispatch';
const FONTS = 'D:/Web/style/prototypes/_fonts';
const BASE = resolve('D:/Web/style/deliverables/69-audit/exp2');
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
if (!existsSync(join(BASE, '_fonts'))) cpSync(FONTS, join(BASE, '_fonts'), { recursive: true });
const ORIG = join(BASE, 'orig');
const WRAP = join(BASE, 'wrapped');
cpSync(SRC, ORIG, { recursive: true });
cpSync(SRC, WRAP, { recursive: true });

let html = readFileSync(join(WRAP, 'index.html'), 'utf8');
let n = 0;
html = html.replace(/<span([^>]*class="[^"]*(?:depth|mono)[^"]*"[^>]*)>([^<]*)<\/span>/g, (m, attrs, inner) => { n++; return `<code${attrs}>${inner}</code>`; });
html = html.replace(/<td([^>]*class="[^"]*mono[^"]*"[^>]*)>([^<]*)<\/td>/g, (m, attrs, inner) => { n++; return `<td${attrs}><code>${inner}</code></td>`; });
writeFileSync(join(WRAP, 'index.html'), html);
appendFileSync(join(WRAP, 'style.css'), `\ncode { font-family: inherit; }\n`);
console.log(`wrapped: 改 ${n} 处标记 + 1 条 CSS`);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(BASE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(BASE + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8831, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });

const grab = async (variant) => {
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await p.goto(`http://127.0.0.1:8831/${variant}/index.html`, { timeoutMs: 30000, settleMs: 600 });
  await p.eval('document.fonts.ready.then(() => true)');
  await sleep(1800);
  const fontsOk = await p.eval(`[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)`);
  const shots = {};
  for (const y of [0, 900, 1800, 2700, 3600]) {
    await p.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
    await sleep(600);
    const b = await p.screenshot({ format: 'png' });
    shots[y] = createHash('sha256').update(b).digest('hex');
  }
  const mono = await p.eval(`(() => {
    const mctx = document.createElement('canvas').getContext('2d');
    const isMono = (family) => { mctx.font = '40px ' + family; return Math.abs(mctx.measureText('iiiiiiii').width - mctx.measureText('WWWWWWWW').width) < 1; };
    let prose = 0, inCode = 0; const fams = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (!isMono(cs.fontFamily)) continue;
      let d = ''; for (const nd of el.childNodes) if (nd.nodeType === 3) d += nd.nodeValue;
      if (!d.trim()) continue;
      fams.add(cs.fontFamily);
      if (el.closest('pre,code,kbd,samp,textarea')) inCode += d.trim().length; else prose += d.trim().length;
    }
    return { prose, inCode, fams: [...fams] };
  })()`);
  await p.close();
  return { variant, loadedFamilies: [...new Set(fontsOk)], shots, mono };
};
const a = await grab('orig');
const b = await grab('wrapped');
await browser.close(); server.close();

console.log(`\norig 加载字体:    ${JSON.stringify(a.loadedFamilies)}`);
console.log(`wrapped 加载字体: ${JSON.stringify(b.loadedFamilies)}`);
console.log(`\norig    mono: prose=${a.mono.prose} inCode=${a.mono.inCode} fams=${JSON.stringify(a.mono.fams)}`);
console.log(`wrapped mono: prose=${b.mono.prose} inCode=${b.mono.inCode} fams=${JSON.stringify(b.mono.fams)}`);
console.log('\nscrollY   orig      wrapped   像素');
for (const y of Object.keys(a.shots)) console.log(`${String(y).padEnd(9)} ${a.shots[y].slice(0, 8)}  ${b.shots[y].slice(0, 8)}  ${a.shots[y] === b.shots[y] ? '★ 逐字节相同' : '✗ 不同'}`);
writeFileSync('D:/Web/style/deliverables/69-audit/exp2-result.json', JSON.stringify({ a, b }, null, 1));
