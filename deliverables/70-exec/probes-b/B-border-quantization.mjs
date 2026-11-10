#!/usr/bin/env node
/* EXEC-B：Chrome 的 border-width 量化规则实测。
 *
 * 动机：S10 里作者写的是 `border-left: var(--column-rule) solid`，--column-rule: 1.25px，
 * 但 getComputedStyle 返回 **1px**；同一页面的 SVG `stroke-width: var(--column-rule)`
 * 却老老实实返回 1.25px。
 *
 * 如果这是真的，那么"声称值必须能在页面上找到（±0.05）"这条验收标准对 **border** 类线宽
 * 根本不成立 —— 不是抽取错了，是 Chrome 把 border-width 量化到整数设备像素了。
 * 这会把"假声称 12/30"里的一大半重新解释成"渲染量化"，必须量清楚才能下结论。
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const PORT = 8759; const CDP = 9374;
const VALUES = [0.2, 0.35, 0.4, 0.5, 0.6, 0.8, 1, 1.1, 1.2, 1.25, 1.4, 1.5, 1.6, 1.7,
  2, 2.4, 2.5, 3, 3.2, 3.5, 3.6, 4, 5, 5.5, 6, 7, 8, 9, 13, 14.5];
const rules = VALUES.map((v) => `.b${String(v).replace('.', '_')}{border-top:${v}px solid #000}`).join('\n');
const strokeRules = VALUES.map((v) => `.s${String(v).replace('.', '_')}{fill:none;stroke:#000;stroke-width:${v}}`).join('\n');
const divs = VALUES.map((v) => `<div class="b${String(v).replace('.', '_')}">x</div>`).join('');
const svgs = VALUES.map((v) => `<svg width="40" height="8"><line class="s${String(v).replace('.', '_')}" x1="0" y1="4" x2="40" y2="4"/></svg>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>${rules}\n${strokeRules}\ndiv{height:6px}</style>${divs}${svgs}`;

const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB7`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
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
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
await new Promise((r) => setTimeout(r, 900));

const res = await evalJs(`(function(){
  var out = [];
  ${JSON.stringify(VALUES)}.forEach(function(v){
    var k = String(v).replace('.', '_');
    var d = document.querySelector('.b' + k);
    var s = document.querySelector('.s' + k);
    out.push({ authored: v,
      borderComputed: d ? getComputedStyle(d).borderTopWidth : null,
      strokeComputed: s ? getComputedStyle(s).strokeWidth : null });
  });
  return out;
})()`);

console.log('作者写的   border 计算值    量化？   stroke 计算值   量化？');
let bQ = 0, sQ = 0;
const rows = [];
for (const r of res) {
  const b = parseFloat(r.borderComputed);
  const s = parseFloat(r.strokeComputed);
  const bChanged = Math.abs(b - r.authored) > 1e-9;
  const sChanged = Math.abs(s - r.authored) > 1e-9;
  if (bChanged) bQ++;
  if (sChanged) sQ++;
  rows.push({ ...r, b, s, bChanged, sChanged });
  console.log(
    String(r.authored).padEnd(9) +
    String(r.borderComputed).padEnd(16) + (bChanged ? '是' : '—').padEnd(8) +
    String(r.strokeComputed).padEnd(15) + (sChanged ? '是' : '—')
  );
}
console.log(`\nborder-width 被量化的档位：${bQ}/${VALUES.length}`);
console.log(`stroke-width 被量化的档位：${sQ}/${VALUES.length}`);
console.log('\n被量化的 border 明细：');
for (const r of rows.filter((x) => x.bChanged)) {
  console.log(`  ${r.authored}px  →  ${r.borderComputed}   (差 ${Math.round((r.b - r.authored) * 1000) / 1000})`);
}
const fs = await import('node:fs');
fs.writeFileSync(`${ROOT}/deliverables/70-exec/probes-b/border-quantization.json`, JSON.stringify(rows, null, 1));
console.log('\n已写 deliverables/70-exec/probes-b/border-quantization.json');
ws.close(); ch.kill(); server.close(); process.exit(0);
