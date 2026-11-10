#!/usr/bin/env node
// Lead v14：两个核实
//   A. S21 是否也暴露浏览器默认链接蓝
//   B. 字号维度：提示词到底给不给字号？原型真实字号层级是多少？
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8737, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9348', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome14', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9348/json/version');
let page = (await (await fetch('http://127.0.0.1:9348/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9348/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

console.log('=== A. 每案 <a> 的渲染色（找浏览器默认蓝 #0000EE）===\n');
for (const d of DIRS) {
  const id = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:8737/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1100));
  const r = await evalJs(`(function(){
    var out = [];
    document.querySelectorAll('a').forEach(function(a){
      var cs = getComputedStyle(a);
      var m = cs.color.match(/rgba?\\((\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);
      var hex = m ? '#'+[m[1],m[2],m[3]].map(function(x){return (+x).toString(16).padStart(2,'0');}).join('') : cs.color;
      var rect = a.getBoundingClientRect();
      out.push({hex:hex, cls:String(a.className||'').slice(0,20), txt:a.textContent.trim().slice(0,18), w:Math.round(rect.width), left:Math.round(rect.left)});
    });
    return out;
  })()`);
  const blue = r.filter((x) => x.hex === '#0000ee');
  if (blue.length) console.log(`  ${id}  ⚠ ${blue.length} 个 <a> 用默认蓝: ${blue.map((b) => '(' + b.cls + '|' + b.txt + '|w=' + b.w + '|left=' + b.left + ')').join(' ')}`);
  else if (r.length <= 2) console.log(`  ${id}  <a> ${r.length} 个: ${r.map((b) => b.hex + '(' + b.cls + ')').join(' ')}`);
}
console.log('（只列出有 <a> 或异常蓝的案）');

console.log('\n\n=== B. 30 案真实字号层级（1440，按字符数加权）===\n');
const scale = {};
for (const d of DIRS) {
  const id = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:8737/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1300));
  const r = await evalJs(`(function(){
    var map = {};
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while((n = walker.nextNode())){
      var t = n.nodeValue; if(!t || !t.trim()) continue;
      var el = n.parentElement; if(!el) continue;
      var cs = getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden') continue;
      var rect = el.getBoundingClientRect();
      if(rect.width===0||rect.height===0) continue;
      var fs = Math.round(parseFloat(cs.fontSize));
      var len = t.trim().length;
      if(!map[fs]) map[fs] = {chars:0, n:0, tags:{}};
      map[fs].chars += len; map[fs].n++;
      var k = el.tagName.toLowerCase();
      map[fs].tags[k] = (map[fs].tags[k]||0)+1;
    }
    var tot = Object.values(map).reduce(function(a,x){return a+x.chars;},0);
    var h1 = document.querySelector('h1');
    return {
      levels: Object.keys(map).map(Number).sort(function(a,b){return a-b;}).map(function(k){ return {px:k, chars:map[k].chars, share:+(map[k].chars/tot*100).toFixed(1), n:map[k].n, tags:Object.keys(map[k].tags).slice(0,4)}; }),
      totalChars: tot,
      h1: h1 ? { text: h1.textContent.trim().slice(0,24), px: Math.round(parseFloat(getComputedStyle(h1).fontSize)) } : null
    };
  })()`);
  scale[id] = r;
  const top = r.levels.slice().sort((a, b) => b.chars - a.chars).slice(0, 4);
  console.log(`${id}  ${String(r.levels.length).padStart(2)} 档  H1=${r.h1 ? r.h1.px + 'px' : '?'}  主导: ${top.map((t) => t.px + 'px(' + t.share + '%)').join(' ')}`);
}

const counts = Object.values(scale).map((s) => s.levels.length);
console.log(`\n字号档位数：min=${Math.min(...counts)} 中位=${counts.slice().sort((a, b) => a - b)[15]} max=${Math.max(...counts)}`);
const h1s = Object.entries(scale).filter(([k, v]) => v.h1).map(([k, v]) => v.h1.px);
console.log(`H1 字号：min=${Math.min(...h1s)} 中位=${h1s.slice().sort((a, b) => a - b)[Math.floor(h1s.length / 2)]} max=${Math.max(...h1s)}`);

const fs2 = await import('node:fs');
fs2.writeFileSync(join(ROOT, 'deliverables/70-plan/typescale-30.json'), JSON.stringify(scale, null, 1));
console.log('\n已写 deliverables/70-plan/typescale-30.json');

ws.close(); ch.kill(); server.close(); process.exit(0);
