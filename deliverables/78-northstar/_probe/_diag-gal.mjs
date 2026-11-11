// 诊断 8：画廊判据的 img 占比分布 —— 真画廊（S01/S17/S09/S28 的图版格）与
// 「承载图版的大栅格」（S23 的 36 栏墙）各是多少，能不能用一条阈值分开。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif' };
const server = createServer(async (req, res) => {
  try { let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const b = await readFile(join(ROOT, rel)); res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' }); res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();

const PROBE = `(function(){
  var strip = function(s){ var t = String(s || ''), o = ''; for (var i = 0; i < t.length; i++) if (t.charCodeAt(i) > 32) o += t.charAt(i); return o; };
  var sel = function(el){ var c = (typeof el.className === 'string' ? el.className.trim().split(' ').slice(0,2).join('.') : '');
    return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '')); };
  var out = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    if (cs.display.indexOf('grid') < 0) return;
    var gtc = cs.gridTemplateColumns; if (!gtc || gtc === 'none') return;
    var kids = Array.prototype.slice.call(el.children);
    if (kids.length < 3) return;
    var chars = strip(el.innerText).length;
    var img = kids.filter(function(k){ return k.querySelector('img,picture,canvas,video'); }).length;
    out.push({ sel: sel(el).slice(0,26), kids: kids.length, img: img, share: +(img/kids.length).toFixed(2),
      chars: chars, avg: Math.round(chars/kids.length), raw: gtc.split(' ').length, gtc: gtc.slice(0,34) });
  });
  out.sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify(out.slice(0, 6));
})()`;

const CASES = [['S01','S01-red-wedge-broadsheet'],['S17','S17-revenue-stamp-stub'],['S09','S09-batik-price-board'],
  ['S28','S28-jazz-intaglio-wall'],['S23','S23-exposed-plaster-chronology-wall'],
  ['S12','S12-lime-knockout-wall'],['S21','S21-interlocking-release-book'],['S08','S08-amber-overprint-lightbox']];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const rows = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} =====`);
  for (const x of rows) console.log(`  ${String(x.chars).padStart(5)}字 raw=${String(x.raw).padStart(2)} kids=${String(x.kids).padStart(2)} img=${String(x.img).padStart(2)} share=${String(x.share).padStart(4)} avg=${String(x.avg).padStart(4)}  ${x.sel.padEnd(24)} ${x.gtc}`);
}
await browser.close(); server.close();
