#!/usr/bin/env node
// Lead v17：修正后的线宽实测
// v15 的致命错误：把 outlineWidth 的默认值 3px 当成"实际用了 3px 线"，
// 但 Chrome 对绝大多数元素返回 outline-width:3px 而 outline-style:none（视觉上没有线）。
// 修正：outline 必须 outlineStyle !== 'none' 才算；border 必须 borderStyle !== 'none'。
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
await new Promise((r) => server.listen(8740, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9351', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome17', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9351/json/version');
let page = (await (await fetch('http://127.0.0.1:9351/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9351/json/new?about:blank', { method: 'PUT' })).json();
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

console.log('=== 修正后：提示词声称的线宽 vs 页面视觉上真实存在的线宽 ===\n');
const results = {};
for (const d of DIRS) {
  const id = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:8740/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1200));
  const counts = await evalJs(`(function(){
    var counts = {};
    function add(v){ var n = Math.round(parseFloat(v)*100)/100; if(!n || n<=0) return; counts[n]=(counts[n]||0)+1; }
    document.querySelectorAll('*').forEach(function(el){
      var cs = getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      if(cs.display==='none'||cs.visibility==='hidden'||rect.width===0||rect.height===0) return;
      ['Top','Right','Bottom','Left'].forEach(function(k){
        var st = cs['border'+k+'Style'];
        var w = parseFloat(cs['border'+k+'Width']);
        if(w>0 && st && st!=='none' && st!=='hidden') add(w);
      });
      var os = cs.outlineStyle;
      var ow = parseFloat(cs.outlineWidth);
      if(ow>0 && os && os!=='none') add(ow);
      if(el instanceof SVGElement){
        var sw = parseFloat(cs.strokeWidth);
        var strokeAttr = el.getAttribute('stroke');
        var computedStroke = cs.stroke;
        var hasStroke = (strokeAttr && strokeAttr!=='none') || (computedStroke && computedStroke!=='none' && !/rgba\\(0, 0, 0, 0\\)/.test(computedStroke));
        if(sw>0 && hasStroke) add(sw);
      }
      ['::before','::after'].forEach(function(ps){
        var pc = getComputedStyle(el, ps);
        if(!pc || pc.content==='none') return;
        ['Top','Right','Bottom','Left'].forEach(function(k){
          var st = pc['border'+k+'Style'];
          var w = parseFloat(pc['border'+k+'Width']);
          if(w>0 && st && st!=='none') add(w);
        });
      });
    });
    return counts;
  })()`);
  const claimed = String(byId.get(id)?.lineWidths || '').match(/[\d.]+/g)?.map(Number) || [];
  const actual = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const notClaimed = actual.filter((x) => !claimed.some((c) => Math.abs(c - x) < 0.02));
  const claimedMissing = claimed.filter((c) => !actual.some((x) => Math.abs(c - x) < 0.02));
  results[id] = { claimed, actual, counts, notClaimed, claimedMissing };
  console.log(
    `${id}  声称[${claimed.join('、')}]  实际[${actual.map((x) => x + ':' + counts[x]).join(' ')}]  ` +
    `${notClaimed.length ? '超出:' + notClaimed.join('、') : '✓'}  ${claimedMissing.length ? '声称未用:' + claimedMissing.join('、') : ''}`
  );
}

const bad = Object.entries(results).filter(([, v]) => v.notClaimed.length);
const miss = Object.entries(results).filter(([, v]) => v.claimedMissing.length);
console.log(`\n=== 汇总 ===`);
console.log(`实际用到「声称之外」的线宽: ${bad.length}/30 案`);
console.log(`声称了但页面没用到的线宽:   ${miss.length}/30 案`);
const allActual = new Set();
for (const [, v] of Object.entries(results)) v.actual.forEach((x) => allActual.add(x));
console.log(`全库出现过的线宽值（共 ${allActual.size} 种）: ${[...allActual].sort((a, b) => a - b).join(' ')}`);

const fs2 = await import('node:fs');
fs2.writeFileSync(join(ROOT, 'deliverables/70-plan/linewidths-fixed-30.json'), JSON.stringify(results, null, 1));
console.log('\n已写 deliverables/70-plan/linewidths-fixed-30.json');
console.log('\n逐案超出明细:');
for (const [k, v] of bad) console.log(`  ${k}  声称[${v.claimed.join('、')}]  超[${v.notClaimed.join('、')}]`);
console.log('\n逐案声称未用明细:');
for (const [k, v] of miss) console.log(`  ${k}  声称[${v.claimed.join('、')}]  未用[${v.claimedMissing.join('、')}]`);

ws.close(); ch.kill(); server.close(); process.exit(0);
