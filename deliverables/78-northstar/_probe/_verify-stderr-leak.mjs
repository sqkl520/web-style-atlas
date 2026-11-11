// 实测：Browser.close() 后进程为什么还要等？
// 判据不是"报告说 22 秒"，而是自己计时 + 看还有什么 handle 活着。
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

const t0 = Date.now();
const browser = await Browser.launch();
const tLaunch = Date.now() - t0;

const t1 = Date.now();
const pg = await browser.newPage();
await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/S17-revenue-stamp-stub/`, { settleMs: 1500 });
const tPage = Date.now() - t1;

const t2 = Date.now();
await pg.close();
await browser.close();
const tClose = Date.now() - t2;
server.close();

console.log('launch:', tLaunch, 'ms | newPage+goto:', tPage, 'ms | page.close+browser.close:', tClose, 'ms');
console.log('总计:', Date.now() - t0, 'ms');

// 关键：close 之后进程还活着吗？看还有哪些 active handles
const t3 = Date.now();
setTimeout(() => {
  const handles = process._getActiveHandles ? process._getActiveHandles() : [];
  const kinds = handles.map(h => h.constructor && h.constructor.name).filter(Boolean);
  console.log('\nclose 之后仍然活着的 handle:', kinds.length ? kinds.join(', ') : '（无）');
  console.log('从 close 返回到现在:', Date.now() - t3, 'ms');
  // 强制列出 stdout/stderr
  const std = handles.filter(h => h === process.stdout || h === process.stderr || (h.fd === 1 || h.fd === 2));
  console.log('其中 stdout/stderr 类:', std.length);
}, 100);
