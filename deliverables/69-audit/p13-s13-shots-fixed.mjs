// 修正版：以仓库根为 http root，保证 ../_fonts/ 能加载（与 inspect.mjs 同口径）。
// 1) 截 S13 六屏 + 3x 放大  2) 复核 mono 挂载点  3) A/B isMono
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const REPO = resolve('D:/Web/style');
const OUT = resolve('D:/Web/style/deliverables/69-audit/shots');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(REPO + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8781, '127.0.0.1', r));

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await page.goto('http://127.0.0.1:8781/prototypes/S13-blind-debossed-dispatch/index.html', { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)');
await sleep(1800);

const fontCheck = await page.eval(`(() => ({
  loaded: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),
  checkNoto: document.fonts.check('40px "Noto Serif SC"'),
  checkDM: document.fonts.check('40px "DM Mono"'),
  checkEB: document.fonts.check('40px "EB Garamond"'),
}))()`);

const GRID = `(() => {
  const W = innerWidth, H = innerHeight;
  const opaque = (c) => c && c !== 'transparent' && !/rgba\\([^)]*,\\s*0\\)$/.test(c);
  const pageBg = [document.body, document.documentElement].map((e) => getComputedStyle(e).backgroundColor).find(opaque) || 'rgb(255,255,255)';
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue;
    const pcs = getComputedStyle(n.parentElement); if (pcs.visibility === 'hidden' || +pcs.opacity < 0.2) continue;
    rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.bottom > 0 && r.top < H && r.width > 1) textRects.push(r);
  }
  let filled = 0, samples = 0; const kinds = { text: 0, media: 0, ground: 0, bare: 0 };
  for (let gx = 0; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
    const x = (gx + 0.5) * (W / 24), y = (gy + 0.5) * (H / 15); samples++;
    if (textRects.some((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) { filled++; kinds.text++; continue; }
    let el = document.elementFromPoint(x, y); let hit = null;
    for (let i = 0; el && i < 6 && el !== document.body && el !== document.documentElement; i++, el = el.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { hit = 'media'; break; }
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none') { hit = 'media'; break; }
      const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) hit = 'ground'; break; }
    }
    if (hit === 'media') { filled++; kinds.media++; } else if (hit === 'ground') { filled++; kinds.ground++; } else kinds.bare++;
  }
  return { filled: Math.round((filled / samples) * 100) / 100, kinds, y: Math.round(scrollY) };
})()`;

const rows = [];
for (let i = 0; i <= 5; i++) {
  await page.eval(`window.scrollTo({top:${i * 900},behavior:'instant'})`);
  await sleep(750);
  const g = await page.eval(GRID);
  // 该屏最右侧 x>1050 的格子有没有东西：判「留白在右侧签发栏栏位」还是「全宽空」
  const rightEmpty = await page.eval(`(() => {
    const H = innerHeight; let tot = 0, bare = 0;
    const textRects = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (!n.nodeValue.trim() || !n.parentElement) continue; rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.bottom > 0 && r.top < H && r.width > 1) textRects.push(r); }
    for (let gx = 18; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
      const x = (gx + 0.5) * (innerWidth / 24), y = (gy + 0.5) * (H / 15); tot++;
      if (textRects.some((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) continue;
      const el = document.elementFromPoint(x, y); if (!el) { bare++; continue; }
      const cs = getComputedStyle(el); const bg = cs.backgroundColor;
      if (/^(IMG|VIDEO|CANVAS|PICTURE|svg)$/.test(el.tagName)) continue;
      if (cs.backgroundImage !== 'none') continue;
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(244, 227, 190)') bare++;
    }
    return { rightBareShare: Math.round((bare / tot) * 100) / 100 };
  })()`);
  rows.push({ screen: i + 1, scrollY: g.y, filled: g.filled, kinds: g.kinds, right: rightEmpty });
  await page.screenshot({ path: join(OUT, `S13-s${i + 1}.jpg`), format: 'jpeg', quality: 88 });
}

// 3x 放大条款区（含 .depth 等宽实测值）
await page.eval('window.scrollTo({top:0,behavior:"instant"})');
await sleep(400);
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 3 });
await sleep(900);
await page.eval(`window.scrollTo({top:1650,behavior:'instant'})`);
await sleep(600);
await page.screenshot({ path: join(OUT, 'S13-clauses-3x.jpg'), format: 'jpeg', quality: 90 });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await sleep(500);

// mono 挂载点（用页面内 isMono 原判据 + inCode 标记）
const mono = await page.eval(`(() => {
  const mctx = document.createElement('canvas').getContext('2d');
  const isMono = (family) => { mctx.font = '40px ' + family; return Math.abs(mctx.measureText('iiiiiiii').width - mctx.measureText('WWWWWWWW').width) < 1; };
  const out = []; let proseChars = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!isMono(cs.fontFamily)) continue;
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    if (!direct.trim()) continue;
    const inCode = !!el.closest('pre, code, kbd, samp, textarea');
    if (!inCode) proseChars += direct.trim().length;
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 24), text: direct.replace(/\\s+/g, ' ').trim().slice(0, 20), inCode });
  }
  return { count: out.length, proseChars, items: out };
})()`);

writeFileSync('D:/Web/style/deliverables/69-audit/s13-probe2.json', JSON.stringify({ fontCheck, rows, mono }, null, 1));
console.log(JSON.stringify({ fontCheck, rows, monoCount: mono.count, proseChars: mono.proseChars, monoItems: mono.items }, null, 1));
await browser.close(); server.close();
