// 诊断 7：候选容器里「连续正文」的占比 —— 最长 <p> 的字数 / 容器字数，
// 用来区分「承载连续正文的版心」与「卡片网格（每格一句短语）」。
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
    if (kids.length < 2) return;
    var chars = strip(el.innerText).length;
    var ps = Array.prototype.slice.call(el.querySelectorAll('p,blockquote,dd'));
    var longestP = 0; ps.forEach(function(p){ var n = strip(p.innerText).length; if (n > longestP) longestP = n; });
    var pText = 0; ps.forEach(function(p){ pText += strip(p.innerText).length; });
    var leafMax = 0;
    kids.forEach(function(k){ var n = strip(k.innerText).length; if (n > leafMax) leafMax = n; });
    out.push({ sel: sel(el).slice(0,26), kids: kids.length, chars: chars, longestP: longestP,
      pShare: chars ? +(pText / chars).toFixed(2) : 0, kidMax: leafMax, gtc: gtc.slice(0, 40) });
  });
  out.sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify(out.slice(0, 8));
})()`;

const CASES = [['S08','S08-amber-overprint-lightbox'],['S21','S21-interlocking-release-book'],
  ['S12','S12-lime-knockout-wall'],['S23','S23-exposed-plaster-chronology-wall'],
  ['S01','S01-red-wedge-broadsheet'],['S17','S17-revenue-stamp-stub'],['S11','S11-samizdat-typewriter']];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const rows = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} =====`);
  for (const x of rows) console.log(`  ${String(x.chars).padStart(5)}字 kids=${x.kids} 最长p=${String(x.longestP).padStart(4)} p占比=${x.pShare} 最大子=${String(x.kidMax).padStart(4)}  ${x.sel.padEnd(24)} ${x.gtc}`);
}
await browser.close(); server.close();
