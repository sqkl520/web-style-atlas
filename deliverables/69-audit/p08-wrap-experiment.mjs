// 只读审计实验（只在 deliverables 内的副本上做，不动 prototypes/）：
// 把 S13 的等宽文本包进 <code>，验证「既保留等宽设计、又过 mono 规则」是否零视觉代价。
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const SRC = 'D:/Web/style/prototypes/S13-blind-debossed-dispatch';
const BASE = 'D:/Web/style/deliverables/69-audit/exp-s13-code';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
const ORIG = join(BASE, 'orig');
const WRAP = join(BASE, 'wrapped');
cpSync(SRC, ORIG, { recursive: true });
cpSync(SRC, WRAP, { recursive: true });

// 只在这一份副本上改标记：<span class="depth|mono">…</span> → <code …>…</code>
//                              <td class="mono">…</td> → <td class="mono"><code>…</code></td>
const htmlPath = join(WRAP, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
let n1 = 0, n2 = 0;
html = html.replace(/<span([^>]*class="[^"]*(?:depth|mono)[^"]*"[^>]*)>([^<]*)<\/span>/g, (m, attrs, inner) => { n1++; return `<code${attrs}>${inner}</code>`; });
html = html.replace(/<td([^>]*class="[^"]*mono[^"]*"[^>]*)>([^<]*)<\/td>/g, (m, attrs, inner) => { n2++; return `<td${attrs}><code>${inner}</code></td>`; });
writeFileSync(htmlPath, html);
console.log(`副本里改了 ${n1} 处 span→code，${n2} 处 td 内加 code`);

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

const s1 = await serve(ORIG, 8731);
const s2 = await serve(WRAP, 8732);
const browser = await Browser.launch({ width: 1440, height: 900 });
const grab = async (port, tag) => {
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await p.goto(`http://127.0.0.1:${port}/index.html`, { timeoutMs: 30000, settleMs: 600 });
  await p.eval('document.fonts.ready.then(() => true)');
  await sleep(1600);
  const shot = await p.screenshot({ format: 'png' });
  const geo = await p.eval(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('.depth, .mono, code')) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      out.push({ t: (el.innerText || '').trim().slice(0, 12), x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, ff: cs.fontFamily, fs: cs.fontSize, col: cs.color });
    }
    return { n: out.length, hash: document.body.getBoundingClientRect().height, items: out.slice(0, 40) };
  })()`);
  await p.close();
  return { tag, sha: createHash('sha256').update(shot).digest('hex'), bytes: shot.length, geo, shot };
};
const a = await grab(8731, 'orig');
const b = await grab(8732, 'wrapped');
writeFileSync(join(BASE, 'orig-1440.png'), a.shot);
writeFileSync(join(BASE, 'wrapped-1440.png'), b.shot);
await browser.close(); s1.close(); s2.close();

console.log(`\n原始 PNG sha256 ${a.sha}  (${a.bytes} B)`);
console.log(`包 code 后      ${b.sha}  (${b.bytes} B)`);
console.log(a.sha === b.sha ? '★ 1440 首屏像素逐字节相同' : '✗ 有像素差异');
writeFileSync(join(BASE, 'compare.json'), JSON.stringify({ a: { sha: a.sha, geo: a.geo }, b: { sha: b.sha, geo: b.geo } }, null, 1));
// 逐元素几何比对
const diffs = [];
for (let i = 0; i < Math.min(a.geo.items.length, b.geo.items.length); i++) {
  const x = a.geo.items[i], y = b.geo.items[i];
  if (JSON.stringify(x) !== JSON.stringify(y)) diffs.push({ i, a: x, b: y });
}
console.log(`元素数 ${a.geo.n} → ${b.geo.n}；几何/字体差异 ${diffs.length} 处`);
if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 6), null, 1));
