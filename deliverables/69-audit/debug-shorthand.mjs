// 探针 15：CSS 简写含 var() 时 CSSOM 返回什么？
// 已知症状：S15 的 style.css 里明明有 15 条 `border-*: 3px solid var(--pencil)`，
// 我扫 CSSOM 却只拿到 2px 一个值。怀疑：含 var() 的**简写**是 pending-substitution value，
// getPropertyValue('border-bottom') 返回空串，只有 longhand 能读。
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style/prototypes';
const PORT = 8522;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/S15-fishery-floor-ledger/index.html`, { settleMs: 1200 });
const r = await p.eval(() => {
  const rowsOut = [];
  const sh = Array.from(document.styleSheets).find((s) => /style\.css$/.test(s.href || ''));
  let n = 0;
  for (const rule of sh.cssRules) {
    if (!rule.style) continue;
    for (let i = 0; i < rule.style.length; i++) {
      const prop = rule.style[i];
      if (!/^border/.test(prop)) continue;
      if (n++ > 6) break;
      rowsOut.push({
        sel: (rule.selectorText || '').slice(0, 34), prop,
        value: JSON.stringify(rule.style.getPropertyValue(prop)),
        longhands: ['border-top-width', 'border-bottom-width', 'border-left-width']
          .map((l) => l + '=' + JSON.stringify(rule.style.getPropertyValue(l))),
        cssText: JSON.stringify(rule.style.cssText).slice(0, 130),
      });
    }
    if (n > 6) break;
  }
  // 也测一下 CDP 风格的 raw text？没有。改用 cssText 解析
  return rowsOut;
});
console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
