// 探针 P1（v2）：30 案「提示词声称色 vs 页面实际渲染色」。
//
// v1 的教训（写在这里因为它是结论的一部分）：像素直方图单独用是**错的**。
// S20 的整页截图有 233,398 个不同 sRGB 值 —— 一张生成式画布的抗锯齿会把每种颜色
// 与背景之间的过渡插值成几千个中间色。这些中间色「不在声称色集合里」，但它们
// 不是设计师用的颜色，是渲染器的产物。任何只做「集合差」的脚本都会把 30/30 判成违规。
//
// 所以 v2 的判据是三层，缺一层结论就不可信：
//   ① 混合判定：一个像素色若能写成两个锚点（声称色 / 纯黑 / 纯白）的线性插值，
//      残差 ≤ 8/255，它就是**抗锯齿或半透明**产物，不算新颜色。
//   ② 面积判定：占全页像素 < 0.05% 的色不进入「可见」清单
//      （1440 宽下一页约 1.3M px，0.05% ≈ 650 px ≈ 一个 25×25 方块）。
//   ③ ΔE 判定：到最近声称色的 CIE76 ΔE > 2 才算「不同色」。
//   三条全过才计一次「可见的集合外颜色」。
//
// 同时保留 DOM 口径（Lead 的 20/30 用的那个），并额外记 **面积** ——
// 「用了 247 次」是元素计数，「占 3% 像素」才是可见度，两者不是一回事。
//
// 运行：node deliverables/70-plan/redteam/p1-color-probe.mjs [--only=S19,S20]
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
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(500); res.end('err'); }
});
await new Promise((r) => server.listen(8642, '127.0.0.1', r));

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
  let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let Y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
  let Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const dE = (a, b) => {
  const p = toLab(hex2rgb(a)), q = toLab(hex2rgb(b));
  return Math.round(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 10) / 10;
};
// 点到线段的距离（在 0–255 编码空间里做，混合就发生在这里）
function segResidual(px, a, b) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  let t = L2 ? ((px[0] - a[0]) * d[0] + (px[1] - a[1]) * d[1] + (px[2] - a[2]) * d[2]) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [a[0] + t * d[0], a[1] + t * d[1], a[2] + t * d[2]];
  return Math.hypot(px[0] - q[0], px[1] - q[1], px[2] - q[2]);
}
function bestBlend(hex, claims) {
  const px = hex2rgb(hex);
  const anchors = [...claims.map(hex2rgb), [255, 255, 255], [0, 0, 0]];
  let best = { res: 1e9, a: null, b: null };
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const r = segResidual(px, anchors[i], anchors[j]);
      if (r < best.res) best = { res: +r.toFixed(1), a: rgb2hex(...anchors[i]), b: rgb2hex(...anchors[j]) };
    }
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

  await page.goto(`http://127.0.0.1:8642/prototypes/${dir}/index.html`, { settleMs: 2200 });

  // ── 口径 D：DOM 声明采样（面积加权 + 元素计数双记）──────────────────
  const dom = await page.eval(`(() => {
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?)(?:,\\s*([\\d.]+))?\\)/); if (!m) return null; if (m[4] !== undefined && parseFloat(m[4]) === 0) return null; const h=n=>Math.round(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
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
        for (const k of ['color','backgroundColor','borderTopColor','borderBottomColor','borderLeftColor','borderRightColor','outlineColor','fill','stroke','textDecorationColor','columnRuleColor']) {
          const v = s[k]; if (!v) continue;
          if ((k === 'fill' || k === 'stroke') && (v === 'none' || v === 'rgba(0, 0, 0, 0)')) continue;
          if (k === 'stroke' && parseFloat(s.strokeWidth || '1') === 0) continue;
          const hex = toHex(v); if (!hex) continue;
          const isInk = (k === 'color' || k === 'fill' || k === 'stroke' || k === 'textDecorationColor');
          add(hex, tag + '.' + k, isInk ? Math.max(textArea, 1) : Math.max(area, 1), tag + '.' + k + ' · ' + txt.slice(0, 36));
        }
        const sweep = (val, tag2) => { if (!val || val === 'none') return; for (const m of val.matchAll(/rgba?\\([^)]*\\)/g)) { const hex = toHex(m[0]); if (hex) add(hex, tag2, area, tag2 + ' · ' + txt.slice(0, 36)); } };
        sweep(s.backgroundImage, tag + '.bgImage');
        sweep(s.boxShadow, tag + '.shadow');
        sweep(s.textShadow, tag + '.textShadow');
        sweep(s.borderImageSource, tag + '.borderImage');
      };
      check(cs, el.tagName.toLowerCase() + (inCode ? '[inCode]' : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''));
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo);
        if (!ps) continue;
        const c = ps.content; if (!c || c === 'none' || c === 'normal') continue;
        check(ps, el.tagName.toLowerCase() + pseudo);
      }
    }
    return { all: [...found.values()], pageArea, elementCount: els.length, docH: document.documentElement.scrollHeight };
  })()`);

  // ── 口径 P：整页像素直方图 ─────────────────────────────────────────
  const png = await page.screenshot({ format: 'png', fullPage: true });
  const img = decodePng(Buffer.from(png, 'base64'));
  const hist = new Map();
  const ch = img.channels;
  const total = img.width * img.height;
  for (let i = 0; i < total; i++) {
    const o = i * ch;
    if (ch === 4 && img.data[o + 3] === 0) continue;
    const hex = rgb2hex(img.data[o], img.data[o + 1], img.data[o + 2]);
    hist.set(hex, (hist.get(hex) || 0) + 1);
  }
  const px = [...hist.entries()].map(([hex, n]) => ({ hex, n, pct: +(n / total * 100).toFixed(3) })).sort((a, b) => b.n - a.n);
  const claimPct = {};
  for (const c of claimed) claimPct[c] = +(((hist.get(c) || 0) / total) * 100).toFixed(2);

  const outsideCandidates = px.filter((x) => !claimSet.has(x.hex) && x.pct >= 0.05);
  const annotated = outsideCandidates.map((x) => {
    const blend = bestBlend(x.hex, claimed);
    const nearest = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a, b) => a.d - b.d)[0];
    return { hex: x.hex, pct: x.pct, dE: nearest.d, nearest: nearest.c, blend, isBlend: blend.res <= 8, isDistinct: blend.res > 8 && nearest.d > 2 };
  });
  const visibleOutside = annotated.filter((x) => x.isDistinct).sort((a, b) => b.pct - a.pct);

  const domOutside = dom.all.filter((x) => !claimSet.has(x.hex))
    .map((x) => {
      const blend = bestBlend(x.hex, claimed);
      const nearest = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a, b) => a.d - b.d)[0];
      return { hex: x.hex, n: x.n, area: Math.round(x.area), areaPct: +((x.area / dom.pageArea) * 100).toFixed(2), dE: nearest.d, nearest: nearest.c, blend, sample: x.sample, where: x.where };
    }).sort((a, b) => b.area - a.area);

  const row = {
    id, dir, claimed, claimPct, docH: dom.docH, pageArea: dom.pageArea,
    dom: { distinct: dom.all.length, outside: domOutside.length, outsideList: domOutside.slice(0, 12) },
    px: { distinct: px.length, pixels: total, outside005: annotated.length, visibleOutside: visibleOutside.length, visibleList: visibleOutside.slice(0, 10), blendOnly: annotated.filter((x) => x.isBlend).length, missing: claimed.filter((c) => (claimPct[c] || 0) < 0.01) },
  };
  rows.push(row);
  console.log(`${id} 声称${claimed.length} | DOM外 ${row.dom.outside} | 像素外(≥0.05%) ${row.px.outside005} → 可见 ${row.px.visibleOutside}（其中混合残渣 ${row.px.blendOnly}）| 声称未画 ${row.px.missing.length} | doc ${dom.docH}px`);
  if (visibleOutside.length) console.log('     可见集合外: ' + visibleOutside.slice(0, 5).map((x) => `${x.hex} ${x.pct}% ΔE${x.dE}(→${x.nearest}) 混${x.blend.res}`).join(' | '));
}

writeFileSync(join(OUT, 'p1-color.json'), JSON.stringify(rows, null, 1), 'utf8');
console.log('\n=== 汇总（口径差异就是结论）===');
console.log('DOM 口径：有集合外色的案  ' + rows.filter((r) => r.dom.outside > 0).length + '/' + rows.length);
console.log('像素 0.05%：有集合外色    ' + rows.filter((r) => r.px.outside005 > 0).length + '/' + rows.length);
console.log('像素 0.05%+非混合+ΔE>2：   ' + rows.filter((r) => r.px.visibleOutside > 0).length + '/' + rows.length);
console.log('像素 ≥0.5%+非混合+ΔE>2：   ' + rows.filter((r) => r.px.visibleList.some((x) => x.pct >= 0.5)).length + '/' + rows.length);
await browser.close();
server.close();
