// 精确测：close 之后到底是谁挂着进程？
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

const browser = await Browser.launch();
const pg = await browser.newPage();
await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/S17-revenue-stamp-stub/`, { settleMs: 800 });
await pg.close();
await browser.close();
server.close();

const t = Date.now();
process.on('exit', () => {
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  console.log('进程退出。close 之后多花了 ' + secs + ' 秒（这段时间里 Node 在等 handle 释放）');
});
// 立刻列出 handle
const handles = process._getActiveHandles ? process._getActiveHandles() : [];
console.log('close 后立刻: ' + handles.length + ' 个 handle');
handles.forEach((h, i) => {
  const name = (h.constructor && h.constructor.name) || '?';
  console.log('  ' + (i+1) + '. ' + name + (h.fd != null ? ' fd=' + h.fd : '') + (h.destroyed != null ? ' destroyed=' + h.destroyed : ''));
});
