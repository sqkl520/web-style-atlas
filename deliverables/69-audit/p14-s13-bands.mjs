// 归因实验：S13 的 empty-screens 里，多少是「规格钉死的 1–11 栏正文 + 13–16 栏签发栏」造成的几何必然，
// 多少是该屏自身内容不足。同一网格，分三个横带统计。
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const REPO = resolve('D:/Web/style');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(REPO + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8791, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await page.goto('http://127.0.0.1:8791/prototypes/S13-blind-debossed-dispatch/index.html', { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)');
await sleep(1800);

// 用与 probe.mjs:538 完全相同的 24x15 网格，但把格子按 x 分带
const BANDS = `(() => {
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
  const hit = (x, y) => {
    if (textRects.some((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) return 'text';
    let el = document.elementFromPoint(x, y);
    for (let i = 0; el && i < 6 && el !== document.body && el !== document.documentElement; i++, el = el.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) return 'media';
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none') return 'media';
      const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) return 'ground'; break; }
    }
    return 'bare';
  };
  const bands = { all: [0, 24], content_cols_1_11: [0, 17], signature_lane_13_16: [18, 24] };
  const out = {};
  for (const [name, [g0, g1]] of Object.entries(bands)) {
    let f = 0, n = 0;
    for (let gx = g0; gx < g1; gx++) for (let gy = 0; gy < 15; gy++) { n++; const k = hit((gx + 0.5) * (W / 24), (gy + 0.5) * (H / 15)); if (k !== 'bare') f++; }
    out[name] = { filled: Math.round((f / n) * 100) / 100, samples: n };
  }
  // 实际栏位边界（dossier 的 16 栏）
  const dossier = document.querySelector('.dossier');
  const dcs = dossier ? getComputedStyle(dossier) : null;
  out.grid = { dossierWidth: dossier ? Math.round(dossier.getBoundingClientRect().width) : null, cols: dcs ? dcs.gridTemplateColumns : null };
  const sig = document.querySelector('.signature');
  if (sig) { const r = sig.getBoundingClientRect(); out.signature = { top: Math.round(r.top + scrollY), h: Math.round(r.height), x: Math.round(r.x), w: Math.round(r.width), pos: getComputedStyle(sig).position }; }
  return out;
})()`;

const rows = [];
for (let i = 0; i <= 5; i++) {
  await page.eval(`window.scrollTo({top:${i * 900},behavior:'instant'})`);
  await sleep(750);
  const b = await page.eval(BANDS);
  rows.push({ screen: i + 1, ...b });
}
writeFileSync('D:/Web/style/deliverables/69-audit/s13-bands.json', JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`screen ${r.screen}  all=${r.all.filled}  contentCols(1-11)=${r.content_cols_1_11.filled}  signatureLane(13-16)=${r.signature_lane_13_16.filled}  sig=${r.signature ? `y${r.signature.top} h${r.signature.h} ${r.signature.pos}` : 'none'}`);
console.log('\ngrid:', JSON.stringify(rows[0].grid));
await browser.close(); server.close();
