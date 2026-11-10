#!/usr/bin/env node
// Lead v8：dump 30 条线上提示词的"配色"与"线宽"两句原文 + 长度
// 需要有 CHO 可用；用 CDP 或直接 node 里 eval prompt-copy 依赖。
// 这里走 CDP（仓库既有做法），先起 http server。
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8733, '127.0.0.1', r));

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const userDir = 'D:/Web/style/deliverables/70-plan/_chrome';
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9344', `--user-data-dir=${userDir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore', detached: false });

async function waitPort(url, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('chrome not up');
}
await waitPort('http://127.0.0.1:9344/json/version');

const targets = await (await fetch('http://127.0.0.1:9344/json/list')).json();
let page = targets.find((t) => t.type === 'page');
if (!page) {
  const r = await fetch('http://127.0.0.1:9344/json/new?about:blank', { method: 'PUT' });
  page = await r.json();
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
function send(method, params = {}) {
  const i = ++id;
  return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8733/prototypes/_selection/index.html' });
await new Promise((r) => setTimeout(r, 3500));

const out = await evalJs(`(function(){
  var ids = window.SCHEMES.map(function(s){return s.id;});
  return ids.map(function(id){
    var t = window.buildStylePrompt(id);
    var m1 = t.match(/1\\. 配色只用这几个值：([^\\n]*)/);
    var m2 = t.match(/5\\. 线宽只用这几级：([^\\n]*)/);
    return { id:id, len:t.length, paletteLine: m1?m1[1]:null, lineLine: m2?m2[1]:null };
  });
})()`);

console.log('=== 30 条线上提示词的配色句 / 线宽句 ===\n');
for (const r of out) {
  const hexN = (r.paletteLine || '').match(/#[0-9A-Fa-f]{6}/g)?.length ?? 0;
  console.log(`${r.id}  len=${String(r.len).padStart(4)}  hex=${hexN}`);
  console.log(`    配色: ${r.paletteLine}`);
  console.log(`    线宽: ${r.lineLine}`);
}
const lens = out.map((r) => r.len);
console.log(`\n长度 min=${Math.min(...lens)} 中位=${lens.slice().sort((a,b)=>a-b)[15]} max=${Math.max(...lens)}`);
const hexCounts = out.map((r) => (r.paletteLine || '').match(/#[0-9A-Fa-f]{6}/g)?.length ?? 0);
console.log(`配色句 hex 数分布: ${JSON.stringify(hexCounts.reduce((a,c)=>(a[c]=(a[c]||0)+1,a),{}))}`);

ws.close(); ch.kill(); server.close();
process.exit(0);
