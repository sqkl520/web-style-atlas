#!/usr/bin/env node
/* EXEC-B：定位 S10 / S27 的 1px 到底是哪条规则给的。
 * 方法：用 CDP 的 CSS domain 取"匹配到的规则"，逐元素打印。
 * 这一步是为了回答一个具体问题：`th:border 1px` 是作者写的，还是浏览器 UA 样式表给的？
 * 结论会直接影响"1px 该不该出现在设计分级里"。 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8757; const CDP = 9372;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB6`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('CSS.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

for (const dir of ['S10-grid-versus-sheet', 'S27-hand-painted-bill-dispatch', 'S03-long-exposure-observatory']) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${dir}/index.html` });
  await new Promise((r) => setTimeout(r, 1500));
  const doc = await send('DOM.getDocument', { depth: -1 });
  const q = await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: 'th, td, p, b, line' });
  const ids = (q.result?.nodeIds || []).slice(0, 14);
  console.log(`\n=== ${dir} ===`);
  for (const nid of ids) {
    const desc = await evalJs(`(function(){
      var el = document.querySelectorAll('th, td, p, b, line')[${ids.indexOf(nid)}];
      if(!el) return null;
      var cs = getComputedStyle(el);
      return { tag: el.tagName, cls: el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className||''),
        bt: cs.borderTopWidth, bs: cs.borderTopStyle, bl: cs.borderLeftWidth, bls: cs.borderLeftStyle, sw: cs.strokeWidth };
    })()`);
    if (!desc) continue;
    // 找匹配规则
    const m = await send('CSS.getMatchedStylesForNode', { nodeId: nid });
    const matched = (m.result?.matchedCSSRules || []).map((r) => ({
      origin: r.rule.origin,
      sel: r.rule.selectorList?.text,
      props: (r.rule.style?.cssProperties || []).filter((p) => /^border|stroke-width/.test(p.name)).map((p) => `${p.name}: ${p.value}`),
    })).filter((r) => r.props.length);
    console.log(`  <${desc.tag.toLowerCase()}${desc.cls ? '.' + String(desc.cls).split(/\s+/)[0] : ''}> ` +
      `border-top=${desc.bt}/${desc.bs} border-left=${desc.bl}/${desc.bls} stroke=${desc.sw}`);
    for (const r of matched.slice(0, 4)) console.log(`      [${r.origin}] ${r.sel || ''}  →  ${r.props.join(' | ')}`);
  }
}
ws.close(); ch.kill(); server.close(); process.exit(0);
