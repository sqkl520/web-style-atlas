import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
const server = createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8746, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9357', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome26', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9357/json/version');
let page = (await (await fetch('http://127.0.0.1:9357/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9357/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8746/prototypes/_selection/index.html' });
await new Promise((r) => setTimeout(r, 3500));

// 更宽松：直接找任何含 px 的"标题/字号"句子
const out = await evalJs(`(function(){
  var ids = window.SCHEMES.map(function(s){return s.id;});
  return ids.map(function(id){
    var t = window.buildStylePrompt(id);
    var hits = [];
    var re = /[^。\\n]*(主标题|标题取|字阶|字号|font-size)[^。\\n]*/g;
    var m;
    while((m = re.exec(t))) hits.push(m[0].trim().slice(0,100));
    return { id: id, hits: hits, hasClamp: /clamp\\(/.test(t), len: t.length };
  });
})()`);

console.log('=== 用更宽松的正则找"字号"相关句 ===\n');
for (const r of out) {
  console.log(`${r.id}  len=${r.len}  clamp=${r.hasClamp}  命中${r.hits.length}句`);
  for (const h of r.hits) console.log(`     → ${h}`);
}
const any = out.filter((r) => r.hits.length > 0);
console.log(`\n有任何字号相关句的案: ${any.length}/30`);
console.log(`含 clamp( 的案: ${out.filter((r) => r.hasClamp).length}/30`);

ws.close(); ch.kill(); server.close(); process.exit(0);
