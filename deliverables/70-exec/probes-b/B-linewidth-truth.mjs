#!/usr/bin/env node
/* EXEC-B 权威探针：30 案线宽实测（真 Chrome / CDP / 1440x900 / dpr=1）
 *
 * ── 为什么需要第三个探针 ─────────────────────────────────────────────
 * 前两个探针各有一个**方向相反**的缺陷，都已实测定位：
 *
 *   ① Lead 的探针（LEAD-linewidth-fixed.mjs）：
 *      `if (r.width===0 || r.height===0) return;` 是 **OR**。
 *      一条水平 <line x1=0 y1=1 x2=108 y2=1> 的 rect 高度就是 0，它是**真实画出来**的
 *      1px 分隔线（S25 的 .leader 装订导引线、S29 的 diag 斜线、S03 的刻度线），
 *      却被这一条整根丢掉。
 *   ② 我第一版探针：不排除 <symbol>/<defs> 里的**模板几何**。
 *      S14/S23/S28/S30 的 sprite <svg class="sprite"> 里塞着 <symbol id="g-valve">，
 *      里面 <g stroke-width="1.25"> 的 rect 是 0x0、不在视口内、只是**待引用的定义**。
 *      它们不是页面上的线，却拿到了计数。
 *
 * 本探针同时修掉两处，判据如下（每条都可在报告里复核）：
 *   · border  ：borderStyle ∈ {solid,dashed,dotted,double,groove,ridge,inset,outset}
 *               （'none'/'hidden' 不算 —— `border:none` 只重置 style，width 保留初值）
 *   · outline ：outlineStyle !== 'none'（Chrome 对几乎所有元素返回 outline-width:3px
 *               + outline-style:none，只看 width 会虚报 17 案）
 *   · stroke  ：宿主必须是 SVG 几何元素，stroke-width>0，计算后 stroke 不透明，
 *               且**不在模板容器内**（<symbol>/<defs>/<clipPath>/<mask>/<pattern>/<marker>）
 *   · 尺寸    ：只有 width===0 && height===0 **同时**成立才跳过（水平线/竖线的单维为 0
 *               是正常的、真实的）
 *   · 模板    ：最近的 <svg> 祖先若 rect 为 0x0 且元素在 <symbol>/<defs> 内 → 不算
 *
 * 同时输出三样东西供"该抽什么"的决策使用：
 *   counts   —— 每个线宽值在页面上出现多少次（用于「≥10 次算主要线宽」的验收）
 *   authored —— 源码里字面写着的值（CSS 声明 + HTML stroke-width 属性 + inline style）
 *   sources  —— 每个值的来源分类：css-border / css-outline / css-stroke / html-attr
 *               / inline-style，用来回答"3.6px 到底是设计值还是渲染假象"
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8753;
const CDP = 9364;
const OUT = 'deliverables/70-exec/probes-b/linewidth-truth-30.json';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.avif': 'image/avif', '.webp': 'image/webp', '.json': 'application/json',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
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
if (!CHROME) { console.error('chrome not found'); process.exit(2); }
const ch = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB5`,
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
  if (ex) throw new Error(JSON.stringify(ex).slice(0, 500));
  return r.result?.result?.value;
}
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const MEASURE = `(function(){
  var SOLID = {solid:1,dashed:1,dotted:1,double:1,groove:1,ridge:1,inset:1,outset:1};
  var GEOM = {path:1,line:1,rect:1,circle:1,ellipse:1,polyline:1,polygon:1};
  var TEMPLATE_HOST = {symbol:1,defs:1,clippath:1,mask:1,pattern:1,marker:1};
  var counts = {}, hosts = {};
  function put(v, host){
    var n = Math.round(parseFloat(v)*100)/100;
    if(!n || n<=0) return;
    counts[n]=(counts[n]||0)+1;
    if(!hosts[n]) hosts[n]=[];
    if(hosts[n].length<5) hosts[n].push(host);
  }
  function desc(el){
    var t = el.tagName.toLowerCase();
    var c = (el.getAttribute && el.getAttribute('class')) || '';
    c = String(c).split(/\\s+/).filter(Boolean).slice(0,2).join('.');
    return t + (c ? '.'+c : '');
  }
  /* ① 模板几何的可见性判定 —— 这是整个探针最容易搞错的地方，两版探针都栽在这里。
   *
   *   · <symbol>/<defs> 里的几何**不直接渲染**，它的 rect 是 0x0、不在视口内。
   *   · 但被 <use href="#id"> 引用后，**实例是渲染的**（跟着 use 的 rect 走）。
   *   · 实例在 shadow tree 里，querySelectorAll 选不到 —— 所以不能靠"给 symbol 内的
   *     path 量 rect"来判断，那样永远得到 0x0，于是把真实的蚀刻线（S19 的 0.4/0.8px，
   *     26 个 use 引用）判成"没画"，这是"假声称"虚高的直接来源。
   *
   * 正确做法：**以 <use> 元素为宿主**。use 可见（rect 有面积）→ 顺着 href 找到 symbol，
   * 把 symbol 内几何元素的 computed stroke-width 记到这条 use 上。这样
   *   · 被引用的 symbol 会计数（S19 的 0.4/0.8 回来了）
   *   · 从未被引用的 symbol 不计数（真正的备用图标库）
   *   · 计数单位是"实例个数"，与视觉上看到几条线一致
   */
  var idIndex = {};
  document.querySelectorAll('[id]').forEach(function(s){ idIndex[s.getAttribute('id')] = s; });
  function collectUse(el){
    var r = el.getBoundingClientRect();
    if(!(r.width > 0 || r.height > 0)) return;        // 单维为 0 也算画了（细线）
    var h = (el.getAttribute('href') || el.getAttribute('xlink:href') || '').replace(/^#/, '');
    var tgt = h && idIndex[h];
    if(!tgt) return;
    /* <use> 可以引用**任何有 id 的元素**，不只是 <symbol>：
     * S09 的 path#stroke-outer（stroke-width="3.5"）直接放在 defs 里，
     * 被 12 个 use href="#stroke-outer" 引用。只认 symbol 会把它整条漏掉。 */
    if(GEOM[String(tgt.tagName).toLowerCase()]){
      var gs0 = getComputedStyle(tgt);
      var sw0 = parseFloat(gs0.strokeWidth);
      if(sw0 > 0 && strokeOpaque(gs0)) put(sw0, 'use#' + h + '>' + desc(tgt) + ':stroke');
      return;
    }
    tgt.querySelectorAll('path,line,rect,circle,ellipse,polyline,polygon').forEach(function(g){
      var gs = getComputedStyle(g);
      var sw = parseFloat(gs.strokeWidth);
      if(sw > 0 && strokeOpaque(gs)) put(sw, 'use#' + h + '>' + desc(g) + ':stroke');
    });
  }
  function inTemplate(el){
    var n = el;
    while(n && n.tagName){
      if(TEMPLATE_HOST[String(n.tagName).toLowerCase()]) return true;
      n = n.parentElement;
    }
    return false;
  }
  function strokeOpaque(cs){
    var st = cs.stroke;
    if(!st || st==='none' || st==='transparent') return false;
    var m = st.match(/^rgba?\\(([^)]+)\\)$/);
    if(m){
      var parts = m[1].split(/[,\\s\\/]+/).filter(Boolean);
      if(parts.length>=4 && parseFloat(parts[3])===0) return false;
    }
    return true;
  }
  function scanBox(el, cs, tag){
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var st = cs['border'+k+'Style'], w = parseFloat(cs['border'+k+'Width']);
      if(w>0 && st && SOLID[st]) put(w, tag+':border');
    });
    var os = cs.outlineStyle, ow = parseFloat(cs.outlineWidth);
    if(ow>0 && os && os!=='none') put(ow, tag+':outline');
  }
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    if(cs.display==='none' || cs.visibility==='hidden') return;
    /* **不要**按 opacity===0 排除元素。
     * 实测反例：S26 的 .foot__grid 是 border-top:8px solid，但它是滚动揭示元素，
     * 首屏 computed opacity 就是 0。按 opacity 排除会把它整条抹掉，
     * 于是 8px 被误判成"声称了但页面没用"。它滚到视口就会显示，是真实设计分级。
     * 判"有没有画"只看 display/visibility（这两者才决定盒子是否参与渲染）。 */
    /* <use> 必须最先处理：它自己常常是 0x0（尺寸由外层 svg 的 viewBox 决定），
     * 会被下面的零尺寸判据挡掉。它的可见性由 collectUse 内部按 rect 自己判。 */
    if(el instanceof SVGElement && String(el.tagName).toLowerCase() === 'use'){ collectUse(el); return; }
    // 零尺寸只在**两维都为 0**时才算不可见：水平线的 height:0 是常态，不是"没画"
    if(r.width===0 && r.height===0){
      return;
    }
    scanBox(el, cs, desc(el));
    ['::before','::after'].forEach(function(ps){
      var pc = getComputedStyle(el, ps);
      if(!pc || pc.content==='none' || pc.content==='normal') return;
      scanBox(el, pc, desc(el)+ps);
    });
    if(el instanceof SVGElement && GEOM[String(el.tagName).toLowerCase()]){
      if(!inTemplate(el)){
        var sw = parseFloat(cs.strokeWidth);
        if(sw>0 && strokeOpaque(cs)) put(sw, desc(el)+':stroke');
      }
    }
  });
  return { counts: counts, hosts: hosts };
})()`;

const results = {};
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1500));
  const m = await evalJs(MEASURE);
  const counts = m.counts || {};
  const actual = Object.keys(counts).map(Number).sort((a, b) => a - b);
  results[sid] = {
    dir: d, counts, actual,
    major: actual.filter((x) => counts[x] >= 10),
    hosts: m.hosts || {},
  };
  console.log(sid + '  ' + actual.map((x) => x + '×' + counts[x]).join(' ') +
    '   |≥10: ' + (results[sid].major.join(',') || '—'));
}

/* ── 源码侧：这个值是不是"设计决策" ─────────────────────────────────────
 * 三类来源分开记，因为它们的可信度不同：
 *   css-decl   : style.css 里的 border/outline/stroke-width 声明（最可信）
 *   html-attr  : index.html 的 stroke-width="N" 属性（同样可信）
 *   css-var    : 经由 var() 间接给出（S27 的 --mis:1.8px）
 * 判据：源码里有字面值 ⇒ 设计决策；只在 computed 里有 ⇒ 继承/默认/缩放产物。
 */
for (const [sid, v] of Object.entries(results)) {
  const cssPath = join(ROOT, 'prototypes', v.dir, 'style.css');
  const htmlPath = join(ROOT, 'prototypes', v.dir, 'index.html');
  const rawCss = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const authored = {};
  const bump = (k, src) => { authored[k] = authored[k] || { sources: [], count: 0 }; authored[k].count++; if (authored[k].sources.indexOf(src) < 0) authored[k].sources.push(src); };

  // CSS 声明
  const RE_CSS = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/gi;
  let mm;
  while ((mm = RE_CSS.exec(css))) {
    const decl = mm[1];
    const prop = mm[0].split(':')[0].toLowerCase().trim();
    const src = /outline/.test(prop) ? 'css-outline' : (/stroke/.test(prop) ? 'css-stroke' : 'css-border');
    for (const q of decl.match(/[0-9.]+px/g) || []) {
      const n = Math.round(parseFloat(q) * 100) / 100;
      if (n > 0) bump(n, src);
    }
    if (/stroke-width/i.test(prop)) {
      const bare = decl.match(/^\s*([0-9.]+)\s*$/);
      if (bare) { const n = Math.round(parseFloat(bare[1]) * 100) / 100; if (n > 0) bump(n, 'css-stroke-bare'); }
    }
  }
  // HTML 属性 + inline style
  for (const q of html.matchAll(/stroke-width\s*=\s*["']?\s*([0-9.]+)/g)) {
    const n = Math.round(parseFloat(q[1]) * 100) / 100;
    if (n > 0) bump(n, 'html-attr');
  }
  for (const q of html.matchAll(/style\s*=\s*"[^"]*(?:border|stroke)[^"]*"/g)) {
    for (const z of q[0].match(/[0-9.]+px/g) || []) {
      const n = Math.round(parseFloat(z) * 100) / 100;
      if (n > 0 && /border|stroke/.test(q[0])) bump(n, 'inline-style');
    }
  }
  v.authored = Object.keys(authored).map(Number).sort((a, b) => a - b);
  v.authoredDetail = authored;
  v.authoredNotRendered = v.authored.filter((x) => !v.actual.some((a) => Math.abs(a - x) < 0.02));
  v.renderedNotAuthored = v.actual.filter((x) => !v.authored.some((a) => Math.abs(a - x) < 0.02));
}

const dnaClean = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const byId = new Map((Array.isArray(dnaClean) ? dnaClean : Object.values(dnaClean)).map((e) => [e.id, e]));

console.log('\n\n=== 声称 vs 实测（权威口径）===');
let over = 0, miss = 0, majorMiss = 0;
for (const [sid, v] of Object.entries(results)) {
  const claimed = String(byId.get(sid)?.lineWidths || '').match(/[\d.]+/g)?.map(Number) || [];
  v.claimed = claimed;
  v.notClaimed = v.actual.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05));
  v.claimedMissing = claimed.filter((c) => !v.actual.some((x) => Math.abs(x - c) <= 0.05));
  v.majorNotClaimed = v.major.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05));
  if (v.notClaimed.length) over++;
  if (v.claimedMissing.length) miss++;
  if (v.majorNotClaimed.length) majorMiss++;
  console.log(
    sid + '  声称[' + claimed.join(',') + ']  实测[' + v.actual.map((x) => x + '×' + v.counts[x]).join(' ') + ']' +
    '  ' + (v.notClaimed.length ? '超:' + v.notClaimed.join(',') : '✔') +
    (v.claimedMissing.length ? '  未用:' + v.claimedMissing.join(',') : '')
  );
}
console.log(`\n用到「声称之外」的线宽: ${over}/30`);
console.log(`声称了但页面没用到:      ${miss}/30`);
console.log(`主要线宽(≥10次)未被声称: ${majorMiss}/30`);
const allVals = new Set();
for (const v of Object.values(results)) v.actual.forEach((x) => allVals.add(x));
console.log(`全库实测线宽值（共 ${allVals.size} 种）: ${[...allVals].sort((a, b) => a - b).join(' ')}`);
const authoredAll = new Set();
for (const v of Object.values(results)) v.authored.forEach((x) => authoredAll.add(x));
console.log(`全库源码声明线宽值（共 ${authoredAll.size} 种）: ${[...authoredAll].sort((a, b) => a - b).join(' ')}`);

console.log('\n=== 可疑值溯源（Lead 点名的 1.1 / 3.2 / 3.6 / 1.25） ===');
for (const target of [1.1, 3.2, 3.6, 1.25]) {
  const hits = Object.entries(results).filter(([, v]) => v.authored.some((a) => Math.abs(a - target) < 0.02));
  if (!hits.length) { console.log(`  ${target}px  源码里没有 —— 纯渲染产物`); continue; }
  for (const [sid, v] of hits) {
    console.log(`  ${target}px  ${sid}  来源: ${v.authoredDetail[target].sources.join('/')}  ` +
      `渲染${v.actual.some((a) => Math.abs(a - target) < 0.02) ? '出现' : '未出现'}  ` +
      `命中 ${v.counts[target] || 0} 次`);
  }
}

writeFileSync(join(ROOT, OUT), JSON.stringify(results, null, 1));
console.log('\n已写 ' + OUT);
ws.close(); ch.kill(); server.close();
process.exit(0);
