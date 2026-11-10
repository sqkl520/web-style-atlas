#!/usr/bin/env node
/* EXEC-B：15/30（Lead）vs 20/30（我）差异的逐值归因。
 *
 * 四个判据包在同一页面会话里同时跑，保证输入完全一致：
 *   A_lead      = Lead 原判据：display/visibility/width===0||height===0 跳过；无伪元素；borderStyle!=='none'
 *   B_leadPseudo= A + 伪元素（Lead 正式版其实有伪元素，我的复刻第一版漏了 → 上一轮 S16/S30 是复刻缺陷，不是真差异）
 *   C_mine      = 我的判据：仅 width&&height 都 0 才跳过；SOLID 白名单；opacity!==0；伪元素；SVG 几何元素白名单
 *   D_mineNoAnd = C 但把"零尺寸跳过"关掉（用来判断 AND→不跳过 是否还带来差异）
 *
 * 对每个取值的差异给出宿主元素，让人能自己判断"这条线是不是真的画出来了"。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8749; const CDP = 9360;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB3`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
}
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const LOAD = `(function(){
  var bags = { A_lead:{}, B_leadPseudo:{}, C_mine:{}, D_noZeroSkip:{} };
  var hosts = {};
  var SOLID = {solid:1,dashed:1,dotted:1,double:1,groove:1,ridge:1,inset:1,outset:1};
  var GEOM = {path:1,line:1,rect:1,circle:1,ellipse:1,polyline:1,polygon:1};
  function put(bag, v){ var n=Math.round(parseFloat(v)*100)/100; if(!n||n<=0) return; bag[n]=(bag[n]||0)+1; }
  function desc(el){ var t=el.tagName.toLowerCase(); var c=(el.getAttribute&&el.getAttribute('class'))||'';
    c=String(c).split(/\\s+/).filter(Boolean).slice(0,2).join('.'); return t+(c?'.'+c:''); }
  function note(v, host){ var k=Math.round(v*100)/100; if(!hosts[k]) hosts[k]=[];
    if(hosts[k].length<3) hosts[k].push(host); }
  function strokeVisible(cs){
    var st = cs.stroke;
    if(!st || st==='none' || st==='transparent') return false;
    if(/^rgba\\(.*,\\s*0\\)$/.test(st)) return false;
    return true;
  }
  function doBorderCs(bag, cs, el, tag){
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var st=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
      if(w>0 && st && st!=='none' && st!=='hidden') put(bag, w);
    });
    var os=cs.outlineStyle, ow=parseFloat(cs.outlineWidth);
    if(ow>0 && os && os!=='none') put(bag, ow);
  }
  function doBorderCsStrict(bag, cs, el, tag){
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var st=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
      if(w>0 && st && SOLID[st]){ put(bag, w); note(w, tag+':border'); }
    });
    var os=cs.outlineStyle, ow=parseFloat(cs.outlineWidth);
    if(ow>0 && os && os!=='none'){ put(bag, ow); note(ow, tag+':outline'); }
  }
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var isSVG = el instanceof SVGElement;
    var tag = desc(el);
    var leadSkip = cs.display==='none'||cs.visibility==='hidden'||r.width===0||r.height===0;
    var mineSkip = cs.display==='none'||cs.visibility==='hidden'||(r.width===0&&r.height===0)||cs.opacity==='0';
    // ---- A_lead：Lead 原判据，无伪元素，宽松 borderStyle
    if(!leadSkip){
      doBorderCs(bags.A_lead, cs, el, tag);
      if(isSVG){ var sw=parseFloat(cs.strokeWidth); if(sw>0 && strokeVisible(cs)) put(bags.A_lead, sw); }
    }
    // ---- B_leadPseudo：A + 伪元素（Lead 正式版）
    if(!leadSkip){
      doBorderCs(bags.B_leadPseudo, cs, el, tag);
      if(isSVG){ var sw2=parseFloat(cs.strokeWidth); if(sw2>0 && strokeVisible(cs)) put(bags.B_leadPseudo, sw2); }
      ['::before','::after'].forEach(function(ps){
        var pc=getComputedStyle(el,ps); if(!pc||pc.content==='none'||pc.content==='normal') return;
        doBorderCs(bags.B_leadPseudo, pc, el, tag+ps);
      });
    }
    // ---- C_mine
    if(!mineSkip){
      doBorderCsStrict(bags.C_mine, cs, el, tag);
      ['::before','::after'].forEach(function(ps){
        var pc=getComputedStyle(el,ps); if(!pc||pc.content==='none'||pc.content==='normal') return;
        doBorderCsStrict(bags.C_mine, pc, el, tag+ps);
      });
      if(isSVG && GEOM[el.tagName.toLowerCase()]){
        var sw3=parseFloat(cs.strokeWidth);
        if(sw3>0 && strokeVisible(cs)){ put(bags.C_mine, sw3); note(sw3, tag+':stroke'); }
      }
    }
    // ---- D_noZeroSkip：C 去掉零尺寸跳过（只留 display/visibility/opacity）
    var dSkip = cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0';
    if(!dSkip){
      doBorderCsStrict(bags.D_noZeroSkip, cs, el, tag);
      ['::before','::after'].forEach(function(ps){
        var pc=getComputedStyle(el,ps); if(!pc||pc.content==='none'||pc.content==='normal') return;
        doBorderCsStrict(bags.D_noZeroSkip, pc, el, tag+ps);
      });
      if(isSVG && GEOM[el.tagName.toLowerCase()]){
        var sw4=parseFloat(cs.strokeWidth);
        if(sw4>0 && strokeVisible(cs)) put(bags.D_noZeroSkip, sw4);
      }
    }
  });
  return { bags: bags, hosts: hosts };
})()`;

const diffRows = [];
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  const m = await evalJs(LOAD);
  const keys = (bag) => Object.keys(bag).map(Number).sort((a, b) => a - b);
  const A = keys(m.bags.A_lead), B = keys(m.bags.B_leadPseudo), C = keys(m.bags.C_mine), D = keys(m.bags.D_noZeroSkip);
  const has = (arr, x) => arr.some((y) => Math.abs(x - y) < 0.02);
  const aNotC = A.filter((x) => !has(C, x));
  const cNotB = C.filter((x) => !has(B, x));
  const cNotD = C.filter((x) => !has(D, x));
  if (aNotC.length || cNotB.length || cNotD.length) {
    diffRows.push({ sid, A, B, C, D, aNotC, cNotB, cNotD,
      hosts: Object.fromEntries([...aNotC, ...cNotB].map((k) => [k, m.hosts[k] || []])) });
  }
}
const fs = await import('node:fs');
fs.writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/criteria-4bags.json'), JSON.stringify(diffRows, null, 1));
console.log('=== Lead(A) 有、我(C) 没有 的取值 ===');
for (const r of diffRows.filter((x) => x.aNotC.length)) {
  console.log(`  ${r.sid}  ${r.aNotC.join(',')}`);
}
console.log('\n=== 我(C) 有、Lead正式版(B) 没有 的取值，附宿主 ===');
for (const r of diffRows.filter((x) => x.cNotB.length)) {
  console.log(`  ${r.sid}  ${r.cNotB.join(',')}`);
  for (const k of r.cNotB) console.log(`      ${k}px  宿主: ${(r.hosts[k] || []).join(' ; ') || '(无记录)'}`);
}
console.log('\n=== C 与 D 的差（零尺寸跳过是否还有影响）===');
for (const r of diffRows.filter((x) => x.cNotD.length)) console.log(`  ${r.sid}  ${r.cNotD.join(',')}`);
if (!diffRows.some((x) => x.cNotD.length)) console.log('  无差异：AND 判据已足够，不需要把零尺寸元素全放进来');
ws.close(); ch.kill(); server.close(); process.exit(0);
