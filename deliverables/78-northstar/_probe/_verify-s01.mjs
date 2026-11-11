// 独立核实：measure.mjs 在 S01 上选中了哪个元素？
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const server = createServer(async (req,res)=>{try{let rel=decodeURIComponent(req.url.split('?')[0]);if(rel.endsWith('/'))rel+='index.html';
  const p=join(ROOT,rel);const b=await readFile(p);res.writeHead(200,{'Content-Type':MIME[extname(p)]||'application/octet-stream'});res.end(b);}
  catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser = await Browser.launch(); const pg = await browser.newPage();
try {
  await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/S01-red-wedge-broadsheet/`, { settleMs: 2500 });

  const r = await pg.eval(`(function(){
    var all = [];
    document.querySelectorAll('*').forEach(function(el){
      var cs = getComputedStyle(el);
      if (!cs.display.includes('grid') || !cs.gridTemplateColumns || cs.gridTemplateColumns === 'none') return;
      var tracks = cs.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      var rc = el.getBoundingClientRect();
      all.push({ sel: el.tagName + '.' + String(el.className||'').slice(0,26), tracks: tracks,
                 area: Math.round(rc.width*rc.height), gtc: cs.gridTemplateColumns.slice(0,60) });
    });
    // 复刻 measure.mjs 的判据：2-4 轨 + 面积最大
    var pick = null;
    all.forEach(function(x){ if (x.tracks >= 2 && x.tracks <= 4 && (!pick || x.area > pick.area)) pick = x; });
    return JSON.stringify({ all: all, measurePick: pick }, null, 1);
  })()`);
  const d = JSON.parse(r);
  console.log('S01 页面上所有 grid 容器：');
  d.all.forEach(x => console.log(`  ${x.tracks} 轨  面积 ${String(x.area).padStart(9)}  ${x.sel.padEnd(28)} ${x.gtc}`));
  console.log('\nmeasure.mjs 会选中：', d.measurePick ? `${d.measurePick.sel}（${d.measurePick.tracks} 轨）` : '（无）');
  console.log('CSS 真值：.columns 是 7 轨（4 栏 + 3 条 24px 铅条）→ 被 tracks>4 排除');
} finally { await browser.close(); server.close(); }
