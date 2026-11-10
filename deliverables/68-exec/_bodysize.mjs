// 诊断 body-size：probe.mjs 的 bodySample 判据是「10..24px、chars>=60、非 code/UI 的文本里，字符数最多的 (fam|size) 组」。
// 这里复刻同一判据，把各组字符数打出来，看 13px 为什么赢。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const ROOT = resolve('.');
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': extname(f) === '.css' ? 'text/css' : extname(f) === '.js' ? 'text/javascript' : 'text/html', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => server.listen(8242, '127.0.0.1', r));

const COLLECT = () => {
  const texts = [];
  for (const el of document.body.querySelectorAll('*')) {
    const tag = el.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(tag)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    direct = direct.replace(/\s+/g, ' ').trim(); if (!direct) continue;
    if (tag === 'OPTION' || el.closest('svg')) continue;
    const size = parseFloat(cs.fontSize); if (!size || size < 6) continue;
    texts.push({ size, chars: direct.length, code: !!el.closest('pre, code, kbd, samp, textarea'), ui: !!el.closest('[data-ui]'), fam: cs.fontFamily.split(',')[0].replace(/["']/g, ''), text: direct.slice(0, 40) });
  }
  const bodyTexts = texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.code && !t.ui);
  const by = new Map();
  for (const t of bodyTexts) { const k = t.fam + '|' + Math.round(t.size); by.set(k, (by.get(k) || 0) + t.chars); }
  return { groups: [...by.entries()].sort((a, b) => b[1] - a[1]), blocks: bodyTexts.length };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 1440, height: 900 });
await p.goto('http://127.0.0.1:8242/prototypes/_selection/', { settleMs: 1800 });
const d = await p.eval(COLLECT);
console.log('bodyTexts 块数 =', d.blocks);
for (const [k, c] of d.groups) console.log(`  ${k.padEnd(22)} chars=${c}`);
await browser.close(); server.close();
