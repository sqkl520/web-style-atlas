// 修正版：更彻底地扫页面实际使用的颜色（含伪元素、SVG fill/stroke、渐变）
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
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
await new Promise(r => server.listen(8521, '127.0.0.1', r));

const targets = { S09: '#8A4B24', S10: '#6E7076', S17: '#DFD6BF', S18: '#278F43', S22: '#6B6558', S28: '#07080C' };
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [id, hex] of Object.entries(targets)) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  if (!dirs.length) continue;
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await page.goto(`http://127.0.0.1:8521/prototypes/${dirs[0]}/index.html`, { settleMs: 2200 });

  const o = await page.eval(`(() => {
    const target = ${JSON.stringify(hex)}.toUpperCase();
    const toHex = (s) => {
      if (!s) return null;
      const rgb = s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (rgb) { const h = n => (+n).toString(16).padStart(2,'0'); return ('#' + h(rgb[1]) + h(rgb[2]) + h(rgb[3])).toUpperCase(); }
      return null;
    };
    const found = [];
    // 扫元素的计算样式 + 伪元素
    const els = [document.documentElement, document.body, ...document.querySelectorAll('*')];
    for (const el of els) {
      const check = (s, pseudo) => {
        for (const k of ['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','fill','stroke','textDecorationColor','caretColor','columnRuleColor']) {
          const v = s[k];
          if (v && toHex(v) === target) found.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,24), prop: k, pseudo: pseudo || '', w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) });
        }
        const bg = s.backgroundImage || '';
        if (bg.includes('gradient')) {
          const hexes = bg.match(/rgb\\(\\d+,\\s*\\d+,\\s*\\d+\\)/g) || [];
          for (const h of hexes) if (toHex(h) === target) found.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,24), prop: 'gradient', pseudo: pseudo || '', w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) });
        }
      };
      check(getComputedStyle(el), '');
      for (const p of ['::before','::after']) {
        const ps = getComputedStyle(el, p);
        if (ps && ps.content && ps.content !== 'none') check(ps, p);
      }
    }
    return { found: found.slice(0, 6), count: found.length };
  })()`);

  console.log(`=== ${id} ${hex} ===`);
  if (o.count === 0) console.log('  ✗ 页面上完全找不到这个色');
  else {
    console.log(`  ✓ 找到 ${o.count} 处`);
    for (const f of o.found) console.log(`    ${f.tag}.${f.cls} ${f.prop}${f.pseudo} (${f.w}×${f.h})`);
  }
}

await browser.close();
server.close();
