// 探针 P1b：把 P1 的三个口径做实，并**复现** Lead 的 20/30。
//
// P1 暴露的两件事（这两件比数字本身重要）：
//   ① 「DOM 口径」若不排除纯黑纯白，是 30/30 —— 每个页面都有浏览器默认色或未设色的链接。
//      Lead 排除了 #000000/#FFFFFF 才得到 20/30。也就是说 20/30 与 17/30 的差主要不是
//      「谁测得更细」，而是**排除规则**：0 个 vs 2 个 vs 更多。
//   ② 「像素口径」若不遮蔽 <img>，会把照片里的颜色算成设计色。S03 的 #56311E 是照片，
//      不是 CSS。Lead 声称「脚本已排除 img 和背景图」，本探针把它显式做出来。
//
// 因此本探针的判定链是：
//   DOM-A：所有计算色（不排除任何东西）          → 上限
//   DOM-B：排除纯黑纯白（= Lead 口径）           → 应复现 20/30
//   PX-C ：像素直方图，遮蔽 img/picture/canvas/背景图区域
//   PX-D ：PX-C 再要求 ≥0.05% 面积 + 不能由锚点线性混合出 + ΔE>2   → 「可见的新颜色」
//
// 每条「集合外色」还会反查 `prototypes/_specs/Sxx.md` 与 `_CURRENT-VALUES.md`：
// 若规格里明写了这个色值，那它「本来就该在色板里」，是抽取漏了，不是设计越界。
//
// 运行：node deliverables/70-plan/redteam/p1b-color-v2.mjs [--only=S19]
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { decodePng } from './lib-png.mjs';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/70-plan/redteam');
mkdirSync(OUT, { recursive: true });
const onlyArg = process.argv.find((a) => a.startsWith('--only'));
const ONLY = onlyArg ? new Set(onlyArg.replace(/^--only=?/, '').split(',').map((s) => s.trim()).filter(Boolean)) : null;

const prompts = JSON.parse(readFileSync(join(OUT, 'prompts30.json'), 'utf8'));
const CURRENT = readFileSync(join(ROOT, 'prototypes/_specs/_CURRENT-VALUES.md'), 'utf8').toUpperCase();
const specText = {};
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  specText[id] = readFileSync(join(ROOT, `prototypes/_specs/${id}.md`), 'utf8').toUpperCase();
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(500); res.end('err'); }
});
await new Promise((r) => server.listen(8643, '127.0.0.1', r));

const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
const dirs = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('').toUpperCase();
function toLab(rgb) {
  let [r, g, b] = rgb.map((v) => v / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  r = lin(r); g = lin(g); b = lin(b);
  let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = (r * 0.2126 + g * 0.7152 + b * 0.0722), Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const dE = (a, b) => { const p = toLab(hex2rgb(a)), q = toLab(hex2rgb(b)); return Math.round(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 10) / 10; };
function segResidual(px, a, b) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  let t = L2 ? ((px[0] - a[0]) * d[0] + (px[1] - a[1]) * d[1] + (px[2] - a[2]) * d[2]) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px[0] - (a[0] + t * d[0]), px[1] - (a[1] + t * d[1]), px[2] - (a[2] + t * d[2]));
}
function bestBlend(hex, claims) {
  const px = hex2rgb(hex);
  const anchors = [...claims.map(hex2rgb), [255, 255, 255], [0, 0, 0]];
  let best = { res: 1e9, a: null, b: null };
  for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) {
    const r = segResidual(px, anchors[i], anchors[j]);
    if (r < best.res) best = { res: +r.toFixed(1), a: rgb2hex(...anchors[i]), b: rgb2hex(...anchors[j]) };
  }
  return best;
}

const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  if (ONLY && !ONLY.has(id)) continue;
  const rec = prompts.find((p) => p.id === id);
  const claimed = [...new Set((rec.palette.match(/#[0-9A-Fa-f]{6}/g) || []).map((x) => x.toUpperCase()))];
  const claimSet = new Set(claimed);
  await page.goto(`http://127.0.0.1:8643/prototypes/${dir}/index.html`, { settleMs: 2200 });

  // 遮蔽矩形：img/picture/video/canvas/iframe + 有背景图（url）的元素
  const info = await page.eval(`(() => {
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?)(?:,\\s*([\\d.]+))?\\)/); if (!m) return null; if (m[4] !== undefined && parseFloat(m[4]) === 0) return null; const h=n=>Math.round(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    const masks = [];
    for (const el of document.querySelectorAll('img, picture, video, canvas, iframe, svg image')) {
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) masks.push({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, why: 'img' });
    }
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage.includes('url(')) {
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) masks.push({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, why: 'bg-img' });
      }
    }
    const found = new Map();
    const add = (hex, where, area, sample) => { if (!hex) return; let e = found.get(hex); if (!e) { e = { hex, n: 0, area: 0, where: {}, sample: sample || "" }; found.set(hex, e); } e.n += 1; e.area += area; e.where[where] = (e.where[where]||0) + 1; };
    const els = [document.documentElement, document.body, ...document.querySelectorAll('body *')];
    let pageArea = 1;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const area = Math.max(0, r.width) * Math.max(0, r.height);
      if (el === document.body) pageArea = Math.max(area, document.documentElement.scrollHeight * document.documentElement.clientWidth, 1);
      const inCode = !!el.closest('pre, code, kbd, samp');
      const txt = (el.textContent||'').trim();
      const cs = getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize) || 0;
      const textArea = el.children.length === 0 && txt ? Math.min(area, txt.length * fontSize * fontSize * 0.55) : 0;
      const check = (s, tag) => {
        if (!s) return;
        for (const k of ['color','backgroundColor','borderTopColor','borderBottomColor','borderLeftColor','borderRightColor','outlineColor','fill','stroke','columnRuleColor']) {
          const v = s[k]; if (!v) continue;
          if ((k === 'fill' || k === 'stroke') && (v === 'none' || v === 'rgba(0, 0, 0, 0)')) continue;
          if (k === 'stroke' && parseFloat(s.strokeWidth || '1') === 0) continue;
          const hex = toHex(v); if (!hex) continue;
          const isInk = (k === 'color' || k === 'fill' || k === 'stroke');
          add(hex, tag + '.' + k, isInk ? Math.max(textArea, 1) : Math.max(area, 1), tag + '.' + k + ' · ' + txt.slice(0, 30));
        }
        const sweep = (val, tag2) => { if (!val || val === 'none') return; for (const m of val.matchAll(/rgba?\\([^)]*\\)/g)) { const hex = toHex(m[0]); if (hex) add(hex, tag2, area, tag2); } };
        sweep(s.backgroundImage, tag + '.bgImage'); sweep(s.boxShadow, tag + '.shadow'); sweep(s.textShadow, tag + '.textShadow');
      };
      check(cs, el.tagName.toLowerCase() + (inCode ? '[inCode]' : ''));
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo);
        if (!ps) continue;
        const c = ps.content; if (!c || c === 'none' || c === 'normal') continue;
        check(ps, el.tagName.toLowerCase() + pseudo);
      }
    }
    return { masks, all: [...found.values()], pageArea, docH: document.documentElement.scrollHeight, w: document.documentElement.clientWidth };
  })()`);

  const png = await page.screenshot({ format: 'png', fullPage: true });
  const img = decodePng(Buffer.from(png, 'base64'));
  const ch = img.channels, W = img.width, H = img.height;
  // 遮蔽位图
  const maskGrid = new Uint8Array(W * H);
  for (const m of info.masks) {
    const x0 = Math.max(0, Math.floor(m.x)), x1 = Math.min(W, Math.ceil(m.x + m.w));
    const y0 = Math.max(0, Math.floor(m.y)), y1 = Math.min(H, Math.ceil(m.y + m.h));
    for (let y = y0; y < y1; y++) maskGrid.fill(1, y * W + x0, y * W + x1);
  }
  const hist = new Map();
  let counted = 0;
  for (let i = 0; i < W * H; i++) {
    if (maskGrid[i]) continue;
    const o = i * ch;
    if (ch === 4 && img.data[o + 3] === 0) continue;
    const hex = rgb2hex(img.data[o], img.data[o + 1], img.data[o + 2]);
    hist.set(hex, (hist.get(hex) || 0) + 1); counted++;
  }
  const px = [...hist.entries()].map(([hex, n]) => ({ hex, n, pct: +((n / counted) * 100).toFixed(3) })).sort((a, b) => b.n - a.n);
  const claimPct = {}; for (const c of claimed) claimPct[c] = +(((hist.get(c) || 0) / counted) * 100).toFixed(2);

  // DOM-A 全部；DOM-B 排除纯黑纯白（Lead 口径）
  const mk = (list) => list.map((x) => {
    const blend = bestBlend(x.hex, claimed);
    const nearest = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a, b) => a.d - b.d)[0];
    const inSpec = specText[id].includes(x.hex);
    const inCurrent = CURRENT.includes(x.hex);
    return { hex: x.hex, n: x.n, areaPct: +((x.area / info.pageArea) * 100).toFixed(2), area: Math.round(x.area), dE: nearest.d, nearest: nearest.c, blendRes: blend.res, inSpec, inCurrent, sample: x.sample };
  }).sort((a, b) => b.area - a.area);
  const domAll = info.all.filter((x) => !claimSet.has(x.hex));
  const domB = domAll.filter((x) => x.hex !== '#000000' && x.hex !== '#FFFFFF');

  const pxCand = px.filter((x) => !claimSet.has(x.hex) && x.pct >= 0.05);
  const pxD = pxCand.map((x) => {
    const blend = bestBlend(x.hex, claimed);
    const nearest = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a, b) => a.d - b.d)[0];
    return { hex: x.hex, pct: x.pct, dE: nearest.d, nearest: nearest.c, blendRes: blend.res, isBlend: blend.res <= 8, inSpec: specText[id].includes(x.hex), inCurrent: CURRENT.includes(x.hex) };
  }).filter((x) => x.blendRes > 8 && x.dE > 2).sort((a, b) => b.pct - a.pct);

  const row = {
    id, claimed, claimPct, docH: info.docH, masks: info.masks.length, countedPx: counted,
    domA: mk(domAll), domB: mk(domB), pxD,
    missing: claimed.filter((c) => (claimPct[c] || 0) < 0.01),
  };
  rows.push(row);
  console.log(`${id} 声称${claimed.length} sp="${claimed.map(c=>claimPct[c]).join('/')}" | DOM-A ${row.domA.length} | DOM-B ${row.domB.length} | PX-D ${row.pxD.length} | 遮罩 ${row.masks} | 未画 ${row.missing.join(',') || '-'}`);
  if (row.domB.length) console.log('   DOM-B: ' + row.domB.slice(0,4).map((x) => `${x.hex}${x.inSpec?'[规格有]':''}${x.inCurrent?'[CUR]':''} ΔE${x.dE} 面积${x.areaPct}% n${x.n}`).join(' | '));
  if (row.pxD.length) console.log('   PX-D : ' + row.pxD.slice(0,4).map((x) => `${x.hex} ${x.pct}%${x.inSpec?'[规格有]':''} ΔE${x.dE} 混${x.blendRes}`).join(' | '));
}

writeFileSync(join(OUT, 'p1b-color.json'), JSON.stringify(rows, null, 1), 'utf8');
console.log('\n=== 口径对照（这就是 P1 的答案）===');
const cnt = (k) => rows.filter((r) => r[k].length > 0).length;
console.log('DOM-A 全部计算色（不排除）           : ' + cnt('domA') + '/' + rows.length);
console.log('DOM-B 排除纯黑纯白（≈ Lead 口径）     : ' + cnt('domB') + '/' + rows.length);
console.log('PX-D 遮罩图像+面积≥0.05%+非混合+ΔE>2 : ' + cnt('pxD') + '/' + rows.length);
console.log('PX-D 中 ≥0.5% 面积的案               : ' + rows.filter((r) => r.pxD.some((x) => x.pct >= 0.5)).length + '/' + rows.length);
console.log('集合外色总数 DOM-A/DOM-B/PX-D : ' + rows.reduce((a,r)=>a+r.domA.length,0) + ' / ' + rows.reduce((a,r)=>a+r.domB.length,0) + ' / ' + rows.reduce((a,r)=>a+r.pxD.length,0));
console.log('PX-D 里「规格明写」的比例: ' + rows.reduce((a,r)=>a+r.pxD.filter(x=>x.inSpec||x.inCurrent).length,0) + '/' + rows.reduce((a,r)=>a+r.pxD.length,0));
await browser.close();
server.close();
