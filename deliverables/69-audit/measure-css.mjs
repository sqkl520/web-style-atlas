// 探针 3：用 CDP 读 **computed style**（不是解析 CSS 文本）逐案取"真实值"。
// 为什么必须 computed：提示词警告过 :root 里可能有死变量；文本里也可能有被层叠覆盖的死声明。
// 端口 8512。输出 measured.json。
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8512;
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

const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d)).sort();
const cases = dirs.map((d) => ({ id: d.slice(0, 3), dir: d, url: `http://127.0.0.1:${PORT}/${d}/index.html` }));

/* ───────────────────────── 页内探针 ───────────────────────── */
function pageProbe() {
  const out = { url: location.href, title: document.title, vw: innerWidth };
  const all = Array.from(document.querySelectorAll('*'));
  out.elCount = all.length;

  const hex = (rgb) => {
    const m = String(rgb).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (!a) return null;
    const h = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex: h, a: +a.toFixed(3) };
  };

  /* ---- 1. 真正画到屏幕上的颜色 ---- */
  const painted = new Map(); // hex -> {a, n, where:Set}
  const addP = (val, where) => {
    if (!val) return;
    const one = hex(val);
    if (!one) return;
    const k = one.hex + (one.a < 1 ? '@' + one.a : '');
    if (!painted.has(k)) painted.set(k, { hex: one.hex, a: one.a, n: 0, where: new Set() });
    const rec = painted.get(k); rec.n++; if (rec.where.size < 8) rec.where.add(where);
  };
  let gradCount = 0, blurBackground = 0, backdropCount = 0, textShadowCount = 0, glowTextCount = 0;
  const radii = []; // 非零圆角
  const shadows = { none: 0, inset: 0, outset: 0, dropFilter: 0 };
  const borderW = new Map(); // px -> {n, where:Set}
  const outlineW = new Map();
  const emojiHits = [];
  const iconFontHits = [];
  const monoUses = [];

  const sel = (el) => {
    const t = el.tagName.toLowerCase();
    const c = (el.className && typeof el.className === 'string') ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return t + (c ? '.' + c : '') + (el.id ? '#' + el.id : '');
  };

  for (const el of all) {
    const cs = getComputedStyle(el);
    const s = sel(el);

    addP(cs.color, s + '.color');
    addP(cs.backgroundColor, s + '.bg');
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const w = parseFloat(cs['border' + side + 'Width']);
      if (w > 0) {
        addP(cs['border' + side + 'Color'], s + '.border');
        const key = +w.toFixed(2);
        if (!borderW.has(key)) borderW.set(key, { n: 0, where: new Set() });
        const b = borderW.get(key); b.n++; if (b.where.size < 6) b.where.add(s);
        // 每侧每种宽度只计一次（同一元素四边相同 width 不重复计数）
      }
      const ow = parseFloat(cs['outline' + side[0] + side.slice(1).toLowerCase() + 'Width'] || cs.outlineWidth);
      if (side === 'Top' && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
        const k2 = +parseFloat(cs.outlineWidth).toFixed(2);
        if (!outlineW.has(k2)) outlineW.set(k2, { n: 0, where: new Set() });
        const o = outlineW.get(k2); o.n++; if (o.where.size < 6) o.where.add(s);
        addP(cs.outlineColor, s + '.outline');
      }
    }
    if (cs.textDecorationLine !== 'none') addP(cs.textDecorationColor, s + '.deco');
    if (cs.fill && cs.fill !== 'none') addP(cs.fill, s + '.fill');
    if (cs.stroke && cs.stroke !== 'none') addP(cs.stroke, s + '.stroke');
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      if (/gradient\(/.test(bi)) { gradCount++; addP('GRADIENT', s + '.bgImage'); }
      if (/url\(/.test(bi)) addP('URL', s + '.bgImage');
    }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') backdropCount++;

    for (const side of ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft']) {
      const r = parseFloat(cs['border' + side + 'Radius']);
      if (r > 0) { radii.push({ sel: s, side, r: cs['border' + side + 'Radius'] }); break; }
    }
    const bs = cs.boxShadow;
    if (!bs || bs === 'none') shadows.none++;
    else if (/inset/.test(bs)) shadows.inset++;
    else shadows.outset++;
    if (cs.filter && /drop-shadow/.test(cs.filter)) shadows.dropFilter++;
    if (cs.textShadow && cs.textShadow !== 'none') { textShadowCount++; if (/rgb\(\s*(?:2[0-5][0-9]|[0-9]{1,2})\s*,/.test(cs.textShadow)) glowTextCount++; }

    // 字体
    const fam = cs.fontFamily || '';
    const first = (fam.split(',')[0] || '').replace(/["']/g, '').trim();
    if (/icon|awesome|material-icons|icomoon|glyphicon/i.test(fam)) iconFontHits.push({ sel: s, fam });
    if (el.tagName === 'CODE' || /mono|code|num|price|meta/i.test(typeof el.className === 'string' ? el.className : '')) {
      if (monoUses.length < 6) monoUses.push({ sel: s, fam, fvn: cs.fontVariantNumeric, ffs: cs.fontFeatureSettings, ta: cs.textAlign });
    }
  }

  // emoji：只扫可见文本
  const txt = document.body.innerText || '';
  const emo = txt.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) || [];
  if (emo.length) emojiHits.push({ n: emo.length, sample: [...new Set(emo)].slice(0, 8).join('') });

  out.painted = [...painted.values()].map((r) => ({ hex: r.hex, a: r.a, n: r.n, where: [...r.where] }));
  out.gradCount = gradCount;
  out.backdropCount = backdropCount;
  out.textShadowCount = textShadowCount;
  out.radiiNonZero = radii.slice(0, 40);
  out.radiiCount = radii.length;
  out.shadows = shadows;
  out.borderWidths = [...borderW.entries()].map(([w, v]) => ({ w, n: v.n, where: [...v.where] })).sort((a, b) => a.w - b.w);
  out.outlineWidths = [...outlineW.entries()].map(([w, v]) => ({ w, n: v.n, where: [...v.where] })).sort((a, b) => a.w - b.w);
  out.emoji = emojiHits;
  out.iconFonts = iconFontHits.slice(0, 5);
  out.monoUses = monoUses;

  // 字体族清单（声明层）
  const famSet = new Map();
  for (const el of all) {
    const fam = getComputedStyle(el).fontFamily || '';
    for (const f of fam.split(',')) {
      const k = f.replace(/["']/g, '').trim();
      if (!k) continue;
      if (!famSet.has(k)) famSet.set(k, { n: 0, generic: /^(serif|sans-serif|monospace|cursive|system-ui|ui-\w+|-apple-system|inherit|initial)$/i.test(k) });
      famSet.get(k).n++;
    }
  }
  out.fontFamilies = [...famSet.entries()].map(([f, v]) => ({ f, n: v.n, generic: v.generic })).sort((a, b) => b.n - a.n);

  // 关键元素
  const pick = (q) => document.querySelector(q);
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      sel: sel(el), text: (el.textContent || '').trim().slice(0, 40),
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      color: cs.color, bg: cs.backgroundColor, letterSpacing: cs.letterSpacing,
    };
  };
  out.h1 = info(pick('h1'));
  out.h1s = Array.from(document.querySelectorAll('h1')).map(info).slice(0, 4);
  out.body = info(document.body);

  /* :root 里声明的色值变量（只用来"枚举候选"，真假由 painted 定） */
  const rootDecl = [];
  try {
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      for (const r of rules || []) {
        if (!r.style) continue;
        if (r.selectorText && /:root|^html$/i.test(r.selectorText.trim())) {
          for (const p of r.style) {
            if (p.startsWith('--')) rootDecl.push({ name: p, value: r.style.getPropertyValue(p).trim() });
          }
        }
      }
    }
  } catch (e) { out.rootErr = String(e && e.message); }
  const rootHex = [];
  for (const d of rootDecl) {
    const m = d.value.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    for (const h of m) {
      let hh = h.toUpperCase();
      if (hh.length === 4) hh = '#' + hh.slice(1).split('').map((c) => c + c).join('');
      if (hh.length === 9) hh = hh.slice(0, 7);
      rootHex.push({ name: d.name, hex: hh });
    }
  }
  out.rootHexVars = rootHex;
  out.rootVarCount = rootDecl.length;

  /* 颜色对比：正文/背景（帮助判断"底色是否被真的用上"） */
  out.bodyBg = getComputedStyle(document.body).backgroundColor;
  out.htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  out.docHeight = document.documentElement.scrollHeight;

  /* -------- 图片位：img/svg 可见尺寸 -------- */
  const imgs = Array.from(document.querySelectorAll('img')).map((im) => {
    const r = im.getBoundingClientRect();
    return { src: (im.getAttribute('src') || '').slice(-40), w: Math.round(r.width), h: Math.round(r.height) };
  });
  out.imgs = { n: imgs.length, visible: imgs.filter((i) => i.w > 4 && i.h > 4).length, sample: imgs.slice(0, 12) };

  /* -------- 轮播/自动播放痕迹 -------- */
  out.carouselTraces = {
    ariaLive: document.querySelectorAll('[aria-live="polite"]').length,
    autoplayAttr: document.querySelectorAll('[autoplay]').length,
    swiperLike: document.querySelectorAll('[class*=swiper],[class*=carousel],[class*=slider],[class*=marquee]').length,
    setIntervalScripts: (document.documentElement.innerHTML.match(/setInterval\s*\(/g) || []).length,
    requestAnimationFrame: (document.documentElement.innerHTML.match(/requestAnimationFrame\s*\(/g) || []).length,
  };

  return out;
}

/* ───────────────────────── 逐案量测 ───────────────────────── */
const b = await Browser.launch({ width: 1440, height: 900 });
const result = { measuredAt: new Date().toISOString(), viewport: '1440x900', cases: {}, failures: [] };

for (const c of cases) {
  const p = await b.newPage({ width: 1440, height: 900 });
  try {
    await p.goto(c.url, { settleMs: 1200, timeoutMs: 30000 });
    await p.eval(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true));
    await sleep(300);
    const data = await p.eval(pageProbe);

    // 真实渲染字体：CSS.getPlatformFontsForNode（只有它知道"到底谁在画字"）
    try {
      await p.send('DOM.enable'); await p.send('CSS.enable');
      const { root } = await p.send('DOM.getDocument', { depth: 0 });
      const targets = [
        ['h1', 'h1'],
        ['p', 'p.lead, p.hero__lead, main p, body p'],
        ['code', 'code, .mono, .num'],
      ];
      data.platformFonts = {};
      for (const [key, q] of targets) {
        const [first] = q.split(', ');
        const qq = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: first });
        if (qq && qq.nodeId) {
          const pf = await p.send('CSS.getPlatformFontsForNode', { nodeId: qq.nodeId });
          data.platformFonts[key] = (pf.fonts || []).map((f) => ({ family: f.familyName, glyphs: f.glyphCount, isCustom: f.isCustomFont }));
        }
      }
    } catch (e) { data.platformFontsErr = String(e && e.message).slice(0, 200); }

    data.consoleErrors = p.consoleErrors.slice(0, 5);
    result.cases[c.id] = data;
    const nz = data.radiiCount, hexes = data.painted.filter((x) => x.hex !== 'GRADIENT' && x.hex !== 'URL').length;
    console.log(c.id, 'els=' + data.elCount, 'colors=' + hexes, 'radius!=0:' + nz,
      'shadows=' + JSON.stringify(data.shadows), 'bw=' + data.borderWidths.map((x) => x.w).join(','));
  } catch (e) {
    console.log(c.id, 'FAILED', String(e && e.message).slice(0, 160));
    result.failures.push({ id: c.id, err: String(e && e.message).slice(0, 300) });
  }
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'measured.json'), JSON.stringify(result, null, 1), 'utf8');
console.log('\nfailures:', result.failures.length, JSON.stringify(result.failures));
console.log('wrote measured.json');
