#!/usr/bin/env node
// REDTEAM probe: is the `body-size: 13px` FAIL on _selection a real defect or a
// measurement-convention artifact?
//
// probe.mjs picks "body" as the family|size bucket holding the MOST characters among
// texts of 10-24px with >=60 chars. On a data-dense tool UI, 13px labels can out-count
// the 16px prose. This probe re-measures the same page with the same filters and prints
// the character budget per font size, so the "body" pick can be inspected directly.
//
// Serves the page over a throwaway http server (module scripts need http), same as
// inspect.mjs. Read-only: writes nothing.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const ROOT_N = resolve(ROOT);
const target = resolve(ROOT, 'prototypes/_selection/index.html');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT_N, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(ROOT_N)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/_selection/index.html`;

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(url, { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});

const data = await page.eval(() => {
  // mirror the filters probe.mjs uses for texts / bodyTexts
  const texts = [];
  const walk = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (t) texts.push({ el: n.parentElement, chars: t.length, text: t.slice(0, 50) });
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(document.body);
  const rows = new Map();
  for (const t of texts) {
    const el = t.el; if (!el) continue;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const inCode = !!el.closest('pre, code, kbd, samp');
    const inUI = !!el.closest('[data-ui]');
    if (inCode || inUI) continue;
    if (!(size >= 10 && size <= 24)) continue;
    if (t.chars < 60) continue;
    const k = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() + '|' + Math.round(size);
    const r = rows.get(k) || { fam: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: Math.round(size), chars: 0, blocks: 0, samples: [] };
    r.chars += t.chars; r.blocks++;
    if (r.samples.length < 3) r.samples.push(t.text);
    rows.set(k, r);
  }
  // and: how many *paragraph* elements of real prose exist, at what size
  const paras = [...document.querySelectorAll('p')].map((p) => ({
    size: parseFloat(getComputedStyle(p).fontSize),
    chars: (p.innerText || '').replace(/\s+/g, ' ').trim().length,
  })).filter((p) => p.chars >= 60);
  const bySize = new Map();
  for (const p of paras) bySize.set(p.size, (bySize.get(p.size) || 0) + p.chars);
  return {
    bodyBuckets: [...rows.values()].sort((a, b) => b.chars - a.chars),
    paragraphCharsBySize: [...bySize.entries()].sort((a, b) => b[1] - a[1]),
    bodyFontSize: getComputedStyle(document.body).fontSize,
  };
});

console.log(JSON.stringify(data, null, 1));
await browser.close();
server.close();
