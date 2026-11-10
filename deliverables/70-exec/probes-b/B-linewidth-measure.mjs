#!/usr/bin/env node
/* EXEC-B 独立复核：30 案线宽实测（真 Chrome，CDP，1440x900）
 *
 * 判据（刻意比 Lead 的探针更严，因为坑就在"看起来有线其实没有"）：
 *   border : borderStyle 必须是 solid/dashed/dotted/double/groove/ridge/inset/outset 之一
 *            —— 'none'/'hidden' 一律不算。`border:none` 只重置 style，width 保留初值，
 *            所以只看 width>0 会把每个这样的元素都数一遍（Lead 报告里点名的第二类坑）。
 *   outline: outlineStyle !== 'none' 才算。Chrome 对几乎所有元素返回 outline-width:3px
 *            + outline-style:none（Lead 点名的第一类坑）。
 *   SVG    : 元素必须是 SVG 几何元素（path/line/rect/circle/...），stroke-width>0，
 *            且计算后 stroke 不是 none / 全透明。stroke 可继承自 <g>/<svg>，所以读 computed。
 *
 * 输出两套数：
 *   1) viewport 计数（出现次数）—— 用于"主要线宽（≥10 次）"这条验收
 *   2) 源码声明值（CSS 文本 + HTML style/stroke-width 属性）—— 用于判断"设计分级"该抽什么
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8745;
const CDP = 9356;
const OUT = 'deliverables/70-exec/probes-b/linewidth-b-30.json';
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

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));
if (!CHROME) { console.error('no chrome'); process.exit(2); }
const ch = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB`,
  '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1',
  '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

async function waitPort(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('cdp timeout');
}
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
const send = (method, params = {}) => {
  const i = ++id;
  return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
};
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  const ex = r.result?.exceptionDetails;
  if (ex) throw new Error(JSON.stringify(ex).slice(0, 400));
  return r.result?.result?.value;
}
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

/* 在页面里跑的计数函数。**返回宽 -> 计数 + 宿主样本**，宿主样本用于人工判定
 * "这是设计决策还是渲染假象"。 */
const MEASURE = `(function(){
  var counts = {}, hosts = {};
  var SOLID = {solid:1,dashed:1,dotted:1,double:1,groove:1,ridge:1,inset:1,outset:1};
  var SVGGEOM = {path:1,line:1,rect:1,circle:1,ellipse:1,polyline:1,polygon:1};
  function add(v, host){
    var n = Math.round(parseFloat(v)*100)/100;
    if(!n || n<=0) return;
    counts[n]=(counts[n]||0)+1;
    if(!hosts[n]) hosts[n]=[];
    if(hosts[n].length<4) hosts[n].push(host);
  }
  function desc(el){
    var t = el.tagName.toLowerCase();
    var c = (el.getAttribute && el.getAttribute('class')) || '';
    c = String(c).split(/\\s+/).filter(Boolean).slice(0,2).join('.');
    return t + (c ? '.'+c : '');
  }
  function scan(el, pseudo){
    var cs = getComputedStyle(el, pseudo || null);
    if(!cs) return;
    if(!pseudo){
      if(cs.display==='none' || cs.visibility==='hidden') return;
      var r = el.getBoundingClientRect();
      if(r.width===0 && r.height===0) return;
      if(cs.opacity==='0') return;
    } else if(cs.content==='none' || cs.content==='normal') return;
    var tag = desc(el) + (pseudo||'');
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var st = cs['border'+k+'Style'];
      var w = parseFloat(cs['border'+k+'Width']);
      if(w>0 && st && SOLID[st]) add(w, tag+':border');
    });
    var os = cs.outlineStyle, ow = parseFloat(cs.outlineWidth);
    if(ow>0 && os && os!=='none') add(ow, tag+':outline');
  }
  document.querySelectorAll('*').forEach(function(el){
    scan(el, null);
    scan(el, '::before');
    scan(el, '::after');
    if(el instanceof SVGElement && SVGGEOM[el.tagName.toLowerCase()]){
      var sw = parseFloat(getComputedStyle(el).strokeWidth);
      var st = getComputedStyle(el).stroke;
      var vis = st && st!=='none' && !/rgba\\(0,\\s*0,\\s*0,\\s*0\\)/.test(st) && st!=='transparent';
      if(sw>0 && vis) add(sw, desc(el)+':stroke');
    }
  });
  return { counts: counts, hosts: hosts };
})()`;

const results = {};
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  const m = await evalJs(MEASURE);
  // 悬停态/焦点态不计：那是交互后才有，提示词讲的是静态视觉
  const counts = m.counts || {};
  const actual = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const major = actual.filter((x) => counts[x] >= 10);
  results[sid] = { dir: d, counts, major, actual, hosts: m.hosts || {} };
  console.log(
    sid + '  ' + actual.map((x) => x + '×' + counts[x]).join(' ') +
    '   |major≥10: ' + (major.join(',') || '—')
  );
}

/* ── 源码侧：CSS 文本 + HTML 里的 stroke-width 属性 ─────────────────────
 * 目的：分辨"设计分级"和"渲染实测"。若一个值在源码里字面写着，它就是设计决策；
 * 若源码里根本没有，只出现在 computed 里，那它是继承/缩放/默认值的产物。 */
const CSSRE = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
for (const [sid, v] of Object.entries(results)) {
  const cssPath = join(ROOT, 'prototypes', v.dir, 'style.css');
  const htmlPath = join(ROOT, 'prototypes', v.dir, 'index.html');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  const authored = new Set();
  let mm;
  CSSRE.lastIndex = 0;
  while ((mm = CSSRE.exec(css))) {
    const vals = mm[1].match(/([0-9.]+)px/g) || [];
    for (const q of vals) { const n = parseFloat(q); if (n > 0) authored.add(Math.round(n * 100) / 100); }
    if (/stroke-width/i.test(mm[0])) {
      const bare = mm[1].match(/^\s*([0-9.]+)\s*$/);
      if (bare) { const n = parseFloat(bare[1]); if (n > 0) authored.add(Math.round(n * 100) / 100); }
    }
  }
  /* HTML 里的 stroke-width="N" / style="stroke-width:N" */
  for (const q of html.matchAll(/stroke-width\s*[=:]\s*["']?\s*([0-9.]+)/g)) {
    const n = parseFloat(q[1]); if (n > 0) authored.add(Math.round(n * 100) / 100);
  }
  v.authored = [...authored].sort((a, b) => a - b);
  v.inCssNotRendered = v.authored.filter((x) => !v.actual.some((a) => Math.abs(a - x) < 0.02));
  v.renderedNotInCss = v.actual.filter((x) => !v.authored.some((a) => Math.abs(a - x) < 0.02));
  v.majorNotInCss = v.major.filter((x) => !v.authored.some((a) => Math.abs(a - x) < 0.02));
}

const dnaRaw = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const byId = new Map((Array.isArray(dnaRaw) ? dnaRaw : Object.values(dnaRaw)).map((e) => [e.id, e]));

console.log('\n=== 声称 vs 实际（Lead 口径复算）===');
let over = 0, miss = 0;
for (const [sid, v] of Object.entries(results)) {
  const claimed = String(byId.get(sid)?.lineWidths || '').match(/[\d.]+/g)?.map(Number) || [];
  v.claimed = claimed;
  v.notClaimed = v.actual.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05));
  v.claimedMissing = claimed.filter((c) => !v.actual.some((x) => Math.abs(x - c) <= 0.05));
  v.majorNotClaimed = v.major.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05));
  if (v.notClaimed.length) over++;
  if (v.claimedMissing.length) miss++;
  console.log(
    sid + '  声称[' + claimed.join(',') + ']  实际[' + v.actual.map((x) => x + '×' + v.counts[x]).join(' ') + ']' +
    '  ' + (v.notClaimed.length ? '超出:' + v.notClaimed.join(',') : '✔') +
    (v.claimedMissing.length ? '  声称未用:' + v.claimedMissing.join(',') : '')
  );
}
console.log(`\n用到「声称之外」的线宽: ${over}/30`);
console.log(`声称了但页面没用到:     ${miss}/30`);
const allVals = new Set();
for (const v of Object.values(results)) v.actual.forEach((x) => allVals.add(x));
console.log(`全库不同线宽值（共 ${allVals.size} 种）: ` +
  [...allVals].sort((a, b) => a - b).join(' '));

console.log('\n=== 源码里写着、但 1440x900 渲染里没出现（说明分级来自源码，渲染只体现一部分）===');
for (const [sid, v] of Object.entries(results)) {
  if (v.inCssNotRendered.length) console.log(`  ${sid}  ${v.inCssNotRendered.join(',')}`);
}
console.log('\n=== 渲染里出现、但源码里没有字面值（继承/默认/缩放产物）===');
for (const [sid, v] of Object.entries(results)) {
  if (v.renderedNotInCss.length) console.log(`  ${sid}  ${v.renderedNotInCss.join(',')}`);
}

const fs = await import('node:fs');
fs.writeFileSync(join(ROOT, OUT), JSON.stringify(results, null, 1));
console.log('\n已写 ' + OUT);

ws.close(); ch.kill(); server.close();
process.exit(0);
