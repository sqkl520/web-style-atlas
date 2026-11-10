import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9623;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };
const log = [];
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { log.push({ url: p, status: 404, bytes: 0 }); res.writeHead(404); res.end('no'); return; }
  const buf = readFileSync(f);
  log.push({ url: p, status: 200, bytes: buf.length });
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(buf);
});
await new Promise(r => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 8000 });

const jpg = log.filter(x => /\.jpg$/i.test(x.url));
const woff = log.filter(x => /\.woff2$/i.test(x.url));
const sum = a => a.reduce((x, r) => x + r.bytes, 0);
const kinds = {};
jpg.forEach(r => { const m = r.url.match(/(desktop|tablet|mobile)-(fold|page-\d+)\.jpg/); const k = m ? m[1] + '-' + (/fold/.test(m[2]) ? 'fold' : 'page') : 'other'; kinds[k] = kinds[k] || { n: 0, mb: 0 }; kinds[k].n++; kinds[k].mb += r.bytes / 1048576; });
const dom = await p.eval(`(()=>{
  const imgs=[...document.querySelectorAll('.shots img')];
  const vis=imgs.filter(i=>i.getBoundingClientRect().width>0);
  return {shotImgs:imgs.length, visible:vis.length, hidden:imgs.length-vis.length,
    hiddenBytes:(()=>{return 0})(),
    allImgs:[...document.querySelectorAll('img')].length};
})()`);

console.log(JSON.stringify({
  totalRequests: log.length,
  jpgCount: jpg.length, jpgMB: +(sum(jpg) / 1048576).toFixed(2),
  woffCount: woff.length, woffMB: +(sum(woff) / 1048576).toFixed(2),
  statuses: [...new Set(log.map(x => x.status))],
  notFound: log.filter(x => x.status === 404).slice(0, 10),
  kinds: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, { n: v.n, mb: +v.mb.toFixed(2) }])),
  dom,
  nonImgBytes: +(log.filter(x => !/\.jpg$|\.woff2$/i.test(x.url)).reduce((a, r) => a + r.bytes, 0) / 1024).toFixed(1),
}, null, 2));
await b.close(); server.close();
