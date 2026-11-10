// Read-only experiment server with path overrides.
//
// Why overrides: the live repo was being edited by another agent while this audit ran
// (prototypes/_selection/data.js changed size mid-run and 布局与网格 appeared in S15 between
// two measurements). Every number in the report must be re-runnable, so the bench is served from
// a frozen copy in lab/snapshot/ mounted at the same URL path — that keeps `../_fonts/...`
// resolving exactly as on the real page, while nothing under prototypes/ is touched.
//
// ?lab=<name> injects /__lab/labkit.js + /__lab/<name>.js and /__lab/lab.css + /__lab/<name>.css.
import { createServer } from 'node:http';
import { statSync, createReadStream, readFileSync, existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

// overrides: [{ prefix: '/prototypes/_selection/', dir: '/abs/path/to/snapshot' }, ...]
export function startLabServer({ root = resolve('.'), labDir, overrides = [] }) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = decodeURIComponent(url.pathname);

    if (path.startsWith('/__lab/')) {
      const f = join(labDir, path.slice('/__lab/'.length));
      if (!existsSync(f)) { res.writeHead(404); return res.end('no overlay'); }
      res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      return createReadStream(f).pipe(res);
    }

    let f = resolve(join(root, path));
    let injectablePath = /_selection[\\/]index\.html$/.test(f);
    for (const o of overrides) {
      if (path.startsWith(o.prefix)) {
        f = join(o.dir, path.slice(o.prefix.length) || 'index.html');
        injectablePath = true;   // the bench page, served from the frozen snapshot
        break;
      }
    }
    if (!f.startsWith(root + sep)) { res.writeHead(403); return res.end('forbidden'); }

    try {
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      const ext = extname(f).toLowerCase();
      const lab = url.searchParams.get('lab');
      if (ext === '.html' && lab && injectablePath) {
        let html = readFileSync(f, 'utf8');
        const css = join(labDir, lab + '.css');
        const js = join(labDir, lab + '.js');
        let head = `<link rel="stylesheet" href="/__lab/lab.css">\n`;
        if (existsSync(css)) head += `<link rel="stylesheet" href="/__lab/${lab}.css">\n`;
        html = html.replace('</head>', head + '</head>');
        let tail = `<script src="/__lab/labkit.js"></script>\n`;
        if (existsSync(js)) tail += `<script src="/__lab/${lab}.js"></script>\n`;
        html = html.replace('</body>', tail + '</body>');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': Buffer.byteLength(html), 'cache-control': 'no-store' });
        return res.end(html);
      }
      res.writeHead(200, {
        'content-type': MIME[ext] || 'application/octet-stream',
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
