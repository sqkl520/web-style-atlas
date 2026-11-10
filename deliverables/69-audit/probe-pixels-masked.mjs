// 探针 20（终局 · 色彩）：像素直方图 **排除图片占据的区域**。
//
// 为什么必须排除：S21 的 #C5BEAD 占 6.87% 面积、ΔE 10.8，看起来像"新增了一个纸色"。
// 但 S21 有 20 张照片共 10.6MB —— 那是照片里的墙，不是作者选的色。
// 同理 S19 那 13 个 ΔE 6~7 的灰绿全是灰度照片的边缘抗锯齿。
//
// 做法：先把所有 <img> / <video> / 带 background-image 的元素的包围盒铺成掩膜，
// 直方图只统计掩膜外的像素。剩下的就是"作者用 CSS 画上去的颜色"。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8525;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d)).sort();
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const d of dirs) {
  const id = d.slice(0, 3);
  const claimed = [...new Set(con.per[id].items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1500 });
  await p.eval(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true));

  // 掩膜区域：img / picture / video / 任何带 url() 背景的元素（在全页坐标系里）
  const maskRects = await p.eval(() => {
    const rects = [];
    const pushR = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      rects.push({ x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
    };
    for (const el of document.querySelectorAll('img,picture,video,canvas')) pushR(el);
    for (const el of document.querySelectorAll('*')) {
      const bi = getComputedStyle(el).backgroundImage;
      if (bi && bi !== 'none' && /url\(/.test(bi)) pushR(el);
    }
    return { rects, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth };
  });

  const b64 = await p.screenshot({ format: 'png', fullPage: true });
  const r = await p.eval(async (args) => {
    const { dataUrl, rects } = args;
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const W = Math.min(img.width, 1440);
    const H = Math.min(img.height, 20000);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;

    // 掩膜（1 bit per pixel）
    const mask = new Uint8Array(W * H);
    for (const rc of rects) {
      const x0 = Math.max(0, rc.x), x1 = Math.min(W, rc.x + rc.w);
      const y0 = Math.max(0, rc.y), y1 = Math.min(H, rc.y + rc.h);
      for (let y = y0; y < y1; y++) { const off = y * W; for (let x = x0; x < x1; x++) mask[off + x] = 1; }
    }

    const exact = new Map();
    let kept = 0, masked = 0;
    for (let i = 0, p4 = 0; i < px.length; i += 4, p4++) {
      if (px[i + 3] < 128) continue;
      if (mask[p4]) { masked++; continue; }
      kept++;
      const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      exact.set(k, (exact.get(k) || 0) + 1);
    }
    const hex = (k) => '#' + k.toString(16).padStart(6, '0').toUpperCase();
    const top = [...exact.entries()].sort((a, c) => c[1] - a[1]).slice(0, 60)
      .map(([k, n]) => ({ hex: hex(k), pct: +(n / Math.max(1, kept) * 100).toFixed(3), n }));
    // 覆盖率：声称色合计占多少
    return { W, H, kept, masked, maskPct: +(masked / (kept + masked) * 100).toFixed(1), top, exactN: exact.size };
  }, { dataUrl: 'data:image/png;base64,' + b64, rects: maskRects.rects });

  const toLab = (h) => {
    const n = parseInt(h.slice(1), 16);
    let rr = ((n >> 16) & 255) / 255, gg = ((n >> 8) & 255) / 255, bb = (n & 255) / 255;
    const lin = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    rr = lin(rr); gg = lin(gg); bb = lin(bb);
    let X = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
    let Y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
    let Z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    X = f(X); Y = f(Y); Z = f(Z);
    return { L: 116 * Y - 16, a: 500 * (X - Y), b: 200 * (Y - Z) };
  };
  const dE = (h1, h2) => { const x = toLab(h1), y = toLab(h2); return +Math.sqrt((x.L - y.L) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2).toFixed(1); };
  const satOf = (h) => { const n = parseInt(h.slice(1), 16); const rr = ((n >> 16) & 255) / 255, gg = ((n >> 8) & 255) / 255, bb = (n & 255) / 255; const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb); if (mx === mn) return 0; const l = (mx + mn) / 2; return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn); };

  const major = r.top.filter((x) => x.pct >= 0.3);
  const annotated = major.map((x) => {
    const ds = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a2, b2) => a2.d - b2.d);
    // 是否同色相但明度不同？同色相 ±25° 且 ΔE>6 = 深浅变体，不是"新彩色"
    const hueOf = (h) => { const n = parseInt(h.slice(1), 16); const rr = ((n >> 16) & 255) / 255, gg = ((n >> 8) & 255) / 255, bb = (n & 255) / 255; const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), dd = mx - mn; if (!dd) return null; let hh; if (mx === rr) hh = ((gg - bb) / dd + (gg < bb ? 6 : 0)); else if (mx === gg) hh = (bb - rr) / dd + 2; else hh = (rr - gg) / dd + 4; return hh * 60; };
    const h1 = hueOf(x.hex), h2 = hueOf(ds[0].c);
    let hueDelta = null;
    if (h1 !== null && h2 !== null) { hueDelta = Math.abs(h1 - h2); if (hueDelta > 180) hueDelta = 360 - hueDelta; }
    return { ...x, nearest: ds[0].c, dE: ds[0].d, s: +satOf(x.hex).toFixed(3), hueDelta: hueDelta === null ? null : +hueDelta.toFixed(0) };
  });
  // "新增彩色" = ΔE>6 且 饱和度≥0.15 且 色相偏离最近声称色 >25°（否则只是同色系深浅）
  const newColor = annotated.filter((x) => x.dE > 6 && x.s >= 0.15 && (x.hueDelta === null || x.hueDelta > 25));
  const shade = annotated.filter((x) => x.dE > 6 && !(x.s >= 0.15 && (x.hueDelta === null || x.hueDelta > 25)));
  const claimedPct = annotated.filter((x) => x.dE <= 3).reduce((a, c) => a + c.pct, 0);

  out[id] = { ...r, annotated, newColor, shade, claimedPct: +claimedPct.toFixed(2), claimed };
  console.log(id.padEnd(4), '掩膜=' + r.maskPct + '% kept=' + r.kept,
    '| 主要色=' + annotated.length, '声称色占比=' + claimedPct.toFixed(1) + '%',
    '| 新彩色=' + newColor.length + (newColor.length ? ' [' + newColor.map((x) => x.hex + '(' + x.pct + '%,ΔE' + x.dE + ',s' + x.s + ',HΔ' + x.hueDelta + ')').join(' ') + ']' : ''),
    '| 深浅变体=' + shade.length);
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'pixel-masked.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote pixel-masked.json');
