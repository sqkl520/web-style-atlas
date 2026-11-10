#!/usr/bin/env node
// Lead v13：核实 S08 的 #FFF4D6 从哪来
// 假设：它是 opacity < 1 的元素在琥珀底上合成出的颜色（浏览器 getComputedStyle 会报原文色，
// 但如果元素有 opacity 或 filter，实际像素是合成的）。也可能来自 SVG 渐变 stop。
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
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
await new Promise((r) => server.listen(8736, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9347', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome13', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9347/json/version');
let page = (await (await fetch('http://127.0.0.1:9347/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9347/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

for (const d of ['S08-amber-overprint-lightbox', 'S24-cyanotype-rainforest-path']) {
  await send('Page.navigate', { url: `http://127.0.0.1:8736/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1800));
  const info = await evalJs(`(function(){
    var want = ${d.startsWith('S08') ? "'#fff4d6'" : "'#3c5f48'"};
    var out = [];
    var all = document.querySelectorAll('*');
    function isEl(e){ return e instanceof Element; }
    for(var i=0;i<all.length;i++){
      var el = all[i];
      var cs = getComputedStyle(el);
      var props = ['color','backgroundColor','borderTopColor','borderBottomColor','borderLeftColor','borderRightColor','outlineColor','fill','stroke','textDecorationColor'];
      var hit = null;
      for(var k=0;k<props.length;k++){
        var v = cs[props[k]];
        if(!v) continue;
        var m = v.match(/rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);
        if(m){
          var hex='#'+[m[1],m[2],m[3]].map(function(x){return (+x).toString(16).padStart(2,'0');}).join('');
          if(hex===want){ hit = props[k]+'='+v; break; }
        }
      }
      if(!hit){
        ['::before','::after'].forEach(function(ps){
          if(hit) return;
          var pc = getComputedStyle(el, ps);
          if(!pc) return;
          var v = pc.color + ' | ' + pc.backgroundColor + ' | ' + pc.borderTopColor;
          var mm = v.match(/rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/g);
          if(mm) mm.forEach(function(x){ var m2=x.match(/(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/); if(m2){var h='#'+[m2[1],m2[2],m2[3]].map(function(y){return (+y).toString(16).padStart(2,'0');}).join(''); if(h===want) hit = ps+' '+v.slice(0,80);} });
        });
      }
      if(hit){
        var r = el.getBoundingClientRect();
        out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className||'').slice(0,50), prop: hit, opacity: cs.opacity, filter: cs.filter, rect: [Math.round(r.width), Math.round(r.height)], vis: r.width>0&&r.height>0, outer: el.outerHTML.slice(0,120) });
      }
    }
    // 也查 SVG gradient stop
    var stops = [];
    document.querySelectorAll('stop').forEach(function(s){
      ['stop-color'].forEach(function(a){
        var v = s.getAttribute(a) || getComputedStyle(s).stopColor;
        var m = String(v).match(/rgba?\\((\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);
        if(m){ var h='#'+[m[1],m[2],m[3]].map(function(x){return (+x).toString(16).padStart(2,'0');}).join(''); if(h===want) stops.push(v); }
      });
    });
    return { hits: out.slice(0,8), n: out.length, stops: stops.slice(0,5) };
  })()`);
  console.log(`\n=== ${d.slice(0, 3)} ===`);
  console.log(JSON.stringify(info, null, 1).slice(0, 2200));
}
ws.close(); ch.kill(); server.close(); process.exit(0);
