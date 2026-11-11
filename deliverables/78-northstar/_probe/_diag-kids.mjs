// 诊断 4：(a) S17 的 .sheet 有 3 子元素、2 个含 svg —— 纯 img 占比判据会把它误杀，需要文字量兜底；
//          (b) S33 没有包裹式主版心，正文是一串同构 li.row，需要按「重复兄弟分组」聚合文字量。
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
  var strip = function(s){ var t = String(s || ''), o = ''; for (var i = 0; i < t.length; i++) if (t.charCodeAt(i) > 32) o += t.charAt(i); return o; };
  var sel = function(el){
    var c = (typeof el.className === 'string' ? el.className.trim().split(' ').slice(0,2).join('.') : '');
    return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''));
  };
  var splitTracks = function(v){
    var out = [], cur = '', d = 0;
    for (var i = 0; i < v.length; i++) { var c = v.charAt(i);
      if (c === '(') d++; else if (c === ')') { d--; if (d < 0) d = 0; }
      if (d === 0 && c.charCodeAt(0) <= 32) { if (cur) { out.push(cur); cur = ''; } continue; }
      cur += c; }
    if (cur) out.push(cur); return out;
  };
  // 单容器
  var singles = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var gtc = cs.gridTemplateColumns;
    if (cs.display.indexOf('grid') < 0 || !gtc || gtc === 'none') return;
    var kids = Array.prototype.slice.call(el.children);
    var withImg = kids.filter(function(k){ return k.querySelector('img,picture,svg,canvas'); }).length;
    var chars = strip(el.innerText).length;
    var avg = kids.length ? Math.round(chars / kids.length) : 0;
    var nums = splitTracks(gtc).map(function(t){ return parseFloat(t); });
    var allNum = nums.length > 0 && nums.every(function(n){ return isFinite(n); });
    singles.push({ sel: sel(el).slice(0,26), raw: nums.length,
      wide: allNum ? nums.filter(function(n){ return n >= 32; }).length : -1,
      chars: chars, kids: kids.length, img: withImg, avg: avg,
      gRatio: kids.length ? +(withImg / kids.length).toFixed(2) : 0 });
  });
  // 重复兄弟分组：同父 + 同 tag + 都是 grid，>=3 个
  var g = {};
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var gtc = cs.gridTemplateColumns;
    if (cs.display.indexOf('grid') < 0 || !gtc || gtc === 'none' || !el.parentElement) return;
    var p = el.parentElement;
    var key = sel(p) + '>' + el.tagName;
    if (!g[key]) g[key] = { key: key, n: 0, chars: 0, gtcs: {} };
    g[key].n++; g[key].chars += strip(el.innerText).length;
    g[key].gtcs[gtc] = (g[key].gtcs[gtc] || 0) + 1;
  });
  var groups = Object.keys(g).map(function(k){ var x = g[k]; x.avg = Math.round(x.chars / x.n);
    x.mode = Object.keys(x.gtcs).sort(function(a,b){ return x.gtcs[b] - x.gtcs[a]; })[0];
    x.raw = splitTracks(x.mode).length; return x; })
    .filter(function(x){ return x.n >= 3 && x.raw >= 2; })
    .sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify({ singles: singles.sort(function(a,b){ return b.chars - a.chars; }).slice(0, 10),
                          groups: groups.slice(0, 10) });
})()`;

const CASES = [
  ['S01', 'S01-red-wedge-broadsheet'], ['S03', 'S03-long-exposure-observatory'],
  ['S07', 'S07-slate-ink-contents'], ['S17', 'S17-revenue-stamp-stub'],
  ['S33', 'S33-teal-mirror-ledger'], ['S09', 'S09-batik-price-board'],
  ['S28', 'S28-jazz-intaglio-wall'],
];
for (const [id, dir] of CASES) {
  await pg.goto(`http://127.0.0.1:${port}/prototypes/${dir}/`, { settleMs: 1800 });
  const d = JSON.parse(await pg.eval(PROBE));
  console.log(`\n===== ${id} 单容器 =====`);
  for (const x of d.singles) console.log(`  ${String(x.chars).padStart(5)}字 raw=${String(x.raw).padStart(2)} wide=${String(x.wide).padStart(3)} kids=${x.kids} img=${x.img}(${x.gRatio}) avg=${String(x.avg).padStart(4)}  ${x.sel}`);
  console.log(`----- ${id} 重复兄弟组 -----`);
  for (const x of d.groups) console.log(`  ${String(x.chars).padStart(5)}字 n=${String(x.n).padStart(2)} avg=${String(x.avg).padStart(4)} raw=${String(x.raw).padStart(2)}  ${x.key.slice(0,50)}  mode=[${x.mode.slice(0,60)}]`);
}
await browser.close();
server.close();
