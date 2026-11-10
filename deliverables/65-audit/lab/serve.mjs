// Minimal static server rooted at the repo root, so the selection bench can be driven over http
// (identical origin semantics to the real deployment; no file:// quirks around fonts/images).
import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

export function startServer(root = resolve('.')) {
  const server = createServer((req, res) => {
    try {
      let f = resolve(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (f !== root && !f.startsWith(root + sep)) { res.writeHead(403); return res.end('forbidden'); }
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      res.writeHead(200, {
        'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream',
        'content-length': statSync(f).size,
        'cache-control': 'no-store',
      });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({
    server,
    origin: 'http://127.0.0.1:' + server.address().port,
    close: () => new Promise((c) => server.close(c)),
  })));
}
