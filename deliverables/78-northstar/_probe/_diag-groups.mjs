// 诊断 2：column-count 容器 + 重复兄弟分组 的文字量，用来决定最终判据。
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
    const p = join(ROOT, rel);
    const b = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();

const PROBE = `(function(){
  var strip = function(s){ return (s || '').replace(/[ \\t\\n\\r]/g, ''); };
  var sel = function(el){
    var c = (typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0,2).join('.') : '');
    return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''));
  };
  // 1) column-count 容器
  var ccRows = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var cc = parseInt(cs.columnCount, 10);
    if (!(cc > 1)) return;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    ccRows.push({ sel: sel(el).slice(0,40), cc: cc, chars: strip(el.innerText).length, display: cs.display, kids: el.children.length });
  });
  ccRows.sort(function(a,b){ return b.chars - a.chars; });
  // 2) 重复兄弟分组：同 tag + 同 gtc 的兄弟 >= 3 个
  var groups = {};
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    if (cs.display.indexOf('grid') < 0) return;
    var gtc = cs.gridTemplateColumns;
    if (!gtc || gtc === 'none') return;
    var p = el.parentElement;
    if (!p) return;
    var key = (p.tagName + (p.id ? '#' + p.id : '') + '|' + el.tagName + '|' + gtc);
    if (!groups[key]) groups[key] = { parent: sel(p).slice(0,30), tag: el.tagName, gtc: gtc.slice(0,50), n: 0, chars: 0, avg: 0 };
    groups[key].n++;
    groups[key].chars += strip(el.innerText).length;
  });
  var gs = Object.keys(groups).map(function(k){ var g = groups[k]; g.avg = Math.round(g.chars / g.n); return g; })
    .filter(function(g){ return g.n >= 3; }).sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify({ cc: ccRows.slice(0, 8), groups: gs.slice(0, 8) });
})()`;

const CASES = [
  ['S01', 'S01-red-wedge-broadsheet'], ['S07', 'S07-slate-ink-contents'],
  ['S17', 'S17-revenue-stamp-stub'], ['S33', 'S33-teal-mirror-ledger'],
  ['S09', 'S09-batik-price-board'], ['S28', 'S28-jazz-intaglio-wall'],
];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const d = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} =====`);
  console.log(' column-count 容器:');
  d.cc.forEach((x) => console.log(`   cc=${x.cc} chars=${String(x.chars).padStart(5)} kids=${String(x.kids).padStart(3)} ${x.sel} (display:${x.display})`));
  console.log(' 重复兄弟网格组（n>=3）:');
  d.groups.forEach((g) => console.log(`   n=${String(g.n).padStart(2)} sum=${String(g.chars).padStart(5)} avg=${String(g.avg).padStart(4)} 父 ${g.parent} > ${g.tag}  [${g.gtc}]`));
}
await browser.close();
server.close();
