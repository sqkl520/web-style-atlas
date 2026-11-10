#!/usr/bin/env node
// 63-test · step 3: the A/B render harness.
//
// Same browser, same viewport, same fonts, same assets. The ONLY difference between
// the two pages is the copy (see 01-swap.mjs). Everything measured here is therefore
// attributable to "the mechanism reading the words".
//
// Serves the repo read-only; the swap twin lives next to its original inside
// deliverables/63-test/replica/<case>/index.swap.html, so relative asset and
// ../_fonts paths resolve exactly as in production.
//
//   node 03-render.mjs [case ...]        (no args = all nine)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const OUT = join(ROOT, 'deliverables', '63-test');
const SHOTS = join(OUT, 'shots');
const DATA = join(OUT, 'data');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(DATA, { recursive: true });

const PORT = +(process.env.PORT || 9612);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.avif': 'image/avif', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  const f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  let b; try { b = readFileSync(f); } catch { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(b);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;

const CASES = ['S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual'];

// five representative elements per case, chosen after reading 02-structure output:
// three big section blocks + two repeated/atomic units the mechanism actually drives.
const KEYS = {
  'S03-long-exposure-observatory': ['.wrap.hero', '.plate', '.stream .band:first-child', '.readouts table', '.plates'],
  'S05-pixel-cold-storage-console': ['.nameplate', '.hero.section', '.console.section', '.plates.section', '.colophon'],
  'S10-grid-versus-sheet': ['.masthead', '.compare', '.plates', '.motion', 'footer'],
  'S14-zero-g-launch-sequence': ['.deck', '.fault', '.plates-sec', '.stations-sec', '.paths-sec'],
  'S15-fishery-floor-ledger': ['.masthead', '.atlas', '.year', '.zones', '.spec'],
  'S18-phosphor-service-deck': ['.mast', '.stream', '.band', '.tags', '.fault'],
  'S20-plotter-soundfield': ['.masthead', '.sheet-sec', '.keys', '.plates-sec', '.maps-sec'],
  'S21-interlocking-release-book': ['.board', '.sheet', '.excl', '.states', '.ledger-foot'],
  'S29-wire-bound-safety-manual': ['.topbar', '#ch1', '#ch2', '#ch3', '.fault'],
};

const VIEWPORTS = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];

// ---------- in-page measurement ----------
const measure = ({ keys }) => {
  const R = (el) => { const r = el.getBoundingClientRect(); return { top: +(r.top + scrollY).toFixed(1), left: +r.left.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const pathOf = (el) => {
    const seg = []; let n = el;
    while (n && n.nodeType === 1 && n.tagName !== 'HTML') {
      const cls = (typeof n.className === 'string' && n.className.trim()) ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      seg.unshift(n.tagName.toLowerCase() + cls);
      if (seg.length >= 4) break;
      n = n.parentElement;
    }
    return seg.join(' > ');
  };
  const de = document.documentElement;
  const out = {
    docH: de.scrollHeight, docW: de.scrollWidth,
    vw: innerWidth, vh: innerHeight,
    bodyH: document.body.scrollHeight,
    hOverflow: Math.max(0, de.scrollWidth - de.clientWidth),
    keys: {}, keyMissing: [],
  };

  for (const sel of keys) {
    const el = document.querySelector(sel);
    if (!el) { out.keyMissing.push(sel); continue; }
    out.keys[sel] = R(el);
  }

  // ---- text overflow: element whose content is wider/taller than its box ----
  const tover = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.clientWidth < 2) continue;
    const ownsText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!ownsText) continue;
    const dx = el.scrollWidth - el.clientWidth;
    const dy = el.scrollHeight - el.clientHeight;
    if (dx > 1) tover.push({ k: 'x', px: dx, el: pathOf(el), txt: el.textContent.trim().slice(0, 40) });
    else if (dy > 1 && cs.overflowY !== 'visible' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') tover.push({ k: 'y', px: dy, el: pathOf(el), txt: el.textContent.trim().slice(0, 40) });
  }
  out.textOverflow = { n: tover.length, worst: tover.sort((a, b) => b.px - a.px).slice(0, 8) };

  // ---- clipped / truncated glyph runs: any inline text box wider than its parent box ----
  const clipped = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,td,th,dd,dt,span,figcaption,button,a,code,samp,b,em,strong,small,label,summary')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    if (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.webkitLineClamp !== 'none') {
      if (el.scrollWidth - el.clientWidth > 1) clipped.push({ el: pathOf(el), over: el.scrollWidth - el.clientWidth, txt: el.textContent.trim().slice(0, 40) });
    }
  }
  out.ellipsisClips = { n: clipped.length, worst: clipped.sort((a, b) => b.over - a.over).slice(0, 6) };

  // ---- overlap between sibling blocks (the classic "layout tore" signal) ----
  const overlaps = [];
  const containers = new Set();
  for (const el of document.querySelectorAll('main *, header *, footer *, body > div, body > section')) containers.add(el.parentElement);
  for (const box of containers) {
    if (!box || box === document.body) continue;
    const kids = [...box.children].filter((k) => {
      const cs = getComputedStyle(k);
      return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed' && k.getBoundingClientRect().width > 8 && k.getBoundingClientRect().height > 8;
    });
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const ea = kids[i], eb = kids[j];
        if (ea.contains(eb) || eb.contains(ea)) continue;
        const a = ea.getBoundingClientRect(), b = eb.getBoundingClientRect();
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ix <= 1 || iy <= 1) continue;
        const area = ix * iy;
        const minArea = Math.min(a.width * a.height, b.width * b.height);
        if (area > 900 && area / minArea > 0.35) {
          overlaps.push({ a: pathOf(ea), b: pathOf(eb), area: Math.round(area), frac: +(area / minArea).toFixed(2), y: Math.round(Math.max(a.top + scrollY, b.top + scrollY)) });
        }
      }
    }
  }
  out.overlaps = { n: overlaps.length, worst: overlaps.sort((x, y) => y.area - x.area).slice(0, 8) };

  // ---- vertical whitespace holes inside main: a band of >=240px with no block in it ----
  const main = document.querySelector('main') || document.body;
  const blocks = [];
  for (const el of main.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.children.length > 6) continue;               // leaf-ish blocks only
    const r = el.getBoundingClientRect();
    if (r.height < 6 || r.width < 20) continue;
    blocks.push([r.top + scrollY, r.top + scrollY + r.height]);
  }
  blocks.sort((a, b) => a[0] - b[0]);
  let cur = 0, gaps = [];
  for (const [t, b] of blocks) { if (t > cur) gaps.push([cur, t]); if (b > cur) cur = b; }
  gaps = gaps.filter(([t, b]) => b - t >= 240).map(([t, b]) => ({ from: Math.round(t), to: Math.round(b), h: Math.round(b - t) }));
  const mainRect = main.getBoundingClientRect();
  out.holes = { n: gaps.length, total: gaps.reduce((s, g) => s + g.h, 0), list: gaps.slice(0, 8), mainH: Math.round(mainRect.height) };

  // ---- asset / stylesheet health ----
  out.brokenImgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
  out.sheets = document.styleSheets.length;
  out.badSheets = [];
  for (const s of document.styleSheets) { try { if (!s.cssRules) out.badSheets.push(s.href); } catch (e) { out.badSheets.push(s.href); } }
  out.fonts = document.fonts ? document.fonts.status : 'n/a';
  out.rules = (() => { let n = 0; for (const s of document.styleSheets) { try { n += s.cssRules.length; } catch (e) {} } return n; })();

  // ---- text-volume sanity: how much text is on the page (should be ~equal) ----
  out.textChars = (document.body.innerText || '').replace(/\s+/g, '').length;
  return out;
};

// ---------- scroll the page once so lazy images resolve, then return to top ----------
const warm = async (p) => {
  await p.eval(`(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 22)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
  })()`);
};

const shotsFor = async (p, path, tag, vp) => {
  const doc = await p.eval(`({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth })`);
  // common width keeps orig/swap strips directly stackable in an image diff
  const w = Math.max(320, doc.w);
  const scale = Math.min(0.62, 2600 / Math.max(doc.h, 1));
  await p.screenshot({ path: `${path}/${tag}-full.jpg`, format: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: w, height: doc.h, scale } });
  await p.screenshot({ path: `${path}/${tag}-fold.jpg`, format: 'jpeg', quality: 78 });
  return { w, h: doc.h, scale };
};

const only = process.argv.slice(2);
const cases = only.length ? CASES.filter((c) => only.some((o) => c.startsWith(o))) : CASES;
const VARIANTS = (process.env.VARIANTS || 'orig,swap').split(',').map((s) => s.trim()).filter(Boolean);
const TAGSUF = process.env.SHOTSUF || '';

const browser = await Browser.launch({ width: 1440, height: 900 });
const report = {};
try {
  for (const c of cases) {
    const dir = join(SHOTS, c);
    mkdirSync(dir, { recursive: true });
    const origUrl = `${BASE}/prototypes/${c}/index.html`;
    const swapPath = join(OUT, 'replica', c, 'index.swap.html');
    if (!existsSync(swapPath)) { console.log('!! missing swap for ' + c); continue; }

    report[c] = { keys: KEYS[c], views: {}, meta: {} };
    const urls = VARIANTS.map((v) => [v, v === 'orig' ? origUrl : `${BASE}/deliverables/63-test/replica/${c}/index.${v}.html`]);
    for (const [variant, url] of urls) {
      const p = await browser.newPage({ width: 1440, height: 900 });
      const loaded = await p.goto(url, { settleMs: 2200 });
      await warm(p);
      const meta = await p.eval(`({ title: document.title, sheets: [...document.styleSheets].map(s => s.href || 'inline'), imgs: document.images.length, broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length, chars: (document.body.innerText||'').replace(/\\s+/g,'').length })`);
      report[c].meta[variant] = { loaded, ...meta, consoleErrors: p.consoleErrors.slice(0, 6) };
      if (p.consoleErrors.length) {
        console.log(`  !! ${c} ${variant}: ${p.consoleErrors.length} JS exception(s) -> ${p.consoleErrors[0].slice(0, 120)}`);
      }
      for (const vp of VIEWPORTS) {
        await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w === 390 });
        await sleep(450);
        await p.eval('window.scrollTo(0,0)');
        await sleep(350);
        const m = await p.eval(measure, { keys: KEYS[c] });
        await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w === 390 });
        const sh = await shotsFor(p, dir, `${variant}-${vp.w}x${vp.h}`, vp);
        report[c].views[variant + '@' + vp.w] = { vp, ...m, shot: sh };
        console.log(`  ${c} ${variant} @${vp.w}x${vp.h}  docH=${m.docH} hOv=${m.hOverflow} keys=${Object.keys(m.keys).length}/${KEYS[c].length} textOv=${m.textOverflow.n} ovl=${m.overlaps.n} holes=${m.holes.n}/${m.holes.total}px chars=${m.textChars}`);
      }
      await p.close();
    }
    writeFileSync(join(DATA, `render-${c}.json`), JSON.stringify(report[c], null, 1));
  }
} finally {
  await browser.close(); server.close();
}
writeFileSync(join(DATA, `render-all${TAGSUF}.json`), JSON.stringify(report, null, 1));
console.log(`\nwrote data/render-all${TAGSUF}.json`);
