#!/usr/bin/env node
/* EXEC-B：只查 5 个「我多出取值」的案（S14 S20 S23 S28 S30），把每个差异值的宿主
 * 元素连同它的几何尺寸、可见性、源码声明位置一起打出来。
 * 目的不是争谁对，而是让报告能回答一句：这条线**是否真的画在页面上**。 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8751; const CDP = 9362;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB4`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const CASES = [
  ['S14', 'zero-g-launch-sequence', [1.25]],
  ['S20', 'plotter-soundfield', [0.2]],
  ['S23', 'exposed-plaster-chronology-wall', [1.5]],
  ['S28', 'jazz-intaglio-wall', [1.2]],
  ['S30', 'skate-sticker-split', [1.6, 2]],
  ['S03', 'long-exposure-observatory', [1.5]],
  ['S25', 'spotcolor-contents-zine', [2]],
  ['S29', 'wire-bound-safety-manual', [0.4]],
];

for (const [sid, dir, widths] of CASES) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${sid}-${dir}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  const res = await evalJs(`(function(){
    var want = ${JSON.stringify(widths)};
    var out = [];
    document.querySelectorAll('*').forEach(function(el){
      var cs = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      var sw = parseFloat(cs.strokeWidth);
      var st = cs.stroke || '';
      var v = null, kind = null;
      if(sw>0 && st && st!=='none' && !/^rgba\\(.*,\\s*0\\)$/.test(st) && el instanceof SVGElement){
        v = Math.round(sw*100)/100; kind = 'stroke';
      }
      if(v===null){
        ['Top','Right','Bottom','Left'].forEach(function(k){
          var s2=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
          if(w>0 && s2 && s2!=='none' && s2!=='hidden'){ v=Math.round(w*100)/100; kind='border-'+k; }
        });
      }
      if(v===null){ return; }
      if(!want.some(function(w){ return Math.abs(w-v)<0.02; })) return;
      out.push({
        w: v, kind: kind,
        el: el.tagName.toLowerCase() + (el.getAttribute('class') ? '.' + String(el.getAttribute('class')).split(/\\s+/).slice(0,2).join('.') : ''),
        rect: Math.round(r.width) + 'x' + Math.round(r.height),
        inViewport: r.top < innerHeight && r.bottom > 0,
        opacity: cs.opacity, visibility: cs.visibility, display: cs.display,
        stroke: st, dash: cs.strokeDasharray,
        parentSVG: el.closest('svg') ? (el.closest('svg').getAttribute('class') || 'svg') : null,
        insideSymbol: !!el.closest('symbol'),
      });
    });
    return out;
  })()`);
  console.log(`\n=== ${sid} (${dir}) 查询 ${widths.join(',')} ===`);
  if (!res.length) { console.log('  （无命中）'); continue; }
  const seen = new Set();
  for (const x of res) {
    const k = x.w + '|' + x.el + '|' + x.rect;
    if (seen.has(k)) continue; seen.add(k);
    console.log(`  ${x.w}px ${x.kind.padEnd(12)} ${x.el.padEnd(34)} rect=${x.rect.padEnd(10)} ` +
      `inVP=${x.inViewport} op=${x.opacity} vis=${x.visibility} ` +
      `stroke=${x.stroke} dash=${x.dash} svg=${x.parentSVG} inSymbol=${x.insideSymbol}`);
  }
  console.log(`  命中元素数：${res.length}（去重后 ${seen.size} 种）`);
}
ws.close(); ch.kill(); server.close(); process.exit(0);
