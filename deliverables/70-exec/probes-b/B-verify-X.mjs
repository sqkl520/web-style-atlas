#!/usr/bin/env node
/* EXEC-B：核对归因为 X（"源码有、页面真的没用"）的四个值，逐个给出源码位置与
 * 渲染时的实际几何。X 是唯一真正该修的类别，必须一条条落实，不能靠推理。
 *
 * 待查：S26 的 8px / S27 的 1.8px 与 3.6px / S20 的 0.2px
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8761; const CDP = 9376;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB8`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const CASES = [
  ['S26', 'geometric-collision-columns', '.foot__grid', 'border-top: 8px'],
  ['S27', 'hand-painted-bill-dispatch', '.fault__spec li', 'border-left: calc(var(--mis)*2) = 3.6px'],
  ['S27', 'hand-painted-bill-dispatch', '.hb--fault', 'border-left: var(--mis) = 1.8px'],
  ['S20', 'plotter-soundfield', 'path[stroke-width="0.2"]', 'stroke-width 0.2'],
];
for (const [sid, dir, sel, what] of CASES) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${sid}-${dir}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  const out = await evalJs(`(function(){
    var sel = ${JSON.stringify(sel)};
    var els = document.querySelectorAll(sel);
    if(!els.length) return { n: 0 };
    var res = [];
    for(var i=0;i<Math.min(els.length,3);i++){
      var el = els[i], cs = getComputedStyle(el), r = el.getBoundingClientRect();
      res.push({ tag: el.tagName, cls: String(el.className.baseVal!==undefined?el.className.baseVal:el.className),
        rect: Math.round(r.width)+'x'+Math.round(r.height), top: Math.round(r.top),
        borderL: cs.borderLeftWidth+'/'+cs.borderLeftStyle+'/'+cs.borderLeftColor,
        borderT: cs.borderTopWidth+'/'+cs.borderTopStyle+'/'+cs.borderTopColor,
        strokeW: cs.strokeWidth, stroke: cs.stroke,
        display: cs.display, visibility: cs.visibility, opacity: cs.opacity });
    }
    return { n: els.length, res: res };
  })()`);
  console.log(`\n=== ${sid}  ${sel}  (${what}) ===`);
  console.log(`  命中 ${out.n} 个元素`);
  for (const x of (out.res || [])) {
    console.log(`   <${x.tag.toLowerCase()}${x.cls ? '.' + String(x.cls).split(/\s+/)[0] : ''}> rect=${x.rect} top=${x.top} display=${x.display}`);
    console.log(`      borderL=${x.borderL}  borderT=${x.borderT}  strokeW=${x.strokeW} stroke=${x.stroke}`);
  }
}
ws.close(); ch.kill(); server.close(); process.exit(0);
