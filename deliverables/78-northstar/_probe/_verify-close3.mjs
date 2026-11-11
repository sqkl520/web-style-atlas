// 精确定位：close 之后那个 fd=2 的 Socket 到底是什么，为什么没销毁。
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
await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/S17-revenue-stamp-stub/`, { settleMs: 500 });
await pg.close();

console.log('close 前: proc.stderr 存在 =', !!browser.proc.stderr, ' destroyed =', browser.proc.stderr && browser.proc.stderr.destroyed);
await browser.close();
console.log('close 后: proc.stderr 存在 =', !!browser.proc.stderr, ' destroyed =', browser.proc.stderr && browser.proc.stderr.destroyed);
console.log('proc.exitCode =', browser.proc.exitCode, ' signalCode =', browser.proc.signalCode);
server.close();

const t = Date.now();
process.on('exit', () => console.log('额外等了 ' + ((Date.now()-t)/1000).toFixed(1) + ' 秒'));
const hs = process._getActiveHandles ? process._getActiveHandles() : [];
console.log('剩余 handle:');
hs.forEach((h,i) => console.log('  ' + (i+1) + '. ' + ((h.constructor&&h.constructor.name)||'?') + (h.fd!=null?' fd='+h.fd:'') + (h===process.stderr?' ← 是 process.stderr':'') + (h===process.stdout?' ← 是 process.stdout':'')));
