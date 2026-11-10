#!/usr/bin/env node
/* EXEC-B：S26 的 8px 为什么在 truth 探针里丢了？
 * 这个案是判断"我的 X 归因可不可信"的关键：若 8px 其实是渲染的，
 * 那 X 类里就不该有它，我整份归因都要重算。
 * 做法：直接对同一个页面跑 truth 探针的**原样代码**，逐步打印 .foot__grid 的判定路径。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8763; const CDP = 9378;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB9`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/S26-geometric-collision-columns/index.html` });
await new Promise((r) => setTimeout(r, 1500));

const out = await evalJs(`(function(){
  var SOLID = {solid:1,dashed:1,dotted:1,double:1,groove:1,ridge:1,inset:1,outset:1};
  var rows = [];
  var count8 = 0;
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var st = cs['border'+k+'Style'], w = parseFloat(cs['border'+k+'Width']);
      if(w===8 && st && SOLID[st]){
        rows.push({ cls: String(el.className||''), tag: el.tagName, side: k, w: w, st: st,
          display: cs.display, vis: cs.visibility, op: cs.opacity,
          rect: Math.round(r.width)+'x'+Math.round(r.height),
          zeroSkip: (r.width===0 && r.height===0),
          dispSkip: cs.display==='none', visSkip: cs.visibility==='hidden', opSkip: cs.opacity==='0',
          total: document.querySelectorAll('*').length });
        count8++;
      }
    });
  });
  return { count8: count8, rows: rows, total: document.querySelectorAll('*').length };
})()`);
console.log('=== S26 页面上 border-width===8px 的元素 ===');
console.log('命中共', out.count8, '个；页面元素总数', out.total);
for (const r of out.rows) {
  console.log(`  <${r.tag.toLowerCase()}${r.cls ? '.' + String(r.cls).split(/\s+/)[0] : ''}> ${r.side} w=${r.w}/${r.st} rect=${r.rect}`);
  console.log(`      display=${r.display} visibility=${r.vis} opacity=${r.op} ` +
    `zeroSkip=${r.zeroSkip} dispSkip=${r.dispSkip} visSkip=${r.visSkip} opSkip=${r.opSkip}`);
}
ws.close(); ch.kill(); server.close(); process.exit(0);
