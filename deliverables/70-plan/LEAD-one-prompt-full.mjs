#!/usr/bin/env node
// Lead v24：114 处负向句式到底在说什么？是否点名了具体禁项？
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
const server = createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8744, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9355', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome24', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9355/json/version');
let page = (await (await fetch('http://127.0.0.1:9355/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9355/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8744/prototypes/_selection/index.html' });
await new Promise((r) => setTimeout(r, 3500));

const full = await evalJs(`window.buildStylePrompt('S19')`);
console.log('=== S19 完整提示词（' + full.length + ' 字）===\n');
console.log(full);

console.log('\n\n=== 抽出所有负向句 ===\n');
const negWords = ['不要', '禁止', '反的是', '避免', '不得', '不用', '别', '不采用', '拒绝', '无'];
const sents = full.split(/(?<=[。；\n])/).map((s) => s.trim()).filter(Boolean);
let n = 0;
for (const s of sents) {
  if (negWords.some((w) => s.includes(w))) { n++; console.log(`  [${n}] ${s}`); }
}
console.log(`\n共 ${n} 句含负向词`);

console.log('\n=== 检查：负向句里是否点名了具体 hex / 字体名 / 数值 ===\n');
let named = 0;
for (const s of sents) {
  if (!negWords.some((w) => s.includes(w))) continue;
  const hex = s.match(/#[0-9A-Fa-f]{6}/g);
  const font = s.match(/(Inter|Roboto|Poppins|Montserrat|Open Sans|Lato|Nunito|Playfair|Merriweather|Lora|Raleway|Oswald|Source Han|Noto Sans SC|思源黑体|苹方|微软雅黑)/g);
  if (hex || font) { named++; console.log(`  ⚠ 点名: ${s.slice(0, 160)}`); }
}
console.log(`\n点名具体禁项的负向句: ${named} / ${n}`);

ws.close(); ch.kill(); server.close(); process.exit(0);
