// 探针 11（权威版）：颜色溯源。
// 上一版三个错误，这一版逐个修：
//  ① color 用 computed 值统计会把 documentElement 的 UA 默认 #000 算成"上屏色"（面积 1200%）。
//     正确口径：只有**真的承载文字节点**的元素，它的 color 才算"上屏的文字色"。
//  ② CSS 里的颜色不只有 hex —— 还有 rgb()/rgba()/hsl()/颜色名。只收 hex 会把作者写的
//     rgb(43,43,43) 判成"无出处"。
//  ③ 面积用 scrollHeight 会把 html 元素算成 12 倍视口。改为"元素自身可见框 ∩ 视口"。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8519;
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
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1200 });
  const r = await p.eval((claimedArr) => {
    const claimed = new Set(claimedArr);
    const parse = (v) => {
      const s = String(v == null ? '' : v).trim();
      let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?\s*\)$/i);
      if (m) {
        let a = m[4] === undefined ? 1 : (String(m[4]).endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
        if (!a) return null;
        const hex = '#' + [m[1], m[2], m[3]].map((x) => Math.round(+x).toString(16).padStart(2, '0')).join('').toUpperCase();
        return { hex, a: +a.toFixed(2) };
      }
      if (/^#[0-9a-fA-F]{3,8}$/.test(s)) {
        let h = s.toUpperCase();
        if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
        if (h.length === 9) return { hex: h.slice(0, 7), a: +(parseInt(h.slice(7, 9), 16) / 255).toFixed(2) };
        if (h.length === 5) return { hex: '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3], a: +(parseInt(h[4] + h[4], 16) / 255).toFixed(2) };
        return { hex: h.slice(0, 7), a: 1 };
      }
      if (/^[a-z]+$/i.test(s) && s !== 'transparent' && s !== 'currentcolor' && s !== 'inherit') {
        // 具名色 → 用 canvas 转 hex
        const c = document.createElement('canvas').getContext('2d');
        c.fillStyle = '#000'; c.fillStyle = s;
        const r2 = c.fillStyle;
        if (/^#[0-9a-f]{6}$/i.test(r2)) return { hex: r2.toUpperCase(), a: 1 };
      }
      return null;
    };

    /* ── 作者样式表里字面写过的颜色（hex / rgb() / hsl() / 具名） ── */
    const cssColors = new Map(); // hex -> {n, ctx[]}
    const addCss = (v, ctx) => {
      const o = parse(v);
      if (!o) {
        // 值里可能内嵌颜色，例如 border: 1px solid #ABC
        for (const tok of String(v).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []) {
          const o2 = parse(tok);
          if (o2) { if (!cssColors.has(o2.hex)) cssColors.set(o2.hex, { n: 0, ctx: [] }); const r2 = cssColors.get(o2.hex); r2.n++; if (r2.ctx.length < 2) r2.ctx.push(ctx); }
        }
        return;
      }
      if (!cssColors.has(o.hex)) cssColors.set(o.hex, { n: 0, ctx: [] });
      const rec = cssColors.get(o.hex); rec.n++;
      if (rec.ctx.length < 2) rec.ctx.push(ctx);
    };
    const walk = (rules) => {
      for (const rule of rules || []) {
        if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules); continue; }
        if (!rule.style) continue;
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i];
          const v = rule.style.getPropertyValue(prop);
          if (/color|background|border|shadow|fill|stroke|outline|gradient/i.test(prop)) {
            addCss(v, (rule.selectorText || '').slice(0, 40) + ' { ' + prop + ' }');
            for (const tok of String(v).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []) addCss(tok, (rule.selectorText || '').slice(0, 40) + ' { ' + prop + ' }');
          }
        }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }

    /* ── HTML 属性里的颜色 ── */
    const attrColors = new Map();
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes || []) {
        if (!/fill|stroke|color|style|stop-color|flood-color/i.test(a.name)) continue;
        for (const tok of String(a.value).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []) {
          const o = parse(tok);
          if (o) { if (!attrColors.has(o.hex)) attrColors.set(o.hex, { n: 0, ctx: [] }); const rr = attrColors.get(o.hex); rr.n++; if (rr.ctx.length < 2) rr.ctx.push(el.tagName.toLowerCase() + '[' + a.name + ']'); }
        }
      }
    }

    /* ── 真实上屏：分类统计 ── */
    // (a) 文字色：只有承载文字节点的元素的 color
    const textColors = new Map();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seenEls = new Set();
    while (tw.nextNode()) {
      const n = tw.currentNode;
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || seenEls.has(el)) continue;
      seenEls.add(el);
      const o = parse(getComputedStyle(el).color);
      if (!o) continue;
      const k = o.hex + (o.a < 1 ? '@' + o.a : '');
      if (!textColors.has(k)) textColors.set(k, { hex: o.hex, a: o.a, n: 0, sample: [] });
      const rec = textColors.get(k); rec.n++;
      if (rec.sample.length < 3) rec.sample.push(n.textContent.trim().slice(0, 14));
    }

    // (b) 背景/边框/描边：只算真实可见元素（有尺寸、不是 display:none）
    const vp = { w: innerWidth, h: innerHeight, docH: document.documentElement.scrollHeight };
    const surfColors = new Map();
    const noteSurf = (val, el, kind) => {
      const o = parse(val);
      if (!o) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const area = Math.min(rect.width, vp.w) * Math.min(rect.height, vp.docH);
      const k = o.hex + (o.a < 1 ? '@' + o.a : '');
      if (!surfColors.has(k)) surfColors.set(k, { hex: o.hex, a: o.a, n: 0, maxArea: 0, kinds: new Set(), sample: [] });
      const rec = surfColors.get(k); rec.n++; rec.maxArea = Math.max(rec.maxArea, area); rec.kinds.add(kind);
      if (rec.sample.length < 3) rec.sample.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ':' + kind);
    };
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      noteSurf(cs.backgroundColor, el, 'bg');
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none') noteSurf(cs['border' + s + 'Color'], el, 'border');
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) noteSurf(cs.outlineColor, el, 'outline');
      // ⚠️ 坑：`fill` / `stroke` 在**普通 HTML 元素**上也有 computed 值（默认是 rgb(0,0,0) /
      // none），但它不画任何东西。第一版把 html/body 的 fill 当成"99.99% 面积的黑色上屏"，
      // 于是 30/30 案都多出一条假的 #000000。必须限定在 SVG 元素内。
      if (window.SVGElement && el instanceof SVGElement) {
        if (cs.stroke && cs.stroke !== 'none') noteSurf(cs.stroke, el, 'stroke');
        if (cs.fill && cs.fill !== 'none' && cs.fill !== 'rgba(0, 0, 0, 0)') noteSurf(cs.fill, el, 'fill');
      }
    }

    const classify = (hex) => {
      if (claimed.has(hex)) return 'claimed';
      if (attrColors.has(hex)) return 'html-attr';
      if (cssColors.has(hex)) return 'author-css';
      return 'ua-or-derived';
    };
    const textArr = [...textColors.values()].map((x) => ({ ...x, src: classify(x.hex), areaPct: 0 }))
      .sort((a, c) => c.n - a.n);
    const surfArr = [...surfColors.values()].map((x) => ({
      hex: x.hex, a: x.a, n: x.n, kinds: [...x.kinds], sample: x.sample,
      areaPct: +(x.maxArea / (vp.w * vp.docH) * 100).toFixed(3), src: classify(x.hex),
    })).sort((a, c) => c.areaPct - a.areaPct);

    return {
      claimed, textArr, surfArr, vp,
      cssColorN: cssColors.size,
      // 声称色的实际使用情况
      claimedUse: claimedArr.map((h) => ({
        hex: h,
        asText: textColors.has(h) || textColors.has(h + '@1'),
        textN: (textColors.get(h) || {}).n || 0,
        asSurface: surfColors.has(h) || surfColors.has(h + '@1'),
        maxAreaPct: Math.max(...[...surfColors.values()].filter((x) => x.hex === h).map((x) => +(x.maxArea / (vp.w * vp.docH) * 100).toFixed(3)), 0),
      })),
    };
  }, claimed);

  out[id] = r;
  const notClaimedText = r.textArr.filter((x) => x.src !== 'claimed');
  const notClaimedSurf = r.surfArr.filter((x) => x.src !== 'claimed' && x.a === 1);
  console.log(id,
    '| 文字色: 声称外=' + notClaimedText.length + ' [' + notClaimedText.map((x) => x.hex + '(' + x.src + ',' + x.n + ')').join(' ') + ']');
  console.log('    表面色: 声称外=' + notClaimedSurf.length + ' [' + notClaimedSurf.slice(0, 6).map((x) => x.hex + '(' + x.src + ',' + x.areaPct + '%)').join(' ') + ']');
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'color-origins-v2.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote color-origins-v2.json');
