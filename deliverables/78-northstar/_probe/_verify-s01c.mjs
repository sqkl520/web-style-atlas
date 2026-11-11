// 第三版：彻底绕开反斜杠转义问题 —— 在页面里用 indexOf 手工切分，不用正则。
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

// 手写切分：按空白字符（空格/tab/换行）切，不依赖正则字面量
const PROBE = `(function(){
  function splitWS(v){
    var out = [], cur = '';
    for (var i = 0; i < v.length; i++) {
      var c = v.charAt(i);
      if (c === ' ' || c === String.fromCharCode(9) || c === String.fromCharCode(10)) {
        if (cur) { out.push(cur); cur = ''; }
      } else cur += c;
    }
    if (cur) out.push(cur);
    return out;
  }
  var all = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    if (!cs.display.includes('grid') || !cs.gridTemplateColumns || cs.gridTemplateColumns === 'none') return;
    var tracks = splitWS(cs.gridTemplateColumns).length;
    var rc = el.getBoundingClientRect();
    all.push({ sel: el.tagName + '.' + String(el.className||'').slice(0,26), tracks: tracks,
               area: Math.round(rc.width*rc.height), gtc: cs.gridTemplateColumns.slice(0,70) });
  });
  var pick = null;
  all.forEach(function(x){ if (x.tracks >= 2 && x.tracks <= 4 && (!pick || x.area > pick.area)) pick = x; });
  return JSON.stringify({ all: all, measurePick: pick });
})()`;

for (const [id, dir] of [['S01','S01-red-wedge-broadsheet'], ['S17','S17-revenue-stamp-stub'], ['S33','S33-teal-mirror-ledger']]) {
  await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/${dir}/`, { settleMs: 2000 });
  const d = JSON.parse(await pg.eval(PROBE));
  console.log(`\n=== ${id} ===`);
  d.all.forEach(x => console.log(`  ${String(x.tracks).padStart(2)} 轨  面积 ${String(x.area).padStart(8)}  ${x.sel.padEnd(26)} ${x.gtc}`));
  console.log(`  measure.mjs 会选：${d.measurePick ? d.measurePick.sel + '（' + d.measurePick.tracks + ' 轨）' : '★ 一个都选不出'}`);
}
await browser.close(); server.close();
