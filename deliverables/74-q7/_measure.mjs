import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/deliverables/74-q7';
const PORT = 9607;
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'out-S07-v2.html' : p.slice(1));
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/out-S07-v2.html`, { settleMs: 900 });

const out = await page.eval(() => {
  const q = (s) => document.querySelector(s);
  const cs = (s, prop) => { const e = q(s); return e ? getComputedStyle(e)[prop] : null; };
  const R = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const h1 = q('h1'); const h1cs = getComputedStyle(h1);
  const bodyFS = getComputedStyle(document.body).fontSize;
  const front = R('.leaf--front'), back = R('.leaf--back');
  const imgs = [...document.querySelectorAll('img')].map((im) => {
    const r = im.getBoundingClientRect();
    return { src: im.getAttribute('src'), w: Math.round(r.width), h: Math.round(r.height), r: +(r.width / r.height).toFixed(3), attr: im.getAttribute('width') + 'x' + im.getAttribute('height') };
  });
  const bleed = q('.leaf--front .bleed'); const bcs = getComputedStyle(bleed);
  const folio = q('.folio'); const fcs = getComputedStyle(folio);
  const hexes = new Set(); const radii = new Set(); const shadows = new Set(); const widths = new Set(); const fonts = new Set();
  [...document.querySelectorAll('*')].forEach((el) => {
    const s = getComputedStyle(el);
    [s.color, s.backgroundColor, s.borderTopColor, s.borderLeftColor, s.borderRightColor, s.borderBottomColor, s.outlineColor].forEach((v) => { if (v) hexes.add(v); });
    radii.add(s.borderTopLeftRadius);
    if (s.boxShadow !== 'none') shadows.add(s.boxShadow);
    [s.borderTopWidth, s.borderLeftWidth].forEach((w) => { if (parseFloat(w) > 0) widths.add(w); });
    fonts.add(s.fontFamily.split(',')[0].replace(/"/g, ''));
  });
  const frontText = q('.leaf--front .leaf__pad').innerText.replace(/\s+/g, '');
  const bleedText = bleed.innerText.replace(/\s+/g, '');
  const inFront = bleedText.split('').filter((c) => frontText.includes(c)).length / bleedText.length;
  // area census via painted backgrounds
  const paper = q('.sheet').getBoundingClientRect();
  return {
    vw: window.innerWidth, docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    scrollW: document.documentElement.scrollWidth,
    h1: { fs: h1cs.fontSize, font: h1cs.fontFamily, lh: h1cs.lineHeight, rect: R('h1'), color: h1cs.color },
    ratio: +(parseFloat(h1cs.fontSize) / parseFloat(bodyFS)).toFixed(4),
    bodyFS, leadFS: cs('.lead', 'fontSize'),
    leafs: { front, back, sum: front.w + back.w, frontShare: +(front.w / (front.w + back.w)).toFixed(4), backShare: +(back.w / (front.w + back.w)).toFixed(4), backToFront: +(back.w / front.w).toFixed(4) },
    tracks: {
      spread: cs('.spread', 'gridTemplateColumns'),
      front: cs('.leaf--front .cols', 'gridTemplateColumns'),
      back: cs('.leaf--back .cols', 'gridTemplateColumns'),
      bleedF: cs('.leaf--front .bleed .cols','gridTemplateColumns'),
      bleedB: cs('.leaf--back .bleed .cols','gridTemplateColumns'),
      frontCount: cs('.leaf--front .cols', 'gridTemplateColumnCount') || getComputedStyle(q('.leaf--front .cols')).gridTemplateColumns.split(' ').length,
      backCount: getComputedStyle(q('.leaf--back .cols')).gridTemplateColumns.split(' ').length,
    },
    imgs: { n: imgs.length, uniq: new Set(imgs.map((i) => i.src)).size, list: imgs },
    bleed: { opacity: bcs.opacity, transform: bcs.transform, filter: bcs.filter, anim: bcs.animationName, textChars: bleedText.length, charMatch: +inFront.toFixed(3), bg: bcs.backgroundColor },
    folio: { lh: fcs.lineHeight, fs: fcs.fontSize, wm: fcs.writingMode, box: R('.folio') },
    hexes: [...hexes].sort(), radii: [...radii], shadows: [...shadows], widths: [...widths].sort(), fonts: [...fonts],
    items: document.querySelectorAll('.item').length,
    h1x: R('h1').x, bodyx: R('.spread').x,
    sheet: paper,
    ctaCount: document.querySelectorAll('.cta__btn').length,
    headerBottom: R('.masthead').y + R('.masthead').h,
    consoleErr: 0,
  };
});
console.log(JSON.stringify(out, null, 2));
console.log('PAGE ERRORS:', page.consoleErrors);
await page.screenshot({ path: join(ROOT, 'shots', 'S07-v2-full.jpg'), format: 'jpeg', quality: 78, fullPage: true });
await page.screenshot({ path: join(ROOT, 'shots', 'S07-v2-fold.jpg'), format: 'jpeg', quality: 82, fullPage: false });
await b.close(); server.close();
