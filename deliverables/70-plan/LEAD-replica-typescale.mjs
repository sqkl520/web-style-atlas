#!/usr/bin/env node
// Lead v18：决定性问题——复刻实现的字号真的比原型小吗？
// 如果"补字号"是对的，那么已有的 3 个端到端复刻（deliverables/69-test/S20,S21,S28）
// 应该在字号档数上明显少于原型。如果差距不大，那"补字号"这个前提就站不住。
// 对照：同时测"照提示词做的历史复刻" deliverables/62-verify/impl/（如果有）
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
await new Promise((r) => server.listen(8741, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9352', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome18', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9352/json/version');
let page = (await (await fetch('http://127.0.0.1:9352/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9352/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const MEASURE = `(function(){
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
    map[fs] = (map[fs]||0) + len;
  }
  var tot = 0; for(var k in map) tot += map[k];
  var levels = Object.keys(map).map(Number).sort(function(a,b){return a-b;});
  var h1 = document.querySelector('h1');
  return {
    distinct: levels.length,
    min: levels[0], max: levels[levels.length-1],
    h1: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : null,
    total: tot,
    top: levels.map(function(k){return [k, +(map[k]/tot*100).toFixed(1)];}).sort(function(a,b){return b[1]-a[1];}).slice(0,3),
    raw: map
  };
})()`;

const CASES = [
  { id: 'S20', proto: 'S20-plotter-soundfield', impl: 'deliverables/69-test/S20/index.html' },
  { id: 'S21', proto: 'S21-interlocking-release-book', impl: 'deliverables/69-test/S21/index.html' },
  { id: 'S28', proto: 'S28-jazz-intaglio-wall', impl: 'deliverables/69-test/S28/index.html' },
];

console.log('=== 原型 vs 照提示词做的复刻：字号层级对比（1440×900）===\n');
console.log('案    | 原型档数 范围      H1    | 复刻档数 范围      H1    | 判断');
console.log('-'.repeat(92));
const rows = [];
for (const c of CASES) {
  const out = {};
  for (const [k, rel] of [['proto', `prototypes/${c.proto}/index.html`], ['impl', c.impl]]) {
    if (!existsSync(join(ROOT, rel))) { out[k] = null; continue; }
    await send('Page.navigate', { url: `http://127.0.0.1:8741/${rel}` });
    await new Promise((r) => setTimeout(r, 1600));
    try { out[k] = await evalJs(MEASURE); } catch (e) { out[k] = { err: e.message.slice(0, 80) }; }
  }
  const p = out.proto, m = out.impl;
  if (!p || !m || p.err || m.err) { console.log(`${c.id}  测不了`); continue; }
  rows.push({ id: c.id, proto: p, impl: m });
  console.log(`${c.id}   | ${String(p.distinct).padStart(2)} 档  ${p.min}-${p.max}px   ${String(p.h1).padStart(4)}  | ${String(m.distinct).padStart(2)} 档  ${m.min}-${m.max}px   ${String(m.h1).padStart(4)}  | 档数 ${p.distinct}→${m.distinct}, H1 ${p.h1}→${m.h1}`);
}

console.log('\n=== 复刻实现的字号分布（按字符数加权，前 4 档）===');
for (const r of rows) {
  console.log(`\n${r.id}`);
  console.log(`  原型: ${r.proto.top.map(([px, s]) => px + 'px(' + s + '%)').join(' ')}   总字符 ${r.proto.total}`);
  console.log(`  复刻: ${r.impl.top.map(([px, s]) => px + 'px(' + s + '%)').join(' ')}   总字符 ${r.impl.total}`);
}

console.log('\n=== 判定 ===');
for (const r of rows) {
  const dRatio = r.impl.distinct / r.proto.distinct;
  const h1Ratio = r.impl.h1 / r.proto.h1;
  console.log(`  ${r.id}  档数比 ${dRatio.toFixed(2)}  H1 比 ${h1Ratio.toFixed(2)}  ${h1Ratio < 0.5 ? '← H1 明显偏小' : ''}`);
}
const avgH1 = rows.reduce((a, r) => a + r.impl.h1 / r.proto.h1, 0) / rows.length;
console.log(`\nH1 平均比例: ${avgH1.toFixed(2)}  （<1 说明复刻标题普遍偏小）`);

ws.close(); ch.kill(); server.close(); process.exit(0);
