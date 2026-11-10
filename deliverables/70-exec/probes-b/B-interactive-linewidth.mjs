#!/usr/bin/env node
/* EXEC-B：把"交互态线宽"也测进来，给出与静态口径并列的第二组数字。
 *
 * 背景（必须写清，否则这个脚本会被误读）：
 *   我对 lineWidths 的第一版修法是**排除**只在 :hover/:focus-visible 里出现的值，
 *   理由是「提示词第 5 条讲的是静态版式的描边层级」。
 *   Agent A 在同期把它改成**保留**，并写明依据是 Lead 的 2026-10-30 裁决，理由三条：
 *     · 30/30 案都定义了 :focus-visible 的 outline，且用各案自己的主色 —— 是有意的设计决策；
 *     · 提示词要求键盘可用，排除后提示词说"只用 1px、2px"，而用户按 Tab 真会看到 3px；
 *     · S25 排除后变成 1/1.2/2，而它的规格核心线宽是 3px（只在 focus 环上）。
 *   我不覆盖 A 的版本（它引用了 Lead 裁决），但必须把**两套口径的数字都报出来**，
 *   否则"声称值都能在页面上找到"这条验收会随口径不同得出相反结论。
 *
 * 本探针采集：
 *   静态口径  —— 不聚焦、不悬停时页面上真实存在的线宽
 *   交互口径  —— 逐个聚焦可聚焦元素后，页面上存在的线宽（= 静态 ∪ focus 环）
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = 'D:/Web/style';
const PORT = 8765; const CDP = 9380;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.avif': 'image/avif', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${ROOT}/deliverables/70-exec/probes-b/_chromeB10`, '--no-first-run', '--disable-gpu', '--force-device-scale-factor=1', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const STATIC = `(function(){
  var SOLID={solid:1,dashed:1,dotted:1,double:1,groove:1,ridge:1,inset:1,outset:1};
  var GEOM={path:1,line:1,rect:1,circle:1,ellipse:1,polyline:1,polygon:1};
  var TPL={symbol:1,defs:1,clippath:1,mask:1,pattern:1,marker:1};
  var counts={};
  function put(v){var n=Math.round(parseFloat(v)*100)/100; if(n>0) counts[n]=(counts[n]||0)+1;}
  function opaque(cs){var st=cs.stroke; if(!st||st==='none'||st==='transparent') return false;
    var m=st.match(/^rgba?\\(([^)]+)\\)$/); if(m){var p=m[1].split(/[,\\s\\/]+/).filter(Boolean);
    if(p.length>=4&&parseFloat(p[3])===0) return false;} return true;}
  function inTpl(el){var n=el; while(n&&n.tagName){ if(TPL[String(n.tagName).toLowerCase()]) return true; n=n.parentElement;} return false;}
  document.querySelectorAll('*').forEach(function(el){
    var cs=getComputedStyle(el), r=el.getBoundingClientRect();
    if(cs.display==='none'||cs.visibility==='hidden') return;
    if(r.width===0&&r.height===0) return;
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var st=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
      if(w>0&&st&&SOLID[st]) put(w);
    });
    if(el instanceof SVGElement && GEOM[String(el.tagName).toLowerCase()] && !inTpl(el)){
      var sw=parseFloat(cs.strokeWidth); if(sw>0&&opaque(cs)) put(sw);
    }
  });
  return counts;
})()`;

/* 交互口径：逐个 focus() 可聚焦元素，读它的 outline/border。
 * 不模拟 hover（hover 需要鼠标事件且容易误判）；outline 是 30 案交互态线宽的唯一来源
 * （clean-dna 的 lineWidthsInteractive 归档里，交互态专有值全部来自 :focus-visible 的 outline，
 *  以及 S13 的 .clause:hover 的 border-top-width —— 后者这里测不到，会体现在差额里，如实标注）。 */
const FOCUS = `(function(){
  var counts={};
  function put(v){var n=Math.round(parseFloat(v)*100)/100; if(n>0) counts[n]=(counts[n]||0)+1;}
  function scan(){
    document.querySelectorAll('*').forEach(function(el){
      var cs=getComputedStyle(el);
      var os=cs.outlineStyle, ow=parseFloat(cs.outlineWidth);
      if(ow>0 && os && os!=='none') put(ow);
      ['Top','Right','Bottom','Left'].forEach(function(k){
        var st=cs['border'+k+'Style'], w=parseFloat(cs['border'+k+'Width']);
        if(w>0 && st && st!=='none' && st!=='hidden') put(w);
      });
    });
  }
  var focusables=[].slice.call(document.querySelectorAll(
    'a[href],button,input,select,textarea,summary,[tabindex]'));
  focusables.slice(0,120).forEach(function(el){ try{ el.focus(); scan(); }catch(e){} });
  return counts;
})()`;

const rows = [];
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  const st = await evalJs(STATIC);
  const fo = await evalJs(FOCUS);
  const keys = (o) => Object.keys(o).map(Number).sort((a, b) => a - b);
  const s = keys(st), f = keys(fo);
  const onlyFocus = f.filter((x) => !s.some((y) => Math.abs(x - y) < 0.02));
  rows.push({ sid, staticVals: s, focusVals: f, onlyFocus, staticCounts: st });
  console.log(`${sid}  静态[${s.join(',')}]  聚焦后新增[${onlyFocus.join(',') || '—'}]`);
}
writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-interactive-30.json'), JSON.stringify(rows, null, 1));
const anyOnly = rows.filter((r) => r.onlyFocus.length);
console.log(`\n有"只在聚焦后出现"的线宽的案：${anyOnly.length}/30`);
for (const r of anyOnly) console.log(`  ${r.sid}  ${r.onlyFocus.join(',')}`);
