// 探针 23：为什么 S25 的 `outline: 3px solid var(--spot-b)` 没被抽到？
// （声称 3px，我的探针报"CSS 声明为空"——若原文里真有 3px，那就是我漏了，结论要翻）
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style/prototypes';
const PORT = 8527;
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
await p.goto(`http://127.0.0.1:${PORT}/S25-spotcolor-contents-zine/index.html`, { settleMs: 1200 });
const r = await p.eval(() => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://127.0.0.1:8527/S25-spotcolor-contents-zine/style.css', false);
  xhr.send(null);
  const raw = xhr.responseText;
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?)\s*:\s*([^;}]+)[;}]/g;
  const hits = [];
  let m;
  while ((m = re.exec(src))) hits.push({ prop: m[1], val: m[2].trim() });
  // 单独看 outline 相关行
  const outlineLines = (raw.match(/^.*outline.*$/gm) || []).slice(0, 8);
  const borderLines = (raw.match(/^.*border[^:]*:\s*[^;]*px.*$/gm) || []).slice(0, 8);
  return { nHits: hits.length, hitsWithPx: hits.filter((h) => /\dpx/.test(h.val)).slice(0, 20), outlineLines, borderLines };
});
console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
