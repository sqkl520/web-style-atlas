#!/usr/bin/env node
// 63-test · step 10: the S21 question, settled.
//
// S21 is the only case where the control variants also drifted. Two hypotheses:
//   (a) the mechanism reads the copy  -> the drift is real
//   (b) the drift is a font-loading race -> the hand-subsetted WenJin font (455 glyphs,
//       71 unicode-range shards) is still streaming in when the layout is measured, and
//       the swap page requests different shards, so the two pages settle at different times
// This script distinguishes them by waiting for document.fonts.ready before measuring,
// and by reporting how many font faces each page actually loads.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const PORT = 9617;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer((req, res) => {
  const f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  let b; try { b = readFileSync(f); } catch { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(b);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const CASES = ['S21-interlocking-release-book'];
const VARIANTS = ['orig', 'swap', 'swap-cjk', 'swap-inset'];
const LEVELS = [{ name: 'no-wait', wait: 0 }, { name: 'wait-2s', wait: 2000 }, { name: 'fonts.ready', wait: 'ready' }];

const measure = () => {
  const keys = ['.board', '.sheet', '.excl', '.states', '.ledger-foot'];
  const out = { docH: document.documentElement.scrollHeight, fonts: document.fonts.status, faces: document.fonts.size, keys: {} };
  for (const k of keys) { const el = document.querySelector(k); if (el) { const r = el.getBoundingClientRect(); out.keys[k] = { top: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1) }; } }
  return out;
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const res = {};
try {
  for (const c of CASES) {
    for (const w of [1440, 768, 390]) {
      const h = w === 1440 ? 900 : w === 768 ? 1024 : 844;
      for (const lvl of LEVELS) {
        for (const v of VARIANTS) {
          const p = await browser.newPage({ width: w, height: h, mobile: w === 390 });
          const url = v === 'orig'
            ? `http://127.0.0.1:${PORT}/prototypes/${c}/index.html`
            : `http://127.0.0.1:${PORT}/deliverables/63-test/replica/${c}/index.${v}.html`;
          await p.goto(url, { settleMs: lvl.wait === 'ready' ? 200 : lvl.wait });
          if (lvl.wait === 'ready') await p.eval(`(async () => { await document.fonts.ready; await new Promise(r => setTimeout(r, 700)); })()`);
          const m = await p.eval(measure);
          const key = `${w}|${lvl.name}|${v}`;
          res[key] = m;
          console.log(`${String(w).padEnd(5)} ${lvl.name.padEnd(12)} ${v.padEnd(11)} docH=${String(m.docH).padEnd(6)} fonts=${m.fonts.padEnd(8)} faces=${String(m.faces).padEnd(4)} .board.h=${m.keys['.board'] ? m.keys['.board'].h : '-'}  .sheet.h=${m.keys['.sheet'] ? m.keys['.sheet'].h : '-'}`);
          await p.close();
        }
      }
    }
  }
} finally { await browser.close(); server.close(); }
writeFileSync(join(ROOT, 'deliverables', '63-test', 'data', 's21-font-timing.json'), JSON.stringify(res, null, 1));

// verdict for the question
console.log('\n--- delta vs orig, per wait level (docH) ---');
for (const w of [1440, 768, 390]) {
  for (const lvl of LEVELS) {
    const o = res[`${w}|${lvl.name}|orig`];
    const row = ['swap', 'swap-cjk', 'swap-inset'].map((v) => {
      const s = res[`${w}|${lvl.name}|${v}`];
      return `${v}:${s.docH - o.docH >= 0 ? '+' : ''}${s.docH - o.docH}`;
    });
    console.log(`  ${w} ${lvl.name.padEnd(12)} orig=${o.docH}  ${row.join('  ')}`);
  }
}
