#!/usr/bin/env node
// Lead v19：排除混淆因素——复刻的 H1 偏小，是因为"页面内容本来就少"，还是"字号真的缩水"？
// 判据：
//   1. 页高对比（docH）
//   2. H1 相对页面的比例（H1 / docH）
//   3. H1 相对正文字号的比例（这是与内容量无关的纯排版指标）
//   4. 每屏字符密度
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
await new Promise((r) => server.listen(8742, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9353', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome19', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9353/json/version');
let page = (await (await fetch('http://127.0.0.1:9353/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9353/json/new?about:blank', { method: 'PUT' })).json();
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
    map[fs] = (map[fs]||0) + t.trim().length;
  }
  var tot = 0; for(var k in map) tot += map[k];
  // 正文主导字号 = 字符数最多的档
  var bodySize = null, best = -1;
  for(var k in map){ if(map[k] > best){ best = map[k]; bodySize = +k; } }
  var h1 = document.querySelector('h1');
  var docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  var maxFs = Math.max.apply(null, Object.keys(map).map(Number));
  return {
    docH: docH, screens: +(docH/900).toFixed(2),
    h1: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : null,
    bodySize: bodySize, maxFs: maxFs,
    totalChars: tot, charsPerScreen: Math.round(tot/(docH/900)),
    h1OverBody: bodySize ? +(Math.max.apply(null,Object.keys(map).map(Number))/bodySize).toFixed(2) : null
  };
})()`;

const CASES = [
  { id: 'S20', proto: 'prototypes/S20-plotter-soundfield/index.html', impl: 'deliverables/69-test/S20/index.html' },
  { id: 'S21', proto: 'prototypes/S21-interlocking-release-book/index.html', impl: 'deliverables/69-test/S21/index.html' },
  { id: 'S28', proto: 'prototypes/S28-jazz-intaglio-wall/index.html', impl: 'deliverables/69-test/S28/index.html' },
];

console.log('=== 排除"页面内容少"这个混淆因素 ===\n');
const rows = [];
for (const c of CASES) {
  const o = {};
  for (const [k, rel] of [['proto', c.proto], ['impl', c.impl]]) {
    await send('Page.navigate', { url: `http://127.0.0.1:8742/${rel}` });
    await new Promise((r) => setTimeout(r, 1600));
    o[k] = await evalJs(MEASURE);
  }
  rows.push({ id: c.id, ...o });
}

console.log('指标              原型                    复刻                    比值');
console.log('-'.repeat(90));
function line(label, a, b, digits = 2) {
  const r = typeof a === 'number' && typeof b === 'number' && a !== 0 ? (b / a).toFixed(digits) : '—';
  console.log(`${label.padEnd(16)}  ${String(a).padEnd(22)}  ${String(b).padEnd(22)}  ${r}`);
}
for (const r of rows) {
  console.log(`\n──── ${r.id} ────`);
  line('页高(docH)', r.proto.docH, r.impl.docH);
  line('屏数', r.proto.screens, r.impl.screens);
  line('总字符', r.proto.totalChars, r.impl.totalChars);
  line('每屏字符', r.proto.charsPerScreen, r.impl.charsPerScreen);
  line('正文字号', r.proto.bodySize, r.impl.bodySize);
  line('最大字号', r.proto.maxFs, r.impl.maxFs);
  line('H1 字号', r.proto.h1, r.impl.h1);
  line('最大/正文 比', r.proto.h1OverBody, r.impl.h1OverBody);
}

console.log('\n\n=== 关键判定 ===');
console.log('如果「每屏字符」接近但「最大/正文 比」差很多 → 是纯排版问题（H1 缩水）');
console.log('如果「每屏字符」差很多 → 是内容量/密度问题，字号偏小只是表象\n');
for (const r of rows) {
  const denRatio = r.impl.charsPerScreen / r.proto.charsPerScreen;
  const ratioRatio = r.impl.h1OverBody / r.proto.h1OverBody;
  console.log(`  ${r.id}  每屏字符比 ${denRatio.toFixed(2)}   最大/正文比 ${r.proto.h1OverBody}→${r.impl.h1OverBody} (${ratioRatio.toFixed(2)}×)`);
}

ws.close(); ch.kill(); server.close(); process.exit(0);
