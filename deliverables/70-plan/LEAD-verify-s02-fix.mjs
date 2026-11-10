// 验证 S02 修色后的真实像素：主导背景色应当是 #0B0B0F（palette 声称值）
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8751, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9361', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chromeS02', '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9361/json/version');
let page = (await (await fetch('http://127.0.0.1:9361/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9361/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

function decodePng(buf) {
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(w * h * channels);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 0xff;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { w, h, channels, data: out };
}

console.log('=== S02 修色后的真实像素前 6 色 ===\n');
await send('Page.navigate', { url: 'http://127.0.0.1:8751/prototypes/S02-gilded-symmetry-salon/index.html' });
await new Promise((r) => setTimeout(r, 1800));
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const img = decodePng(Buffer.from(shot.result.data, 'base64'));
const hist = new Map();
const total = img.w * img.h;
for (let i = 0; i < total; i++) {
  const p = i * img.channels;
  const hex = '#' + [img.data[p], img.data[p + 1], img.data[p + 2]].map((x) => x.toString(16).padStart(2, '0')).join('');
  hist.set(hex, (hist.get(hex) || 0) + 1);
}
const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
for (const [hex, n] of sorted) {
  const pct = (n / total * 100).toFixed(2);
  const flag = hex === '#0b0b0f' ? '  ← palette 声称的 --card ✓' : (hex === '#0a0a0d' ? '  ← 旧的硬编码色（应当消失）' : '');
  console.log(`  ${hex}  ${String(pct).padStart(6)}%${flag}`);
}

// 也验证 computed style
await send('Page.navigate', { url: 'http://127.0.0.1:8751/prototypes/S02-gilded-symmetry-salon/index.html' });
await new Promise((r) => setTimeout(r, 1200));
const cs = await evalJs(`(function(){
  var out = {};
  var sheet = document.querySelector('.sheet');
  var foot = document.querySelector('footer');
  if(sheet) out.sheet = getComputedStyle(sheet).backgroundColor;
  if(foot) out.footer = getComputedStyle(foot).backgroundColor;
  out.cardVar = getComputedStyle(document.documentElement).getPropertyValue('--card').trim();
  return out;
})()`);
console.log('\n=== computed style ===');
console.log('  .sheet 背景:     ' + cs.sheet);
console.log('  footer 背景:     ' + cs.footer);
console.log('  --card 变量:     ' + cs.cardVar);

ws.close(); ch.kill(); server.close(); process.exit(0);
