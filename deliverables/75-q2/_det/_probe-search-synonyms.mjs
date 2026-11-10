// 真 Chrome 里验证：在搜索框里打「潮牌」「修鞋理发」「小吃店」，现在能不能筛出案。
//
// 为什么必须真跑：check-scenes.mjs 的 searchHaystack 是我**复刻**的逻辑，
// 复刻对了不等于产品对了。本仓库最反复的病就是「检查器与实现各写一份，然后一起错」。
// 前两版脚本自己也有两个 bug（目录 URL 没补 index.html、ROOT 的盘符处理），
// 都是跑了才发现的 —— 这本身就是"必须真跑"的证据。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const p = join(ROOT, rel);
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await Browser.launch();
const pg = await browser.newPage();
try {
  await pg.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1500 });
  const ready = await pg.eval(`new Promise(function(res){var t0=Date.now();(function poll(){
    if(document.querySelectorAll('#ledger .row').length>0 && document.getElementById('q')) return res(true);
    if(Date.now()-t0>20000) return res(false); setTimeout(poll,100);})();})`);
  if (!ready) throw new Error('页面未就绪');

  const terms = ['潮牌', '修鞋理发', '小吃店', '咖啡店', '设计工作室', '展览', '档案'];
  console.log('词              命中案数   案号');
  for (const t of terms) {
    // 走真实路径：设 input.value 并派发 input 事件（app.js:317 监听的是这个）
    const ids = await pg.eval(`(function(q){
      var inp = document.getElementById('q');
      inp.value = q;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return new Promise(function(res){ setTimeout(function(){
        var rows = document.querySelectorAll('#ledger .row');
        res([].map.call(rows, function(r){ return r.getAttribute('data-id'); }));
      }, 350); });
    })(${JSON.stringify(t)})`);
    console.log(('「' + t + '」').padEnd(16), String(ids.length).padStart(3), '   ', ids.slice(0, 12).join(','));
  }
} finally {
  await browser.close();
  server.close();
}
