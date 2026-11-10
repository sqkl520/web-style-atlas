#!/usr/bin/env node
// Lead v16：3px 线宽是从哪来的？
// 假设：它是浏览器默认 focus outline（Chrome 默认 3px）或滚动条，而不是设计里的线。
// 这决定了「22/30 案线宽超纲」是真缺陷还是我的测量误报。
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
await new Promise((r) => server.listen(8739, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9350', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome16', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9350/json/version');
let page = (await (await fetch('http://127.0.0.1:9350/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9350/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

for (const d of ['S07-slate-ink-contents', 'S02-gilded-symmetry-salon', 'S25-spotcolor-contents-zine']) {
  await send('Page.navigate', { url: `http://127.0.0.1:8739/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1300));
  const info = await evalJs(`(function(){
    var out = [];
    document.querySelectorAll('*').forEach(function(el){
      var cs = getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      if(cs.display==='none'||cs.visibility==='hidden'||rect.width===0||rect.height===0) return;
      var hits = [];
      ['Top','Right','Bottom','Left'].forEach(function(k){
        if(Math.abs(parseFloat(cs['border'+k+'Width'])-3)<0.01) hits.push('border'+k+'='+cs['border'+k+'Width']+' '+cs['border'+k+'Style']+' '+cs['border'+k+'Color']);
      });
      if(Math.abs(parseFloat(cs.outlineWidth)-3)<0.01 && cs.outlineStyle!=='none') hits.push('OUTLINE='+cs.outlineWidth+' '+cs.outlineStyle+' '+cs.outlineColor);
      if(el instanceof SVGElement){ var sw=parseFloat(cs.strokeWidth); if(Math.abs(sw-3)<0.01) hits.push('stroke='+sw); }
      if(hits.length) out.push({tag:el.tagName.toLowerCase(), cls:String(el.className&&el.className.toString?el.className.toString():'').slice(0,32), hits:hits.slice(0,2), w:Math.round(rect.width), h:Math.round(rect.height)});
    });
    // 统计：有多少是 outline，多少是 border
    var nOutline = out.filter(function(o){return o.hits.some(function(h){return h.indexOf('OUTLINE')===0;});}).length;
    var nBorder = out.filter(function(o){return o.hits.some(function(h){return h.indexOf('border')===0;});}).length;
    var nStroke = out.filter(function(o){return o.hits.some(function(h){return h.indexOf('stroke')===0;});}).length;
    return { total: out.length, nOutline: nOutline, nBorder: nBorder, nStroke: nStroke, samples: out.slice(0,10) };
  })()`);
  console.log(`\n=== ${d.slice(0, 3)}  3px 元素 ${info.total} 个：outline=${info.nOutline} border=${info.nBorder} stroke=${info.nStroke} ===`);
  for (const s of info.samples) console.log(`   ${s.tag}.${s.cls}  ${s.hits.join(' | ')}  (${s.w}x${s.h})`);
}
ws.close(); ch.kill(); server.close(); process.exit(0);
