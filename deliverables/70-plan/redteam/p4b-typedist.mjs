// 补充核验：我报告里引用的「字号分布」到底是不是我自己测的。
// 报告 P4-c 写了「S28 原型的字号分布是 {13,15,16,92…}，复刻是 {9,10,12,13,44}」——
// 这组数字来自 LEAD 的报告，不是我测的。本探针自己测一遍，若不一致就改报告。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); } catch { res.writeHead(500); res.end(); }
});
await new Promise((r) => server.listen(8646, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

async function sizes(url) {
  await page.goto(url, { settleMs: 2400 });
  return page.eval(`(() => {
    const m = new Map();
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cs = getComputedStyle(el);
      if (el.children.length === 0 && (el.textContent || '').trim()) {
        const fs = Math.round(parseFloat(cs.fontSize));
        const chars = (el.textContent || '').trim().length;
        // 按字符数加权（比 LEAD 的面积加权更接近「这个字号在正文里出现多少」）
        m.set(fs, (m.get(fs) || 0) + chars);
      }
    }
    const tot = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    const h1 = document.querySelector('h1');
    return {
      dist: [...m.entries()].sort((a, b) => b[1] - a[1]).map(([fs, n]) => [fs, +(n / tot * 100).toFixed(1)]),
      h1px: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : null,
    };
  })()`);
}

const out = {};
for (const [id, dir] of [['S20', 'S20-plotter-soundfield'], ['S21', 'S21-interlocking-release-book'], ['S28', 'S28-jazz-intaglio-wall']]) {
  out[id] = { proto: await sizes(`http://127.0.0.1:8646/prototypes/${dir}/index.html`), impl: await sizes(`http://127.0.0.1:8646/deliverables/69-test/${id}/index.html`) };
  const p = out[id].proto, i = out[id].impl;
  console.log(`${id}: 原型 H1=${p.h1px}px 最高档=${p.dist[0][0]}px | 复刻 H1=${i.h1px}px 最高档=${i.dist[0][0]}px`);
  console.log(`   原型分布: ${p.dist.slice(0, 6).map(([f, pc]) => f + 'px(' + pc + '%)').join(' ')}`);
  console.log(`   复刻分布: ${i.dist.slice(0, 6).map(([f, pc]) => f + 'px(' + pc + '%)').join(' ')}`);
  console.log(`   原型 max/正文比: ${(p.h1px / p.dist.filter(([f]) => f !== p.h1px)[0][0]).toFixed(2)} | 复刻: ${i.h1px ? (i.h1px / i.dist.filter(([f]) => f !== i.h1px)[0][0]).toFixed(2) : 'n/a'}`);
}
writeFileSync(join(ROOT, 'deliverables/70-plan/redteam/type-dist.json'), JSON.stringify(out, null, 1), 'utf8');
await browser.close();
server.close();
