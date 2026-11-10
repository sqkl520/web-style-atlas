#!/usr/bin/env node
/* EXEC-B：把 Lead 探针的判据与我的判据放进**同一个页面会话**里跑，隔离差异来源。
 *
 * Lead 的判据（LEAD-linewidth-fixed.mjs）：
 *   if (display==='none' || visibility==='hidden' || rect.width===0 || rect.height===0) return;
 *   —— 注意是 **OR**：宽为 0 **或** 高为 0 就跳过。
 * 我的判据：只有宽高**都为 0** 才跳过。
 *
 * 这个差别对 SVG 是致命的：一条水平 <line> / 一条横向 <path> 的高就是 0，
 * 它是真实存在的 1px 线，但会被 OR 判据整条丢掉（连线宽一起丢）。
 * 本探针就是为了把这条量化出来，而不是靠猜。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8747;
const CDP = 9358;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB2`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('cdp'); }
await waitPort(`http://127.0.0.1:${CDP}/json/version`);
let page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page');
if (!page) page = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

/* 一次页面载荷里同时算两套 */
const BOTH = `(function(){
  var out = { lead:{}, mine:{}, leadHosts:{}, zeroDimSVG:{} , zeroDimSVGAll:{} };
  var SOLID = {solid:1,dashed:1,dotted:1,double:1,groove:1,ridge:1,inset:1,outset:1};
  function addTo(bag, v, host){
    var n = Math.round(parseFloat(v)*100)/100; if(!n||n<=0) return;
    bag[n]=(bag[n]||0)+1;
  }
  function desc(el){ var t=el.tagName.toLowerCase(); var c=(el.getAttribute&&el.getAttribute('class'))||'';
    c=String(c).split(/\\s+/).filter(Boolean).slice(0,2).join('.'); return t+(c?'.'+c:''); }
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var isSVG = el instanceof SVGElement;
    // ---- Lead 判据：OR 跳过 ----
    var leadSkip = cs.display==='none'||cs.visibility==='hidden'||r.width===0||r.height===0;
    // ---- 我的判据：both zero 才跳过 ----
    var mySkip  = cs.display==='none'||cs.visibility==='hidden'||(r.width===0&&r.height===0)||cs.opacity==='0';
    if(!leadSkip){
      ['Top','Right','Bottom','Left'].forEach(function(k){
        var st=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
        if(w>0&&st&&st!=='none'&&st!=='hidden') addTo(out.lead,w,desc(el));
      });
      var os=cs.outlineStyle, ow=parseFloat(cs.outlineWidth);
      if(ow>0&&os&&os!=='none') addTo(out.lead,ow,desc(el));
      if(isSVG){ var sw=parseFloat(cs.strokeWidth);
        var stv=cs.stroke; var vis=stv&&stv!=='none'&&!/rgba\\(0,\\s*0,\\s*0,\\s*0\\)/.test(stv);
        if(sw>0&&vis) addTo(out.lead,sw,desc(el)); }
    } else if(isSVG && (r.width===0||r.height===0)){
      // 被 Lead 判据丢掉、但确实有描边的 SVG 几何元素 —— 差异来源候选
      var sw2=parseFloat(cs.strokeWidth); var st2=cs.stroke;
      var vis2=st2&&st2!=='none'&&!/rgba\\(0,\\s*0,\\s*0,\\s*0\\)/.test(st2);
      var tag2 = el.tagName.toLowerCase();
      var geom = {path:1,line:1,rect:1,circle:1,ellipse:1,polyline:1,polygon:1}[tag2];
      if(geom && sw2>0 && vis2){
        var k = Math.round(sw2*100)/100;
        out.zeroDimSVG[k]=(out.zeroDimSVG[k]||0)+1;
        if(!out.leadHosts[k]) out.leadHosts[k]=[];
        if(out.leadHosts[k].length<3) out.leadHosts[k].push(desc(el)+' '+Math.round(r.width)+'x'+Math.round(r.height));
      }
    }
    if(!mySkip){
      ['Top','Right','Bottom','Left'].forEach(function(k){
        var st=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
        if(w>0&&st&&SOLID[st]) addTo(out.mine,w,desc(el));
      });
      var os2=cs.outlineStyle, ow2=parseFloat(cs.outlineWidth);
      if(ow2>0&&os2&&os2!=='none') addTo(out.mine,ow2,desc(el));
      ['::before','::after'].forEach(function(ps){
        var pc=getComputedStyle(el,ps); if(!pc||pc.content==='none'||pc.content==='normal') return;
        ['Top','Right','Bottom','Left'].forEach(function(k){
          var st=pc['border'+k+'Style'], w=parseFloat(pc['border'+k+'Width']);
          if(w>0&&st&&SOLID[st]) addTo(out.mine,w,desc(el)+ps);
        });
      });
      if(isSVG){
        var tag3=el.tagName.toLowerCase();
        if({path:1,line:1,rect:1,circle:1,ellipse:1,polyline:1,polygon:1}[tag3]){
          var sw3=parseFloat(cs.strokeWidth); var st3=cs.stroke;
          var vis3=st3&&st3!=='none'&&!/rgba\\(0,\\s*0,\\s*0,\\s*0\\)/.test(st3);
          if(sw3>0&&vis3) addTo(out.mine,sw3,desc(el));
        }
      }
    }
  });
  return out;
})()`;

const rows = [];
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  const m = await evalJs(BOTH);
  const leadVals = Object.keys(m.lead).map(Number).sort((a, b) => a - b);
  const mineVals = Object.keys(m.mine).map(Number).sort((a, b) => a - b);
  const onlyMine = mineVals.filter((x) => !leadVals.some((y) => Math.abs(x - y) < 0.02));
  const onlyLead = leadVals.filter((x) => !mineVals.some((y) => Math.abs(x - y) < 0.02));
  const zeroDim = m.zeroDimSVG || {};
  const explained = onlyMine.filter((x) => zeroDim[x] > 0);
  const unexplained = onlyMine.filter((x) => !(zeroDim[x] > 0));
  rows.push({ sid, onlyMine, onlyLead, explained, unexplained, leadVals, mineVals,
    zeroDim, hosts: m.leadHosts });
  if (onlyMine.length || onlyLead.length) {
    console.log(`${sid}  只在「我」这边:${onlyMine.join(',') || '—'}  只在「Lead」那边:${onlyLead.join(',') || '—'}`);
    for (const x of onlyMine) {
      const z = zeroDim[x];
      console.log(`      ${x}px  被OR判据丢掉的零尺寸SVG描边 ${z || 0} 个` +
        (m.leadHosts[x] ? '  例：' + m.leadHosts[x].join(' ; ') : '') +
        (z ? '' : '   ← 需另找原因'));
    }
  }
}
const fs = await import('node:fs');
fs.writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/criteria-diff.json'), JSON.stringify(rows, null, 1));
const nExplained = rows.filter((r) => r.onlyMine.length && r.unexplained.length === 0).length;
const nUnexplained = rows.filter((r) => r.unexplained.length).length;
console.log(`\n=== 汇总 ===`);
console.log(`只在我这边多出取值的案：${rows.filter((r) => r.onlyMine.length).length}/30（其中全部可用"零尺寸SVG被OR判据丢弃"解释：${nExplained}）`);
console.log(`仍有未解释差异的案：${nUnexplained}`);
for (const r of rows.filter((x) => x.unexplained.length)) console.log(`  ${r.sid}  未解释: ${r.unexplained.join(',')}`);
ws.close(); ch.kill(); server.close(); process.exit(0);
