// 施工用诊断脚本（不是交付物）：按 inspect.mjs 的同一套 24×15 采样，逐屏输出填充率与点位图。
//   node prototypes/S13-blind-debossed-dispatch/_fillmap.mjs [1440]
// 用法与 render-scheme.mjs 一致：cwd 必须是 D:\Web\style（否则 ../_fonts/ 403）。
import { existsSync, statSync, createReadStream } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const W = Number(process.argv[2] || 1440);
const HEIGHT = { 1440: 900, 768: 1024, 390: 844 };
const H = HEIGHT[W] || 900;
const FILE = join(ROOT, 'prototypes/S13-blind-debossed-dispatch/index.html');
if (!existsSync(FILE)) { console.error('no index.html'); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/S13-blind-debossed-dispatch/index.html`;

const PROBE = () => {
  const VW = innerWidth, VH = innerHeight, sy = scrollY;
  const opaque = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
  const pageBg = [document.body, document.documentElement].map((e) => getComputedStyle(e).backgroundColor).find(opaque) || 'rgb(255,255,255)';
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue; const pcs = getComputedStyle(n.parentElement); if (pcs.visibility === 'hidden' || +pcs.opacity < 0.2) continue;
    rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.bottom > 0 && r.top < VH && r.width > 1) textRects.push(r);
  }
  const map = []; let filled = 0, samples = 0; const cat = { T: 0, M: 0, B: 0, C: 0, '.': 0 };
  for (let gy = 0; gy < 15; gy++) {
    let row = '';
    for (let gx = 0; gx < 24; gx++) {
      const x = (gx + 0.5) * (VW / 24), y = (gy + 0.5) * (VH / 15); samples++;
      if (textRects.some((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) { filled++; cat.T++; row += 'T'; continue; }
      let el = document.elementFromPoint(x, y); let mark = '.';
      for (let i = 0; el && i < 6 && el !== document.body && el !== document.documentElement; i++, el = el.parentElement) {
        if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { filled++; mark = 'M'; break; }
        const cs = getComputedStyle(el);
        if (cs.backgroundImage !== 'none') { filled++; mark = 'B'; break; }
        const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) { filled++; mark = 'C'; break; } }
      }
      cat[mark]++; row += mark;
    }
    map.push(row);
  }
  // 本屏可见的块（doc 绝对 y），用来判断哪一段落在哪一屏
  const blocks = [];
  for (const el of document.querySelectorAll('main > *, header > *, footer, .letterhead__top > *, .plates__grid > *, .specimen > *, .clauses > *')) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > VH || r.height < 1) continue;
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    blocks.push(`${el.tagName.toLowerCase()}${cls} [${Math.round(r.top + sy)}..${Math.round(r.bottom + sy)}]`);
  }
  return { filled: Math.round((filled / samples) * 100) / 100, sy: Math.round(sy), cat, map, blocks };
};

const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: W, height: H, dsf: 1 });
  await page.goto(url, { timeoutMs: 30000, settleMs: 600 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1400);
  const first = await page.eval(PROBE);
  const maxScroll = await page.eval(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const pageH = await page.eval(() => document.documentElement.scrollHeight);
  console.log(`viewport ${W}x${H}  pageHeight ${pageH}  maxScroll ${maxScroll}`);
  const screens = Math.min(11, Math.max(0, Math.ceil(pageH / H) - 1));
  const out = [first];
  for (let i = 1; i <= screens; i++) {
    await page.eval(`window.scrollTo({ top: ${i * H}, behavior: 'instant' })`).catch(() => {});
    await sleep(650);
    out.push(await page.eval(PROBE));
  }
  out.forEach((o, i) => {
    console.log(`\n--- screen ${i + 1}  scrollY=${o.sy}  filled=${o.filled}  ` + `T${o.cat.T} M${o.cat.M} B${o.cat.B} C${o.cat.C} empty${o.cat['.']}`);
    o.map.forEach((r) => console.log('    ' + r));
    console.log('    blocks: ' + o.blocks.join(' | '));
  });
  await page.close();
} finally { await browser.close(); server.close(); }
