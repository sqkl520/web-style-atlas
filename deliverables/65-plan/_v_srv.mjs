// Read-only static server for the real repo (no overrides, no writes).
import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

export function startServer({ root = resolve('.') } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    let f = resolve(join(root, p));
    if (!f.startsWith(root + sep) && f !== root) { res.writeHead(403); return res.end('forbidden'); }
    try {
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      const ext = extname(f).toLowerCase();
      res.writeHead(200, {
        'content-type': MIME[ext] || 'application/octet-stream',
        'content-length': statSync(f).size,
        'cache-control': 'no-store',
      });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({
    origin: 'http://127.0.0.1:' + server.address().port,
    close: () => new Promise((c) => server.close(c)),
  })));
}
