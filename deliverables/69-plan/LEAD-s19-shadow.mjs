// 裁决：S19 到底有没有外阴影？我和红队差 1 处
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8530, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport({ width: w, height: h, mobile: w < 500 });
  await page.goto('http://127.0.0.1:8530/prototypes/S19-copperplate-herbarium-cabinet/index.html', { settleMs: 2200 });

  const o = await page.eval(`(() => {
    const out = { elements: [], pseudos: [], total: 0, outer: [], inset: [] };
    const els = [document.documentElement, document.body, ...document.querySelectorAll('*')];
    const seen = new Set();
    const rec = (el, s, pseudo) => {
      const v = s.boxShadow;
      if (!v || v === 'none') return;
      const isInset = /inset/.test(v);
      const key = v + '|' + pseudo;
      out.total++;
      if (!isInset) { out.outer.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,30), pseudo, v: v.slice(0,90), vis: el.getBoundingClientRect().width > 0 }); }
      else out.inset.push({ pseudo, v: v.slice(0, 50) });
    };
    for (const el of els) {
      rec(el, getComputedStyle(el), '');
      // 关键：伪元素也要查 —— 这是最容易漏的地方
      for (const p of ['::before','::after']) {
        const ps = getComputedStyle(el, p);
        if (!ps) continue;
        const c = ps.content;
        if (c && c !== 'none' && c !== 'normal') rec(el, ps, p);
      }
    }
    // 另外：filter: drop-shadow 也算"外投影"的视觉效果
    const drops = [];
    for (const el of els) {
      const f = getComputedStyle(el).filter;
      if (f && /drop-shadow/.test(f)) drops.push({ tag: el.tagName.toLowerCase(), f: f.slice(0, 80) });
      for (const p of ['::before','::after']) {
        const ps = getComputedStyle(el, p);
        if (ps && ps.filter && /drop-shadow/.test(ps.filter)) drops.push({ tag: el.tagName.toLowerCase(), pseudo: p, f: ps.filter.slice(0, 80) });
      }
    }
    // filter 也要看祖先链上的 backdrop-filter
    const backdrop = [];
    for (const el of els) { const f = getComputedStyle(el).backdropFilter; if (f && f !== 'none') backdrop.push({ tag: el.tagName.toLowerCase(), f }); }
    return { total: out.total, outer: out.outer, insetCount: out.inset.length, drops, backdrop };
  })()`);

  console.log(`\n=== S19 ${w}x${h} ===`);
  console.log(`  box-shadow 总数: ${o.total}（inset ${o.insetCount}）`);
  console.log(`  外投影（非 inset）: ${o.outer.length}`);
  for (const x of o.outer) console.log(`    ${x.tag}.${x.cls} ${x.pseudo} vis=${x.vis} :: ${x.v}`);
  console.log(`  filter: drop-shadow: ${o.drops.length}`);
  for (const x of o.drops) console.log(`    ${x.tag} ${x.pseudo || ''} :: ${x.f}`);
  console.log(`  backdrop-filter: ${o.backdrop.length}`);
}

await browser.close();
server.close();
