#!/usr/bin/env node
// Lead v10：区分「宣示性 hex」（出现在正文文本节点编号/说明里）与「渲染性 hex」（真的画在元素上）
// 这是本轮最关键的方法论修正：静态扫文件会把"文字里提到的色"当成"使用了该色"。
// 用 CDP 真实测量：只统计 getComputedStyle 里真的出现的颜色。
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.avif': 'image/avif', '.webp': 'image/webp' };

const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(8734, '127.0.0.1', r));

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9345', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chrome10', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

async function waitPort(url, ms = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); }
  throw new Error('chrome timeout');
}
await waitPort('http://127.0.0.1:9345/json/version');
const targets = await (await fetch('http://127.0.0.1:9345/json/list')).json();
let page = targets.find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9345/json/new?about:blank', { method: 'PUT' })).json();

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

const SAMPLER = `(function(){
  function parseColor(s){
    if(!s) return null;
    s = s.trim();
    if(s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
    var m = s.match(/^rgba?\\(\\s*([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,\\s/]+([\\d.]+))?\\s*\\)$/);
    if(m){
      var a = m[4] === undefined ? 1 : parseFloat(m[4]);
      if(a < 0.06) return null;
      var r=Math.round(+m[1]), g=Math.round(+m[2]), b=Math.round(+m[3]);
      return '#' + [r,g,b].map(function(x){return x.toString(16).padStart(2,'0');}).join('');
    }
    if(s.indexOf('color(') === 0) return 'color-fn';
    return null;
  }
  function addHex(list, s, where, el){
    if(!s) return;
    // background-image 里的渐变
    var g = String(s).match(/rgba?\\([^)]+\\)/g);
    if(g){ g.forEach(function(x){ list.push({hex: parseColor(x), where: where}); }); return; }
    var h = parseColor(s);
    if(h && h !== 'color-fn') list.push({hex:h, where:where});
  }
  var out = [];
  var all = document.querySelectorAll('*');
  for(var i=0;i<all.length;i++){
    var el = all[i];
    if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='LINK'||el.tagName==='META') continue;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden') continue;
    var visible = r.width>0 && r.height>0;
    // 直接文本
    var ownText = '';
    for(var n=0;n<el.childNodes.length;n++){ if(el.childNodes[n].nodeType===3) ownText += el.childNodes[n].nodeValue; }
    ownText = ownText.trim();
    var area = Math.round(r.width*r.height);
    var rec = {tag:el.tagName.toLowerCase(), cls: (el.className&&el.className.toString?el.className.toString():'').slice(0,40), area:area, visible:visible, ownChars: ownText.length};

    var push = function(hex, where){
      if(!hex) return;
      out.push(Object.assign({}, rec, {hex:hex, where:where}));
    };
    push(parseColor(cs.color), 'color');
    push(parseColor(cs.backgroundColor), 'bg');
    ['Top','Right','Bottom','Left'].forEach(function(k){
      var w = parseFloat(cs['border'+k+'Width']);
      if(w>0) push(parseColor(cs['border'+k+'Color']), 'border');
    });
    if(cs.outlineWidth && parseFloat(cs.outlineWidth)>0) push(parseColor(cs.outlineColor),'outline');
    if(cs.boxShadow && cs.boxShadow!=='none'){
      (cs.boxShadow.match(/rgba?\\([^)]+\\)/g)||[]).forEach(function(x){ push(parseColor(x),'shadow'); });
    }
    if(cs.backgroundImage && cs.backgroundImage!=='none'){
      (cs.backgroundImage.match(/rgba?\\([^)]+\\)/g)||[]).forEach(function(x){ push(parseColor(x),'gradient'); });
    }
    if(cs.textDecorationColor) push(parseColor(cs.textDecorationColor),'deco');
    // SVG
    if(el instanceof SVGElement){
      var f = getComputedStyle(el).fill, st = getComputedStyle(el).stroke;
      push(parseColor(f),'svg-fill');
      push(parseColor(st),'svg-stroke');
      if(el.getAttribute('fill')) push(parseColor(el.getAttribute('fill')),'svg-fill-attr');
      if(el.getAttribute('stroke')) push(parseColor(el.getAttribute('stroke')),'svg-stroke-attr');
    }
    // 伪元素
    ['::before','::after'].forEach(function(ps){
      var pc = getComputedStyle(el, ps);
      if(!pc || pc.content === 'none') return;
      push(parseColor(pc.color), 'pe-color');
      push(parseColor(pc.backgroundColor), 'pe-bg');
      ['Top','Right','Bottom','Left'].forEach(function(k){
        var w = parseFloat(pc['border'+k+'Width']);
        if(w>0) push(parseColor(pc['border'+k+'Color']), 'pe-border');
      });
      if(pc.boxShadow && pc.boxShadow!=='none'){
        (pc.boxShadow.match(/rgba?\\([^)]+\\)/g)||[]).forEach(function(x){ push(parseColor(x),'pe-shadow'); });
      }
      if(pc.backgroundImage && pc.backgroundImage!=='none'){
        (pc.backgroundImage.match(/rgba?\\([^)]+\\)/g)||[]).forEach(function(x){ push(parseColor(x),'pe-gradient'); });
      }
    });
  }
  return out;
})()`;

console.log('=== 渲染实测：每案真实画出来的颜色（1440×900）===\n');
const results = {};
for (const d of DIRS) {
  const id = d.slice(0, 3);
  await send('Page.navigate', { url: `http://127.0.0.1:8734/prototypes/${d}/index.html` });
  await new Promise((r) => setTimeout(r, 1400));
  let list;
  try { list = await evalJs(SAMPLER); } catch (e) { console.log(`${id}  采样失败: ${e.message.slice(0, 120)}`); continue; }
  const map = new Map();
  for (const it of list) {
    if (!it.hex || !/^#[0-9a-f]{6}$/.test(it.hex)) continue;
    if (!it.visible) continue;
    const k = it.hex;
    if (!map.has(k)) map.set(k, { hex: k, n: 0, area: 0, kinds: new Set(), samples: [] });
    const o = map.get(k);
    o.n++; o.area += it.area; o.kinds.add(it.where);
    if (o.samples.length < 2 && it.ownChars > 0) o.samples.push(it.tag + '.' + it.cls);
  }
  const sorted = [...map.values()].sort((a, b) => b.n - a.n);
  results[id] = sorted.map((o) => ({ hex: o.hex, n: o.n, kinds: [...o.kinds] }));
  console.log(`${id}  渲染色 ${String(sorted.length).padStart(2)} 个: ${sorted.slice(0, 12).map((o) => o.hex + '(' + o.n + ')').join(' ')}`);
}

const fsmod = await import('node:fs');
fsmod.writeFileSync(join(ROOT, 'deliverables/70-plan/rendered-colors-30.json'), JSON.stringify(results, null, 1));
console.log('\n已写 deliverables/70-plan/rendered-colors-30.json');

ws.close(); ch.kill(); server.close();
process.exit(0);
