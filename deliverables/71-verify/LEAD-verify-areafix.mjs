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
await new Promise((r) => server.listen(8770, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9371', '--user-data-dir=D:/Web/style/deliverables/71-verify/_chrome_a', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9371/json/version');
let page = (await (await fetch('http://127.0.0.1:9371/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9371/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8770/prototypes/_selection/index.html' });
await new Promise((r) => setTimeout(r, 3500));

const out = await evalJs(`(function(){
  var ids = window.SCHEMES.map(function(s){return s.id;});
  return ids.map(function(id){
    var t = window.buildStylePrompt(id);
    var m = t.match(/①\\s*面积分配：([^\\n]*)/);
    return { id: id, line: m ? m[1] : null };
  });
})()`);

console.log('=== 30 条提示词的第 ① 条（面积分配）===\n');
let has = 0;
const seen = new Set();
for (const r of out) {
  if (r.line) { has++; seen.add(r.line); }
  console.log(`${r.id}  ${r.line || '（未找到）'}`);
}
console.log(`\n有新句的案: ${has}/30`);
console.log(`不同变体数: ${seen.size}（应为 1，说明这条不依赖任何下标）`);
if (seen.size === 1) console.log(`\n统一文案：${[...seen][0]}`);

console.log('\n=== 对比：S01 与 S10 的完整「防退化」段 ===');
for (const target of ['S01', 'S10']) {
  const seg = await evalJs(`(function(){
    var t = window.buildStylePrompt('${target}');
    var i = t.indexOf('防退化');
    return t.slice(i, i + 260);
  })()`);
  console.log(`\n【${target}】\n${seg}`);
}

ws.close(); ch.kill(); server.close(); process.exit(0);
