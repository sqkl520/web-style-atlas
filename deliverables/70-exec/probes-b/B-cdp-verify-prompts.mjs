#!/usr/bin/env node
/* EXEC-B：在**真实的选型台页面**里调 window.buildStylePrompt(id)，30 案全跑一遍。
 *
 * 为什么不能只信 Node 里的 vm 沙箱（B-dump-prompts.mjs）：
 *   沙箱是我伪造的 window，prompt-copy.js 里有几处会在真实 DOM 上走不同分支
 *   （mountPromptButton / copyPrompt / 手动复制兜底）。buildPrompt 本身应该是纯字符串拼接，
 *   但"应该是"不等于"是" —— 任务书要求用 CDP 打开选型台实测，就是为了排除这一类假设。
 *
 * 检查项：无 undefined / 无 var(-- / 无 NaN / 长度在合理区间 / 30 条互不相同。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8767; const CDP = 9382;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.avif': 'image/avif', '.webp': 'image/webp', '.json': 'application/json',
};
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB11`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  return r.result?.result?.value;
}
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/_selection/index.html` });
await new Promise((r) => setTimeout(r, 2500));

const has = await evalJs(`(function(){
  return { hasBuild: typeof window.buildStylePrompt === 'function',
           hasPrompts: !!window.STYLE_PROMPTS,
           hasSchemes: !!window.SCHEMES,
           ids: window.STYLE_PROMPTS && window.STYLE_PROMPTS.schemes
                ? window.STYLE_PROMPTS.schemes.map(function(s){return s.id;}) : [] };
})()`);
console.log('选型台加载：buildStylePrompt=' + has.hasBuild + '  STYLE_PROMPTS=' + has.hasPrompts +
  '  SCHEMES=' + has.hasSchemes + '  方案数=' + (has.ids || []).length);
if (!has.hasBuild) { console.error('buildStylePrompt 不存在，无法验证'); ws.close(); ch.kill(); server.close(); process.exit(2); }

const res = await evalJs(`(function(){
  var out = {};
  (window.STYLE_PROMPTS.schemes || []).forEach(function(s){
    try { out[s.id] = { ok: true, text: String(window.buildStylePrompt(s.id) || "") }; }
    catch(e) { out[s.id] = { ok: false, err: String(e && e.message || e), text: "" }; }
  });
  return out;
})()`);

const ids = Object.keys(res).sort();
let bad = 0;
const lens = [];
console.log('\n案   长度   undefined  var(--  NaN   空');
for (const sid of ids) {
  const t = res[sid].text;
  const flags = {
    undef: /undefined/.test(t),
    varcss: /var\(--/.test(t),
    nan: /NaN/.test(t),
    empty: !t.length,
  };
  const anyBad = !res[sid].ok || flags.undef || flags.varcss || flags.nan || flags.empty;
  if (anyBad) bad++;
  lens.push([...t].length);
  console.log(`${sid}  ${String([...t].length).padStart(4)}  ${flags.undef ? '✗' : '·'}        ${flags.varcss ? '✗' : '·'}      ${flags.nan ? '✗' : '·'}    ${flags.empty ? '✗' : '·'}` +
    (res[sid].ok ? '' : '  ERROR: ' + res[sid].err));
}
const sorted = [...lens].sort((a, b) => a - b);
const uniq = new Set(ids.map((i) => res[i].text));
console.log(`\n构建失败/异常：${bad}/30`);
console.log(`长度：min ${sorted[0]} / 中位 ${sorted[Math.floor(sorted.length / 2)]} / max ${sorted[sorted.length - 1]}`);
console.log(`互不相同：${uniq.size}/30`);
writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/prompts-cdp.json'),
  JSON.stringify(Object.fromEntries(ids.map((i) => [i, res[i].text])), null, 1));
console.log('\n已写 prompts-cdp.json');
ws.close(); ch.kill(); server.close();
process.exit(bad ? 1 : 0);
