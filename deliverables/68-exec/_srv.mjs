// Throwaway static server for the _selection workbench. Serves the repo root so the
// relative font/CSS paths (../_fonts/...) resolve exactly as they do when hosted.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

export function serve(root, port = 8311, overlay = {}) {
  const base = resolve(root);
  const server = createServer((req, res) => {
    try {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      // Overlay lets a fixture shadow specific repo paths (used for the HEAD A/B baseline).
      if (overlay[rel] !== undefined) {
        const buf = Buffer.from(overlay[rel], 'utf8');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': buf.length, 'cache-control': 'no-store' });
        return res.end(buf);
      }
      let f = resolve(join(base, rel));
      if (f !== base && !f.startsWith(base + sep)) { res.writeHead(403); return res.end(); }
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      res.writeHead(200, {
        'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream',
        'content-length': statSync(f).size,
        'cache-control': 'no-store',
      });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${port}` })));
}
