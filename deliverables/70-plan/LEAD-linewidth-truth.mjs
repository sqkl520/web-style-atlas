#!/usr/bin/env node
// Lead v15：线宽真相
// 提示词说「线宽只用这几级：X、Y、Z，不要自创第三级」——这句本身自相矛盾（列了 3-4 级却说"第三级"）
// 核对：提示词给的 vs 页面实际渲染的 stroke-width / border-width
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
await new Promise((r) => server.listen(8738, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9349', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome15', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9349/json/version');
let page = (await (await fetch('http://127.0.0.1:9349/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9349/json/new?about:blank', { method: 'PUT' })).json();
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
const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));

console.log('=== 提示词声称的线宽 vs 页面实际渲染的线宽（1440）===\n');
console.log('案   提示词声称                    实际用到的（按出现次数）             不在声称里');
console.log('-'.repeat(110));
const results = {};
for (const d of DIRS) {
  const id = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:8738/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1200));
  const r = await evalJs(`(function(){
    var counts = {};
    function add(v){ var n = Math.round(parseFloat(v)*100)/100; if(!n || n<=0) return; counts[n]=(counts[n]||0)+1; }
    document.querySelectorAll('*').forEach(function(el){
      var cs = getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      var vis = cs.display!=='none' && cs.visibility!=='hidden' && rect.width>0 && rect.height>0;
      if(!vis) return;
      ['Top','Right','Bottom','Left'].forEach(function(k){
        var w = parseFloat(cs['border'+k+'Width']); if(w>0) add(w);
      });
      if(parseFloat(cs.outlineWidth)>0) add(cs.outlineWidth);
      // SVG
      if(el instanceof SVGElement){
        var sw = cs.strokeWidth;
        if(sw && sw!=='0px' && el.getAttribute('stroke') !== 'none') add(sw);
        var a = el.getAttribute('stroke-width'); if(a) add(a);
      }
      ['::before','::after'].forEach(function(ps){
        var pc = getComputedStyle(el, ps);
        if(!pc || pc.content==='none') return;
        ['Top','Right','Bottom','Left'].forEach(function(k){
          var w = parseFloat(pc['border'+k+'Width']); if(w>0) add(w);
        });
      });
    });
    return counts;
  })()`);
  const claimed = String(byId.get(id)?.lineWidths || '').match(/[\d.]+/g)?.map(Number) || [];
  const actual = Object.keys(r).map(Number).sort((a, b) => a - b);
  const notClaimed = actual.filter((x) => !claimed.some((c) => Math.abs(c - x) < 0.01));
  results[id] = { claimed, actual, counts: r, notClaimed };
  const actualStr = actual.map((x) => x + '(' + (r[String(x)] || r[x]) + ')').join(' ');
  console.log(`${id}  ${(claimed.join('、') + 'px').padEnd(28)} ${actualStr.slice(0, 48).padEnd(50)} ${notClaimed.map((x) => x + 'px').join(' ') || '✓'}`);
}

console.log('\n\n=== 汇总 ===');
const bad = Object.entries(results).filter(([k, v]) => v.notClaimed.length);
console.log(`实际线宽超出声称的案: ${bad.length}/30`);
const fs2 = await import('node:fs');
fs2.writeFileSync(join(ROOT, 'deliverables/70-plan/linewidths-30.json'), JSON.stringify(results, null, 1));
console.log(`\n逐案明细（超出的）:`);
for (const [k, v] of bad) {
  console.log(`  ${k}  声称 ${v.claimed.join('、')}  实际 ${v.actual.join('、')}  超出 ${v.notClaimed.join('、')}`);
}
console.log('\n已写 deliverables/70-plan/linewidths-30.json');

ws.close(); ch.kill(); server.close(); process.exit(0);
