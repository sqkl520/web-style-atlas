// 真浏览器验证：「复制并附出处」是否真的把出处拼进去了。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try { let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const p = join(ROOT, rel); const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await Browser.launch(); const pg = await browser.newPage();
try {
  await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/_selection/#S17`, { settleMs: 2500 });
  const r = await pg.eval(`(function(){
    var out = { hasProv: typeof window.PROVENANCE !== 'undefined' };
    if (out.hasProv) { out.cases = window.PROVENANCE.length;
      var s17 = window.PROVENANCE.filter(function(x){return x.id==='S17'})[0];
      out.s17claims = s17 ? s17.claims.length : 0;
      out.sample = s17 ? s17.claims.slice(0,2) : []; }
    var btns = document.querySelectorAll('.prompt-copy');
    out.btnCount = btns.length;
    out.btnLabels = [].map.call(btns, function(b){return b.textContent.trim()});
    return JSON.stringify(out);
  })()`);
  console.log('页面状态:', r);
  // 点到「复制并附出处」，拦截剪贴板拿到内容
  const copied = await pg.eval(`(function(){
    var captured = null;
    try { Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){captured=t;return Promise.resolve();}},configurable:true}); } catch(e){}
    var pb = document.querySelector('.prompt-copy-prov');
    if (!pb) return JSON.stringify({err:'没有附出处按钮'});
    pb.click();
    return new Promise(function(res){ setTimeout(function(){
      res(JSON.stringify({ len: captured?captured.length:0,
        hasAppendix: captured?/下面这段是给出处的/.test(captured):false,
        hasLineRef: captured?/第 \d+ 行/.test(captured):false,
        tail: captured?captured.slice(-260):'' }));
    },400); });
  })()`);
  console.log('复制内容:', copied);
} finally { await browser.close(); server.close(); }
