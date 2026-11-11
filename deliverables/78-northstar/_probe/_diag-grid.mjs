// 诊断：把每个 grid 候选的原始 gtc / 切分后轨道 / 宽轨道数 / 文字量 / img 占比打出来。
// 用文件而不是 node -e：模板字符串会吞反斜杠（本仓库踩过 3 次）。
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
  var splitTracks = function(v) {
    var out = [], cur = '', depth = 0;
    for (var i = 0; i < v.length; i++) {
      var c = v.charAt(i);
      if (c === '(') depth++;
      else if (c === ')') { depth = depth - 1; if (depth < 0) depth = 0; }
      if (depth === 0 && c.charCodeAt(0) <= 32) { if (cur) { out.push(cur); cur = ''; } continue; }
      cur += c;
    }
    if (cur) out.push(cur);
    return out;
  };
  var rows = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    if (cs.display.indexOf('grid') < 0) return;
    var gtc = cs.gridTemplateColumns;
    if (!gtc || gtc === 'none') return;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    var tracks = splitTracks(gtc);
    var widths = tracks.map(function(t){ return parseFloat(t); });
    var allNum = widths.every(function(n){ return isFinite(n); });
    var wide = allNum ? widths.filter(function(n){ return n >= 32; }).length : -1;
    var text = (el.innerText || '').replace(/[ \\t\\n\\r]/g, '').length;
    var kids = Array.prototype.slice.call(el.children);
    var withImg = kids.filter(function(k){ return k.querySelector('img, picture, svg, canvas'); }).length;
    var kidChars = kids.map(function(k){ return (k.innerText || '').replace(/[ \\t\\n\\r]/g, '').length; });
    var avgKid = kidChars.length ? Math.round(kidChars.reduce(function(a,b){return a+b;},0) / kidChars.length) : 0;
    var sel = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '');
    rows.push({ sel: sel.slice(0,42), n: tracks.length, wide: wide, allNum: allNum, chars: text, kids: kids.length, withImg: withImg, avgKid: avgKid,
                area: Math.round(r.width * r.height), gtc: gtc.slice(0, 90) });
  });
  rows.sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify(rows);
})()`;

const CASES = [
  ['S01', 'S01-red-wedge-broadsheet'],
  ['S07', 'S07-slate-ink-contents'],
  ['S17', 'S17-revenue-stamp-stub'],
  ['S33', 'S33-teal-mirror-ledger'],
  ['S09', 'S09-batik-price-board'],
  ['S28', 'S28-jazz-intaglio-wall'],
];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const rows = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} =====`);
  console.log('  n wide chars  kids img avgKid  area      sel                            gtc');
  for (const x of rows) {
    console.log(`  ${String(x.n).padStart(2)} ${String(x.wide).padStart(4)} ${String(x.chars).padStart(5)} ${String(x.kids).padStart(5)} ${String(x.withImg).padStart(3)} ${String(x.avgKid).padStart(6)} ${String(x.area).padStart(9)}  ${x.sel.padEnd(30)} ${x.gtc}`);
  }
}
await browser.close();
server.close();
