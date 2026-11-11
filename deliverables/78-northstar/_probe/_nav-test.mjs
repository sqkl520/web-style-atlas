/* 直接照搬 measure 的服务器与导航，但把每个请求与最终状态打出来。 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const abs = resolve(ROOT, 'prototypes/S01-red-wedge-broadsheet/index.html');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml' };
const log = [];
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = resolve(ROOT, '.' + rel);
  const ok = p.startsWith(ROOT);
  try {
    const buf = await readFile(p);
    log.push(`200 ${rel}`);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { log.push(`404 ${rel} (${e.code})`); res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const relUrl = abs.slice(ROOT.length).replace(/\\/g, '/');
console.log('URL', `http://127.0.0.1:${port}${relUrl}`);
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
try {
  const how = await pg.goto(`http://127.0.0.1:${port}${relUrl}`, { settleMs: 1500 });
  console.log('goto ->', how);
  const title = await pg.eval('document.title');
  console.log('title:', title);
} catch (e) {
  console.log('GOTO ERROR:', e.message);
}
console.log('--- requests ---');
console.log(log.join('\n'));
await b.close();
server.close();
process.exit(0);
