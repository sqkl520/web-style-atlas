import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
const ROOT = resolve('.');
const abs = resolve('prototypes/S01-red-wedge-broadsheet/index.html');
const relUrl = abs.slice(ROOT.length).replace(/\\/g, '/');
console.log('ROOT=', ROOT);
console.log('abs =', abs);
console.log('relUrl=', relUrl);
const s = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = resolve(ROOT, '.' + rel);
  console.log('REQ', rel, '->', p, 'inRoot=', p.startsWith(ROOT));
  try {
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(buf);
  } catch (e) { console.log('ERR', e.code); res.writeHead(404); res.end(); }
});
s.listen(0, '127.0.0.1', async () => {
  const port = s.address().port;
  const url = `http://127.0.0.1:${port}${relUrl}`;
  console.log('GET', url);
  const r = await fetch(url);
  console.log('status', r.status, 'len', (await r.text()).length);
  s.close();
});
