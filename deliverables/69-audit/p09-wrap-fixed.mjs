// 实验 2：包 <code> 之后补一条 code{font-family:inherit}，再比对像素。
// 目的：判断「设计上必需的等宽」能否零视觉代价地通过 mono 规则。
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const SRC = 'D:/Web/style/prototypes/S13-blind-debossed-dispatch';
const BASE = 'D:/Web/style/deliverables/69-audit/exp-s13-code';
const ORIG = join(BASE, 'orig');
const WRAP = join(BASE, 'wrapped2');
rmSync(WRAP, { recursive: true, force: true });
mkdirSync(WRAP, { recursive: true });
cpSync(SRC, WRAP, { recursive: true });

const htmlPath = join(WRAP, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
let n = 0;
html = html.replace(/<span([^>]*class="[^"]*(?:depth|mono)[^"]*"[^>]*)>([^<]*)<\/span>/g, (m, attrs, inner) => { n++; return `<code${attrs}>${inner}</code>`; });
html = html.replace(/<td([^>]*class="[^"]*mono[^"]*"[^>]*)>([^<]*)<\/td>/g, (m, attrs, inner) => { n++; return `<td${attrs}><code>${inner}</code></td>`; });
writeFileSync(htmlPath, html);
// 关键补丁：<code> 的 UA 样式 font-family:monospace 会盖掉继承，必须显式 inherit
appendFileSync(join(WRAP, 'style.css'), `\n/* 审计实验：让 <code> 保持原字体，避免 UA 的 monospace 兜底 */\ncode { font-family: inherit; }\n`);
console.log(`改了 ${n} 处标记 + 追加 1 条 CSS`);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const serve = (root, port) => new Promise((r) => {
  const s = createServer((req, res) => {
    try {
      let f = resolve(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (f !== root && !f.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  s.listen(port, '127.0.0.1', () => r(s));
});
const s1 = await serve(ORIG, 8741); const s2 = await serve(WRAP, 8742);
const browser = await Browser.launch({ width: 1440, height: 900 });

const grab = async (port) => {
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await p.goto(`http://127.0.0.1:${port}/index.html`, { timeoutMs: 30000, settleMs: 600 });
  await p.eval('document.fonts.ready.then(() => true)');
  await sleep(1600);
  const shots = {};
  for (const y of [0, 900, 1800, 2700, 3600]) {
    await p.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
    await sleep(500);
    const b = await p.screenshot({ format: 'png' });
    shots[y] = createHash('sha256').update(b).digest('hex');
  }
  const fonts = await p.eval(`(() => { const s = new Set(); for (const el of document.querySelectorAll('.depth, .mono, code')) s.add(getComputedStyle(el).fontFamily); return [...s]; })()`);
  await p.close();
  return { shots, fonts };
};
const a = await grab(8741); const b = await grab(8742);
await browser.close(); s1.close(); s2.close();
console.log('\nscrollY   原始    包 code + inherit   相同?');
for (const y of Object.keys(a.shots)) console.log(`${String(y).padEnd(9)} ${a.shots[y].slice(0, 8)} ${b.shots[y].slice(0, 8)}   ${a.shots[y] === b.shots[y] ? '★ 逐字节相同' : '✗ 不同'}`);
console.log('\n原始用到的 fontFamily 集合:', JSON.stringify(a.fonts));
console.log('改后用到的 fontFamily 集合:', JSON.stringify(b.fonts));
