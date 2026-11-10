#!/usr/bin/env node
// 63-test · step 6 (v2): does the CASE's own CJK webfont contain the fruit glyphs?
//
// The first version of this probe compared Latin width against CJK width, which is
// meaningless (CJK ideographs are full-width by design). The right question is narrower
// and answerable: for the exact font-family + weight the case uses for body copy, is a
// given fruit codepoint covered by the loaded webfont, or does it fall back to a system
// font? Fallback does NOT move layout (both are 1em) but it does change the typeface,
// which matters when judging screenshots by eye.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const PORT = 9615;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer((req, res) => {
  const f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  let b; try { b = readFileSync(f); } catch { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(b);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const CASES = ['S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual'];
const FRUIT = [...'梨桃柚杏梅枣橙苹果香蕉橘子葡萄西瓜草莓柠檬樱桃芒果菠萝荔枝龙眼枇杷石榴柿子蓝莓木瓜榴莲椰子杨梅山楂覆盆青柠猕猴桃火龙果哈密瓜车厘子百香番无圣女牛油'];

// For each font-family actually used on elements that own CJK text, ask the FontFaceSet
// whether it can render each fruit codepoint. Also report the element's advance width for
// an original CJK char vs a fruit char, which must both be 1em if no fallback weirdness.
const probe = (fruit) => {
  const fams = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const ownsCjk = [...el.childNodes].some((n) => n.nodeType === 3 && /[\u4e00-\u9fff]/.test(n.textContent));
    if (!ownsCjk) continue;
    const first = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    const k = first + '|' + cs.fontWeight + '|' + cs.fontSize;
    if (!fams.has(k)) fams.set(k, { ff: first, weight: cs.fontWeight, size: cs.fontSize, n: 0 });
    fams.get(k).n++;
  }
  const measure = (family, weight, size, text) => {
    const sp = document.createElement('span');
    sp.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:"${family}";font-weight:${weight};font-size:${size}`;
    sp.textContent = text;
    document.body.appendChild(sp);
    const w = sp.getBoundingClientRect().width / [...text].length;
    sp.remove();
    return w;
  };
  const out = [];
  for (const [, f] of fams) {
    const missing = [];
    for (const ch of fruit) {
      let ok = true;
      try { ok = document.fonts.check(`${f.weight} ${f.size} "${f.ff}"`, ch); } catch (e) { ok = true; }
      if (!ok) missing.push(ch);
    }
    // advance per char: a covered CJK glyph is 1em; the fallback is also ~1em, so this
    // is a sanity number, not a discriminator
    const wCjk = measure(f.ff, f.weight, f.size, '观测记录高度');
    const wFruit = measure(f.ff, f.weight, f.size, '梨桃柚杏梅枣');
    out.push({ ff: f.ff, weight: f.weight, size: f.size, uses: f.n, missing: missing.join(''), missingCount: missing.length, advCjk: +wCjk.toFixed(2), advFruit: +wFruit.toFixed(2), sizePx: parseFloat(f.size) });
  }
  return { fams: out, loaded: [...document.fonts].map((x) => x.family + ':' + x.weight + ':' + x.status).slice(0, 40) };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
try {
  for (const c of CASES) {
    const p = await browser.newPage({ width: 1440, height: 900 });
    await p.goto(`http://127.0.0.1:${PORT}/deliverables/63-test/replica/${c}/index.swap.html`, { settleMs: 2200 });
    const r = await p.eval(probe, FRUIT);
    out[c] = r;
    console.log(`\n=== ${c}`);
    for (const f of r.fams) {
      const advRatio = (f.advFruit / (f.advCjk || 1)).toFixed(3);
      console.log(`   ${f.ff.padEnd(18)} w${String(f.weight).padEnd(4)} ${f.size.padEnd(8)} usedBy=${String(f.uses).padEnd(4)} missing=${String(f.missingCount).padStart(2)} adv ${f.advCjk}/${f.advFruit} (${advRatio}) ${f.missing ? 'MISSING:' + f.missing.slice(0, 20) : ''}`);
    }
    await p.close();
  }
} finally { await browser.close(); server.close(); }
writeFileSync(join(ROOT, 'deliverables', '63-test', 'data', 'font-coverage.json'), JSON.stringify(out, null, 1));
