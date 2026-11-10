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
await new Promise((r) => server.listen(8747, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9358', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome27', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9358/json/version');
let page = (await (await fetch('http://127.0.0.1:9358/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9358/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// 规划 Agent 判定的 11 个 MISSING 色，逐个查它们在 CSS 里的角色注释
const MISSING = {
  S06: ['#5A3A1C'],
  S14: ['#9A968C', '#3A3630'],
  S15: ['#4C5257'],
  S19: ['#5E5443'],
  S24: ['#6E8B7A', '#1B1136', '#2A1B50'],
  S25: ['#4A423A'],
  S30: ['#2B2B2B', '#4A4A4A'],
};

console.log('=== 规划 Agent 判定的 11 个 MISSING 色：它们是设计色还是派生色？===\n');
const out = {};
for (const [id, colors] of Object.entries(MISSING)) {
  // 找目录
  const dirs = await evalJs(`1`);
  // 用本地 fs 查
  const { readdirSync } = await import('node:fs');
  const d = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter((x) => x.isDirectory() && x.name.startsWith(id + '-')).map((x) => x.name)[0];
  if (!d) { console.log(`${id} 目录不存在`); continue; }
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  console.log(`\n──── ${id} (${d}) ────`);
  for (const c of colors) {
    const low = c.toLowerCase();
    const hits = css.split(/\r?\n/).map((l, i) => ({ l, n: i + 1 })).filter((x) => x.l.toLowerCase().includes(low));
    if (!hits.length) { console.log(`  ${c}  ⚠ CSS 里找不到（可能是计算值/继承）`); out[`${id}:${c}`] = 'NOT_IN_CSS'; continue; }
    // 找有注释的那行
    const withComment = hits.find((x) => /\/\*|\/\//.test(x.l));
    const varDecl = hits.find((x) => /^\s*--[\w-]+\s*:/.test(x.l));
    console.log(`  ${c}  出现 ${hits.length} 处`);
    if (varDecl) console.log(`      变量声明 L${varDecl.n}: ${varDecl.l.trim().slice(0, 130)}`);
    if (withComment && !varDecl) console.log(`      带注释 L${withComment.n}: ${withComment.l.trim().slice(0, 130)}`);
    if (!varDecl && !withComment) console.log(`      无注释 L${hits[0].n}: ${hits[0].l.trim().slice(0, 130)}`);
    // 判定：注释里是否提到对比度/AA/派生
    const allText = hits.map((x) => x.l).join(' ');
    const isContrast = /对比度|:[1１]\s*|\d\.\d+:1|AA|AAA|可读|可访问|无障碍/.test(allText);
    out[`${id}:${c}`] = isContrast ? 'CONTRAST-DERIVED' : 'POSSIBLY-DESIGN';
    if (isContrast) console.log(`      → 判据：提到对比度/可访问性 → 疑似为合规派生`);
  }
}

console.log('\n\n=== 汇总 ===\n');
const summary = {};
for (const [k, v] of Object.entries(out)) { summary[v] = (summary[v] || 0) + 1; }
for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v} 个`);
console.log();
for (const [k, v] of Object.entries(out)) if (v === 'POSSIBLY-DESIGN') console.log(`  ⚠ 可能是设计色: ${k}`);

ws.close(); ch.kill(); server.close(); process.exit(0);
