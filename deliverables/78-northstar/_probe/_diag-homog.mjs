// 诊断 6：单容器候选的「子元素同质度 + 带图比例」—— 用来判断哪些是卡片/图片行（同质重复单元），
// 哪些是版心（子元素各不相同）。
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
    var tags = {}; kids.forEach(function(k){ tags[k.tagName] = (tags[k.tagName] || 0) + 1; });
    var sameTag = Math.max.apply(null, Object.keys(tags).map(function(t){ return tags[t]; }));
    var img = kids.filter(function(k){ return k.querySelector('img,picture,canvas,video'); }).length;
    var chars = strip(el.innerText).length;
    out.push({ sel: sel(el).slice(0,28), kids: kids.length, sameTag: sameTag, img: img,
      share: +(img / kids.length).toFixed(2), chars: chars, avg: Math.round(chars / kids.length),
      gtc: gtc.slice(0, 44) });
  });
  out.sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify(out.slice(0, 8));
})()`;

const CASES = [['S03','S03-long-exposure-observatory'],['S08','S08-amber-overprint-lightbox'],
  ['S17','S17-revenue-stamp-stub'],['S21','S21-interlocking-release-book'],['S09','S09-batik-price-board']];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const rows = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} =====`);
  for (const x of rows) console.log(`  ${String(x.chars).padStart(5)}字 kids=${x.kids} 同标签=${x.sameTag} img=${x.img}(${x.share}) avg=${String(x.avg).padStart(4)}  ${x.sel.padEnd(26)} ${x.gtc}`);
}
await browser.close(); server.close();
