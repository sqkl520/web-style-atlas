// 诊断 3：候选容器的 landmark 归属 + 直接跑 vendor/probe.mjs 的 probe()，
// 用已验证的方法论做交叉对账（measure 应给出与 probe.structure.columns 一致的值）。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { probe } from '../../../prototypes/_build/vendor/probe.mjs';
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
  var land = function(el){
    var out = [];
    for (var p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      var t = p.tagName.toLowerCase();
      if (t === 'footer' || t === 'header' || t === 'nav' || t === 'aside' || t === 'main' || p.getAttribute('role') === 'contentinfo' || p.getAttribute('role') === 'banner') out.push(t);
    }
    return out.join('<');
  };
  var rows = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var gtc = cs.gridTemplateColumns;
    var cc = parseInt(cs.columnCount, 10);
    var isG = cs.display.indexOf('grid') >= 0 && gtc && gtc !== 'none';
    var isC = !isG && cc > 1;
    if (!isG && !isC) return;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    rows.push({ sel: sel(el).slice(0,36), kind: isG ? 'grid' : 'colcount', cc: isC ? cc : 0,
                chars: strip(el.innerText).length, in: land(el).slice(0,40),
                gtc: (gtc || '').slice(0, 46) });
  });
  rows.sort(function(a,b){ return b.chars - a.chars; });
  return JSON.stringify(rows.slice(0, 14));
})()`;

const probeFn = probe.toString();
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
  for (const x of rows) console.log(`  ${String(x.chars).padStart(5)}字 ${x.kind.padEnd(8)} cc=${x.cc}  ${x.sel.padEnd(28)} in[${x.in}] ${x.gtc}`);
  const st = await pg.eval(`(${probeFn})().structure`);
  console.log(`  → vendor/probe 的结论: columns=${st.columns} from=${st.columnsFrom} all=${JSON.stringify(st.columnsAll)} dist=${JSON.stringify(st.columnDistribution)} axis=${st.axisWidth}`);
}
await browser.close();
server.close();
