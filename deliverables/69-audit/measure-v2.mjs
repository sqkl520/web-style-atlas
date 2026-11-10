// 探针 7（权威版）：修正 measure-css.mjs 三个量法错误后的重测。
//
// 三处修正的由来（都有实测证据，见 diagnose.json / width-precision.json）：
//  ① 线宽：getComputedStyle 与 Typed OM 都会把 0.4px 取整成 1px（实测：0.4/0.8/1.25 全报 1px，
//     5.5 报 5px，14.5 报 14px）。只有 CSSOM 的**声明值**保住小数。所以线宽要同时收：
//     声明值（小数保真）+ SVG stroke-width（本案 0.4/0.8 画在 <path> 上，border 里根本没有）。
//  ② 等宽字体：上一版按 class 猜"哪个是数字元素"，抽到的常是 body 段落的 .meta。
//     改成：先找 computed font-family 里含声称等宽族名的元素，再看 CSS.getPlatformFontsForNode。
//  ③ 配色：分辨"作者样式表里字面写过的 hex"与"UA 默认色（#0000EE 未访问链接、#000 黑）"，
//     并记录每个颜色有没有承载文字（色彩可靠性 vs 装饰性）。
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8515;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const b = await Browser.launch({ width: 1440, height: 900 });
// 注意：DOM.enable / CSS.enable 是**页级**域，必须在 page.send 上调（在 browser 上调会 'DOM.enable' wasn't found）

function pageProbe() {
  const out = {};
  const hexOf = (v) => {
    const s = String(v);
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      const a = p.length > 3 ? p[3] : 1;
      if (!a) return null;
      return { hex: '#' + p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase(), a: +a.toFixed(2) };
    }
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) {
      let h = s.toUpperCase();
      if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
      if (h.length > 7) h = h.slice(0, 7);
      return { hex: h, a: 1 };
    }
    return null;
  };
  const sel = (el) => el.tagName.toLowerCase() +
    (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') +
    (el.id ? '#' + el.id : '');

  /* ── 1. 作者样式表：声明过的 hex、线宽、长度变量、color-mix ── */
  const authorHex = new Map();   // hex -> {n, text, ctx[]}
  const declWidths = new Map();  // "0.4px" -> {n, where[]}
  const customLens = [];
  const colorMix = [];
  let sheetsSeen = 0, sheetsBlocked = 0;
  const walk = (rules, sheet) => {
    for (const rule of rules || []) {
      // ⚠️ 坑（实测踩到）：现代 Chrome 里 **CSSStyleRule 也有 .cssRules**（空的 CSSRuleList，
      // 是 truthy 的）。写成 `if (rule.cssRules) { walk(...); continue; }` 会把**每一条样式规则**
      // 当成容器跳过 —— 于是我第一版 authorHex / declWidths 全是空数组，
      // 看起来像"作者的 CSS 里一个 hex 都没写"，其实是遍历 bug。必须判 length。
      if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules, sheet); continue; }
      if (!rule.style) continue;
      const s = rule.style;
      for (let i = 0; i < s.length; i++) {
        const prop = s[i];
        const v = s.getPropertyValue(prop);
        if (!v) continue;
        if (prop.startsWith('--') && /^\d*\.?\d+px$/.test(v.trim())) customLens.push({ prop, v: v.trim(), rule: rule.selectorText });
        if (/color-mix|oklch|oklab|lab\(|lch\(/i.test(v)) colorMix.push({ rule: rule.selectorText, prop, v: v.slice(0, 70) });
        if (/border(-\w+)?(-width)?$|^outline(-width)?$|^stroke-width$/.test(prop)) {
          const m = String(v).match(/(\d*\.?\d+)px/g);
          for (const one of m || []) {
            if (!declWidths.has(one)) declWidths.set(one, { n: 0, where: new Set() });
            const r = declWidths.get(one); r.n++; if (r.where.size < 5) r.where.add(prop + ' @ ' + (rule.selectorText || '').slice(0, 40));
          }
        }
        const mm = String(v).match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        for (const h0 of mm) {
          let h = h0.toUpperCase();
          if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
          if (h.length > 7) h = h.slice(0, 7);
          if (!authorHex.has(h)) authorHex.set(h, { n: 0, ctx: [] });
          const rec = authorHex.get(h); rec.n++;
          if (rec.ctx.length < 2) rec.ctx.push((rule.selectorText || '').slice(0, 45) + ' { ' + prop + ':' + String(v).slice(0, 22) + ' }');
        }
      }
    }
  };
  for (const sh of document.styleSheets) {
    const href = sh.href || '';
    if (/_fonts\/css/.test(href)) continue;      // 字体包里没有颜色
    try { walk(sh.cssRules, href); sheetsSeen++; } catch (e) { sheetsBlocked++; }
  }

  /* ── 2. 上屏色（含出处、是否承载文字、面积代理） ── */
  const painted = new Map(); // key -> {hex,a,n,textN,where[]}
  const addP = (val, where, hasText) => {
    const o = hexOf(val);
    if (!o) return;
    const k = o.hex + (o.a < 1 ? '@' + o.a : '');
    if (!painted.has(k)) painted.set(k, { hex: o.hex, a: o.a, n: 0, textN: 0, where: [] });
    const r = painted.get(k); r.n++;
    if (hasText) r.textN++;
    if (r.where.length < 10) r.where.push(where);
  };

  const radii = [];
  const borderComputed = new Map();
  const shadows = { none: 0, inset: 0, outset: 0, dropFilter: 0 };
  const svgStrokes = new Map();
  const iconFonts = [];
  const monoCandidates = new Set();

  const all = Array.from(document.querySelectorAll('*'));
  for (const el of all) {
    const cs = getComputedStyle(el);
    const s = sel(el);
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    addP(cs.color, s + '.color', hasText);
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') addP(cs.backgroundColor, s + '.bg', hasText);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const w = parseFloat(cs['border' + side + 'Width']);
      if (w > 0 && cs['border' + side + 'Style'] !== 'none') {
        addP(cs['border' + side + 'Color'], s + '.border', hasText);
        if (side === 'Top') {
          const k = +w.toFixed(2);
          if (!borderComputed.has(k)) borderComputed.set(k, { n: 0, where: new Set() });
          const r0 = borderComputed.get(k); r0.n++; if (r0.where.size < 5) r0.where.add(s);
        }
      }
    }
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) addP(cs.outlineColor, s + '.outline', hasText);
    if (cs.textDecorationLine !== 'none') addP(cs.textDecorationColor, s + '.deco', hasText);
    if (cs.fill && cs.fill !== 'none') addP(cs.fill, s + '.svgfill', hasText);
    if (cs.stroke && cs.stroke !== 'none') addP(cs.stroke, s + '.svgstroke', false);
    if (cs.backgroundImage && cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) { /* 位图不算色 */ }

    // SVG stroke-width：本案 0.4/0.8 的落点
    const sw = cs.strokeWidth;
    if (sw && sw !== '0px' && cs.stroke && cs.stroke !== 'none') {
      const key = String(sw).trim();
      if (!svgStrokes.has(key)) svgStrokes.set(key, { n: 0, where: new Set() });
      const r1 = svgStrokes.get(key); r1.n++; if (r1.where.size < 5) r1.where.add(s);
    }

    for (const side of ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft']) {
      const r = parseFloat(cs['border' + side + 'Radius']);
      if (r > 0) { radii.push({ sel: s, tag: el.tagName, type: el.type || '', r: cs['border' + side + 'Radius'] }); break; }
    }
    const bs = cs.boxShadow;
    if (!bs || bs === 'none') shadows.none++;
    else if (/inset/.test(bs)) shadows.inset++;
    else shadows.outset++;
    if (cs.filter && /drop-shadow/.test(cs.filter)) shadows.dropFilter++;

    const fam = cs.fontFamily || '';
    if (/icon|awesome|material-icons|icomoon|glyphicon/i.test(fam)) iconFonts.push({ sel: s, fam });
    for (const f of fam.split(',')) {
      const k = f.replace(/["']/g, '').trim();
      if (k && !/^(serif|sans-serif|monospace|cursive|system-ui|inherit|initial)$/i.test(k)) monoCandidates.add(k);
    }
  }

  // 每个 font-family 族的用量
  const famCount = new Map();
  for (const el of all) {
    for (const f of (getComputedStyle(el).fontFamily || '').split(',')) {
      const k = f.replace(/["']/g, '').trim();
      if (!k) continue;
      if (!famCount.has(k)) famCount.set(k, { n: 0, generic: /^(serif|sans-serif|monospace|cursive|system-ui|ui-\w+|-apple-system)$/i.test(k) });
      famCount.get(k).n++;
    }
  }

  // tabular-nums 使用
  let tabularN = 0;
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (/tabular-nums/.test(cs.fontVariantNumeric) || /"tnum"/.test(cs.fontFeatureSettings)) tabularN++;
  }

  out.painted = [...painted.values()];
  out.authorHex = [...authorHex.entries()].map(([h, v]) => ({ hex: h, n: v.n, ctx: v.ctx }));
  out.declWidths = [...declWidths.entries()].map(([w, v]) => ({ w, n: v.n, where: [...v.where] }))
    .sort((a, b) => parseFloat(a.w) - parseFloat(b.w));
  out.borderComputed = [...borderComputed.entries()].map(([w, v]) => ({ w, n: v.n, where: [...v.where] })).sort((a, b) => a.w - b.w);
  out.svgStrokes = [...svgStrokes.entries()].map(([w, v]) => ({ w, n: v.n, where: [...v.where] }));
  out.customLens = customLens.slice(0, 25);
  out.colorMix = colorMix.slice(0, 10); out.colorMixN = colorMix.length;
  out.sheetsSeen = sheetsSeen; out.sheetsBlocked = sheetsBlocked;
  out.radii = radii.slice(0, 40); out.radiiN = radii.length;
  out.shadows = shadows;
  out.iconFonts = iconFonts.slice(0, 5);
  out.famCount = [...famCount.entries()].map(([f, v]) => ({ f, n: v.n, generic: v.generic })).sort((a, b) => b.n - a.n);
  out.tabularN = tabularN;
  out.h1 = (() => { const h = document.querySelector('h1'); if (!h) return null; const cs = getComputedStyle(h); return { fam: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, color: cs.color }; })();
  out.bodyText = (() => { const cs = getComputedStyle(document.body); return { fam: cs.fontFamily, color: cs.color, bg: cs.backgroundColor }; })();
  out.imgN = document.querySelectorAll('img').length;
  out.imgVisible = Array.from(document.querySelectorAll('img')).filter((im) => { const r = im.getBoundingClientRect(); return r.width > 4 && r.height > 4; }).length;
  out.elCount = all.length;
  out.docH = document.documentElement.scrollHeight;
  out.emoji = ((document.body.innerText || '').match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) || []).length;
  out.gradN = all.filter((el) => /gradient\(/.test(getComputedStyle(el).backgroundImage || '')).length;
  out.backdropN = all.filter((el) => { const v = getComputedStyle(el).backdropFilter; return v && v !== 'none'; }).length;
  out.textShadowN = all.filter((el) => { const v = getComputedStyle(el).textShadow; return v && v !== 'none'; }).length;
  out.carousel = {
    autoplay: document.querySelectorAll('[autoplay]').length,
    swiperLike: document.querySelectorAll('[class*=swiper],[class*=carousel],[class*=slider],[class*=marquee]').length,
    ariaLive: document.querySelectorAll('[aria-live="polite"]').length,
    setInterval: (document.documentElement.innerHTML.match(/setInterval\s*\(/g) || []).length,
    rAF: (document.documentElement.innerHTML.match(/requestAnimationFrame\s*\(/g) || []).length,
  };
  out.forms = Array.from(document.querySelectorAll('input,button,select,textarea')).map((el) => ({
    tag: el.tagName, type: el.type || '', cls: String(el.className || '').slice(0, 30),
    radius: getComputedStyle(el).borderTopLeftRadius,
    border: getComputedStyle(el).borderTopWidth + ' ' + getComputedStyle(el).borderTopStyle + ' ' + getComputedStyle(el).borderTopColor,
  }));
  return out;
}

/* ── 逐案 ── */
const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d)).sort();
const res = { measuredAt: new Date().toISOString(), viewport: '1440x900 dsf=1', cases: {}, failures: [] };

for (const d of dirs) {
  const id = d.slice(0, 3);
  const p = await b.newPage({ width: 1440, height: 900 });
  try {
    await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1500 });
    await p.send('DOM.enable'); await p.send('CSS.enable');
    await p.eval(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true));
    await sleep(200);
    const data = await p.eval(pageProbe);

    /* 平台字体：对"声称链首族"与"等宽声称族"各找一个真的用到它的元素 */
    const { root } = await p.send('DOM.getDocument', { depth: 0 });
    data.platform = {};
    const trySel = async (key, selector) => {
      try {
        const q = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        if (!q || !q.nodeId) return;
        const pf = await p.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
        data.platform[key] = { selector, fonts: (pf.fonts || []).map((f) => ({ family: f.familyName, glyphs: f.glyphCount, custom: f.isCustomFont })) };
      } catch (e) { data.platform[key] = { selector, err: String(e.message).slice(0, 120) }; }
    };
    await trySel('h1', 'h1');
    await trySel('p', 'main p, body > p, .lede, .lead');
    // 等宽：找 computed font-family 里含声称 mono 族的元素
    const monoFace = (con.per[id].items.find((i) => i.kind === 'font-mono') || {}).params;
    if (monoFace && monoFace.face) {
      const target = await p.eval((face) => {
        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
          const fam = getComputedStyle(el).fontFamily || '';
          if (fam.includes(face) && (el.textContent || '').trim().length) {
            const t = el.tagName.toLowerCase();
            return t + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
          }
        }
        return null;
      }, monoFace.face);
      if (target) await trySel('mono', target);
      data.monoSel = target;
      data.monoInFamList = (data.famCount || []).some((f) => f.f === monoFace.face);
    }
    data.consoleErrors = p.consoleErrors.slice(0, 3);
    res.cases[id] = data;
    console.log(id, 'els=' + data.elCount, 'hexAuthor=' + data.authorHex.length,
      'declW=' + data.declWidths.map((x) => x.w).join(','),
      'svgW=' + data.svgStrokes.map((x) => x.w).join(','),
      'mono=' + JSON.stringify(data.platform.mono ? data.platform.mono.fonts.map((f) => f.family) : null));
  } catch (e) {
    console.log(id, 'FAILED', String(e.message).slice(0, 140));
    res.failures.push({ id, err: String(e.message).slice(0, 240) });
  }
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'measured-v2.json'), JSON.stringify(res, null, 1), 'utf8');
console.log('failures=' + res.failures.length);
