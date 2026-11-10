// 探针 14（权威）：真实屏幕上的线宽。
// 为什么必须重做：上一版把 getComputedStyle(el).strokeWidth 当成 px 去比。
// 实测（probe-units-derived 的 A 段）证明它是 **用户单位**：
//   同一个 stroke-width:2 在 24 单位 viewBox 缩放到 100px 时画的宽度是 2×5=10px，
//   缩放到 200px 时是 2×10=20px。拿它比提示词里的 px，等于把单位搞混。
//   例外：vector-effect: non-scaling-stroke 时它恒为屏幕 px（S19 正好用了这一条）。
//
// 口径（写死在代码里，报告 §1 复述）：
//   真实线宽 = |stroke-width(用户单位)| × (屏幕尺寸 / viewBox 尺寸)，non-scaling-stroke 时 × 1
//   CSS 边框 = CSSOM 声明值（小数保真）；computed 只作"确实生效"的下界
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8521;
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
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1200 });
  const r = await p.eval(() => {
    const sel = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');

    /* ── SVG 真实线宽 ── */
    const strokes = [];  // {realPx, raw, scaled, sel, tag}
    const svgRoots = Array.from(document.querySelectorAll('svg'));
    for (const el of document.querySelectorAll('svg *, svg')) {
      const cs = getComputedStyle(el);
      const sw = parseFloat(cs.strokeWidth);
      if (!(sw > 0) || !cs.stroke || cs.stroke === 'none') continue;
      // 找最近的 svg 视口与 viewBox
      const root = el.closest('svg');
      let scale = 1, scaled = true;
      if (root) {
        const vb = root.viewBox && root.viewBox.baseVal;
        const rect = root.getBoundingClientRect();
        if (vb && vb.width > 0 && rect.width > 0) scale = rect.width / vb.width;
        scaled = cs.vectorEffect !== 'non-scaling-stroke';
      }
      const realPx = scaled ? sw * scale : sw;
      strokes.push({
        realPx: +realPx.toFixed(3), userUnits: sw, scale: +scale.toFixed(3),
        vectorEffect: cs.vectorEffect, sel: sel(el), stroke: cs.stroke,
        hasDash: cs.strokeDasharray && cs.strokeDasharray !== 'none',
      });
    }

    /* ── CSS 边框：声明值（小数保真）+ computed（生效下界） ── */
    const declBorder = new Map();
    const declOutline = new Map();
    const walk = (rules) => {
      for (const rule of rules || []) {
        if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules); continue; }
        if (!rule.style) continue;
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i], v = rule.style.getPropertyValue(prop);
          if (!v) continue;
          const isB = /^border(-(top|right|bottom|left))?(-width)?$/.test(prop) || /^border-(top|right|bottom|left)-width$/.test(prop);
          const isO = /^outline(-width)?$/.test(prop);
          if (!isB && !isO) continue;
          const m = String(v).match(/(-?\d*\.?\d+)px/g) || [];
          for (const one of m) {
            const num = parseFloat(one);
            if (!(num > 0)) continue;
            const tgt = isO ? declOutline : declBorder;
            if (!tgt.has(num)) tgt.set(num, { n: 0, where: [] });
            const rec = tgt.get(num); rec.n++; if (rec.where.length < 4) rec.where.push(prop + ' @ ' + (rule.selectorText || '').slice(0, 34));
          }
        }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }

    /* ── computed 边框（生效） ── */
    const compBorder = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs['border' + s + 'Width']);
        if (w > 0 && cs['border' + s + 'Style'] !== 'none') compBorder.add(+w.toFixed(2));
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) compBorder.add(+parseFloat(cs.outlineWidth).toFixed(2));
    }

    return {
      strokes,
      declBorder: [...declBorder.entries()].map(([w, v]) => ({ w, n: v.n, where: v.where })).sort((a, c) => a.w - c.w),
      declOutline: [...declOutline.entries()].map(([w, v]) => ({ w, n: v.n, where: v.where })).sort((a, c) => a.w - c.w),
      compBorder: [...compBorder].sort((a, c) => a - c),
    };
  });
  out[id] = r;
  const realSet = [...new Set(r.strokes.map((s) => s.realPx))].sort((a, c) => a - c);
  console.log(id,
    '| SVG真实线宽=' + (realSet.length ? realSet.map((v) => v + 'px').join('/') : '—'),
    '| CSS边框声明=' + r.declBorder.map((x) => x.w + 'px').join('/'),
    '| computed=' + r.compBorder.map((v) => v + 'px').join('/'),
    (r.strokes.some((s) => s.vectorEffect === 'non-scaling-stroke') ? '| 有non-scaling' : ''));
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'linewidths.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote linewidths.json');
