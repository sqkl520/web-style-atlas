// Read-only static server rooted at the repo, with an optional overlay dir that
// shadows individual repo files (used for A/B against the pre-change copy).
// usage: node srv.mjs <port> [overlayDir]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const PORT = Number(process.argv[2] || 9311);
const OVERLAY = process.argv[3] ? resolve(process.argv[3]) : null;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const rel = normalize(p).replace(/^([/\\])+/, '');
    const full = join(ROOT, rel);
    if (!full.startsWith(ROOT + sep) && full !== ROOT) { res.writeHead(403).end('forbidden'); return; }
    let src = full;
    if (OVERLAY) {
      const ov = join(OVERLAY, rel);
      if (ov.startsWith(OVERLAY + sep) && existsSync(ov)) src = ov;
    }
    const st = await stat(src);
    if (st.isDirectory()) { res.writeHead(302, { Location: p + '/' }).end(); return; }
    const buf = await readFile(src);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(src).toLowerCase()] || 'application/octet-stream',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(e.code || e.message));
  }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT}${OVERLAY ? ' + overlay ' + OVERLAY : ''} at http://127.0.0.1:${PORT}/`);
});
