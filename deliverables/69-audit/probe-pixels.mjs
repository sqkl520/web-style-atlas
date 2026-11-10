// 探针 19（ground truth）：直接从**截图的像素**做颜色直方图。
// 前面所有"上屏色"都是从 computed style 推的，每一版都有假阳性（UA 默认 fill、继承的 color、
// 没被裁掉的空白元素）。像素不会撒谎：屏幕上没画的颜色，柱状图里就没有。
//
// 做法：CDP 截全页 PNG → 把 data URL 塞回页面 → canvas.getImageData → 量化计数。
// 抗锯齿会产生大量中间色，所以按 8 级/通道（32³ 桶）粗量化，再报"占画面 ≥0.3% 的色"。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8524;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const DIR = OUT;
const con = JSON.parse(readFileSync(DIR + '/constraints.json', 'utf8'));
const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d)).sort();
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const d of dirs) {
  const id = d.slice(0, 3);
  const claimed = [...new Set(con.per[id].items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1500 });
  await p.eval(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true));

  // 全页截图（jpeg 会引入压缩噪声，必须 png）
  const b64 = await p.screenshot({ format: 'png', fullPage: true });
  // 用页面自己的 canvas 解码
  const hist = await p.eval(async (dataUrl) => {
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
    const total = W * H;
    // 精确计数（全 RGB 去重）+ 粗桶
    const exact = new Map();
    const coarse = new Map();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      const r = px[i], g = px[i + 1], b2 = px[i + 2];
      const key = (r << 16) | (g << 8) | b2;
      exact.set(key, (exact.get(key) || 0) + 1);
      const ck = ((r >> 3) << 10) | ((g >> 3) << 5) | (b2 >> 3);
      coarse.set(ck, (coarse.get(ck) || 0) + 1);
    }
    const hex = (k) => '#' + k.toString(16).padStart(6, '0').toUpperCase();
    const topExact = [...exact.entries()].sort((a, c) => c[1] - a[1]).slice(0, 40)
      .map(([k, n]) => ({ hex: hex(k), pct: +(n / total * 100).toFixed(3) }));
    // 粗桶的中心色
    const topCoarse = [...coarse.entries()].sort((a, c) => c[1] - a[1]).slice(0, 40).map(([k, n]) => {
      const r = ((k >> 10) & 31) << 3, g = ((k >> 5) & 31) << 3, b2 = (k & 31) << 3;
      return { hex: '#' + [r, g, b2].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase(), pct: +(n / total * 100).toFixed(3) };
    });
    return { W, H, total, topExact, topCoarse, exactN: exact.size, coarseN: coarse.size };
  }, 'data:image/png;base64,' + b64);

  // 与声称色比对：每个"主要精确色"到最近声称色的 ΔE
  const toLab = (h) => {
    const n = parseInt(h.slice(1), 16);
    let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
    const lin = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    r = lin(r); g = lin(g); bl = lin(bl);
    let X = (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047;
    let Y = r * 0.2126 + g * 0.7152 + bl * 0.0722;
    let Z = (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    X = f(X); Y = f(Y); Z = f(Z);
    return { L: 116 * Y - 16, a: 500 * (X - Y), b: 200 * (Y - Z) };
  };
  const dE = (h1, h2) => { const x = toLab(h1), y = toLab(h2); return +Math.sqrt((x.L - y.L) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2).toFixed(1); };
  const satOf = (h) => {
    const n = parseInt(h.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    if (mx === mn) return 0;
    const l = (mx + mn) / 2;
    return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
  };

  const major = hist.topExact.filter((x) => x.pct >= 0.3);
  const annotated = major.map((x) => {
    const ds = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a2, b2) => a2.d - b2.d);
    return { ...x, nearest: ds[0].c, dE: ds[0].d, s: +satOf(x.hex).toFixed(3), claimed: x.hex };
  });
  const offPalette = annotated.filter((x) => x.dE > 6);
  out[id] = { hist, annotated, offPalette, claimed };

  console.log(id.padEnd(4), 'px=' + hist.total,
    '| 主要色(≥0.3%)=' + annotated.length,
    '| 声称色命中=' + annotated.filter((x) => x.dE <= 3).length,
    '| 离色板>6ΔE=' + offPalette.length,
    '|', offPalette.map((x) => x.hex + '(' + x.pct + '%,ΔE' + x.dE + ',s' + x.s + ')').join(' '));
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'pixel-histogram.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote pixel-histogram.json');
