// 诊断 5：把「重复兄弟组」的成员语义摊开 —— 组内成员是否自带 h1-h6/landmark，
// 用来判断这组是「版心的重复行」还是「页面区块序列」。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif' };
const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const b = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();

const PROBE = `(function(){
  var strip = function(s){ var t = String(s || ''), o = ''; for (var i = 0; i < t.length; i++) if (t.charCodeAt(i) > 32) o += t.charAt(i); return o; };
  var sel = function(el){
    var c = (typeof el.className === 'string' ? el.className.trim().split(' ').slice(0,2).join('.') : '');
    return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''));
  };
  var g = {};
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    if (cs.display.indexOf('grid') < 0) return;
    var gtc = cs.gridTemplateColumns;
    if (!gtc || gtc === 'none' || !el.parentElement) return;
    var key = sel(el.parentElement) + '>' + el.tagName;
    if (!g[key]) g[key] = { key: key, n: 0, chars: 0, withH: 0, tags: {} };
    g[key].n++; g[key].chars += strip(el.innerText).length;
    if (el.querySelector('h1,h2,h3,h4,h5,h6')) g[key].withH++;
  });
  var out = Object.keys(g).map(function(k){ var x = g[k]; x.avg = Math.round(x.chars / x.n); return x; })
    .filter(function(x){ return x.n >= 3; }).sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify(out.slice(0, 8));
})()`;

const CASES = [
  ['S01', 'S01-red-wedge-broadsheet'], ['S03', 'S03-long-exposure-observatory'],
  ['S07', 'S07-slate-ink-contents'], ['S17', 'S17-revenue-stamp-stub'],
  ['S33', 'S33-teal-mirror-ledger'], ['S09', 'S09-batik-price-board'],
  ['S28', 'S28-jazz-intaglio-wall'],
];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const rows = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} =====`);
  for (const x of rows) console.log(`  n=${String(x.n).padStart(2)} sum=${String(x.chars).padStart(5)} avg=${String(x.avg).padStart(4)} 带标题 ${String(x.withH).padStart(2)}/${x.n}  ${x.key.slice(0, 52)}`);
}
await browser.close();
server.close();
