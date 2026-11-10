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
await new Promise((r) => server.listen(8750, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9360', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome50', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9360/json/version');
let page = (await (await fetch('http://127.0.0.1:9360/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9360/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8750/prototypes/_selection/index.html' });
await new Promise((r) => setTimeout(r, 3500));

const out = await evalJs(`(function(){
  var ids = window.SCHEMES.map(function(s){return s.id;});
  return ids.map(function(id){
    var t = window.buildStylePrompt(id);
    var m = t.match(/6\\. 字号：([^\\n]+)/);
    return { id: id, line: m ? m[1] : null, len: t.length };
  });
})()`);

console.log('=== 提示词第 6 条（字号）实际输出 ===\n');
let has = 0, bad = [];
for (const r of out) {
  if (r.line) has++; else bad.push(r.id);
  console.log(`${r.id}  ${r.line || '（无）'}`);
}
console.log(`\n有第 6 条的案: ${has}/30   缺的: ${bad.join(' ') || '无'}`);

// 抽出提示词里说的 px，与 dna-clean 的 h1SizeAt1440 对比
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));
console.log('\n=== 提示词数字 vs h1SizeAt1440 是否正确 ===\n');
let wrong = 0;
for (const r of out) {
  if (!r.line) continue;
  // 注意：句中先出现「正文约 Npx」，再出现「约 Mpx」。要抓**最大标题**那个数，
  // 也就是最后一个「约 Npx」。第一版抓第一个，30/30 全判错 —— 脚本 bug，不是产品 bug。
  const all = [...r.line.matchAll(/约\s*([\d.]+)px/g)].map((m) => parseFloat(m[1]));
  const claimed = all.length ? all[all.length - 1] : NaN;
  const ratioClaimed = parseFloat((r.line.match(/正文的 ([\d.]+) 倍/) || [])[1] || '');
  const bodyClaimed = all.length > 1 ? all[0] : NaN;
  const actual = byId.get(r.id)?.h1SizeAt1440;
  const bodyActual = parseFloat(String(byId.get(r.id)?.bodySize || '').match(/([\d.]+)px/)?.[1] || '');
  const ok = Math.abs(claimed - actual) <= 1 && Math.abs(bodyClaimed - bodyActual) <= 1;
  const ratioOk = Math.abs(ratioClaimed - Math.round((actual / bodyActual) * 10) / 10) <= 0.1;
  if (!ok || !ratioOk) { wrong++; console.log(`  ✗ ${r.id} 提示词 h1=${claimed} body=${bodyClaimed} 倍=${ratioClaimed} | 数据 h1=${actual} body=${bodyActual}`); }
}
console.log(wrong === 0 ? '  ✓ 30/30 一致（±1px 容差）' : `  ${wrong} 案不一致`);

console.log('\n=== S19 完整第 6 条上下文 ===');
const s19 = await evalJs(`(function(){
  var t = window.buildStylePrompt('S19');
  var i = t.indexOf('6. 字号');
  return t.slice(Math.max(0,i-200), i+300);
})()`);
console.log(s19);

ws.close(); ch.kill(); server.close(); process.exit(0);
