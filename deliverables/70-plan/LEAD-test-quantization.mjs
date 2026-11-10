// 实测 Chrome 的 border-width 与 stroke-width 量化行为
// EXEC-B 声称：border-width 被量化成 max(1,floor(w))，stroke 不量化
// 这决定了「声称值必须 ±0.05 找到」这个验收判据是否物理上可行
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const HTML = `<!DOCTYPE html><html><head><style>
  body { margin:0; background:#fff; }
  .t { width:200px; height:20px; margin:2px 0; }
  /* 逐个测 border */
  ${[0.35, 0.4, 0.5, 0.6, 0.8, 1, 1.1, 1.2, 1.25, 1.4, 1.5, 1.6, 1.7, 2, 2.4, 2.5, 3, 3.2, 3.5, 3.6, 4, 5, 5.5, 6, 7, 8, 13, 14.5]
    .map((w, i) => `.b${i} { border-top: ${w}px solid #000; }`).join('\n  ')}
</style></head><body>
  ${[0.35, 0.4, 0.5, 0.6, 0.8, 1, 1.1, 1.2, 1.25, 1.4, 1.5, 1.6, 1.7, 2, 2.4, 2.5, 3, 3.2, 3.5, 3.6, 4, 5, 5.5, 6, 7, 8, 13, 14.5]
    .map((w, i) => `<div class="t b${i}" data-w="${w}"></div>`).join('\n  ')}
  <svg width="0" height="0">${[0.35, 0.4, 0.5, 0.6, 0.8, 1, 1.1, 1.2, 1.25, 1.4, 1.5, 1.6, 1.7, 2, 2.4, 2.5, 3, 3.2, 3.5, 3.6, 4, 5, 5.5, 6, 7, 8, 13, 14.5]
    .map((w, i) => `<line id="s${i}" x1="0" y1="${i * 2}" x2="100" y2="${i * 2}" stroke="#000" stroke-width="${w}" data-w="${w}"/>`).join('\n  ')}</svg>
</body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});
await new Promise((r) => server.listen(8760, '127.0.0.1', r));

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9370', '--user-data-dir=D:/Web/style/deliverables/70-plan/_chromeQuant', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function waitPort(url, ms = 25000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error('to'); }
await waitPort('http://127.0.0.1:9370/json/version');
let page = (await (await fetch('http://127.0.0.1:9370/json/list')).json()).find((t) => t.type === 'page');
if (!page) page = (await (await fetch('http://127.0.0.1:9370/json/new?about:blank', { method: 'PUT' })).json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++id; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8760/' });
await new Promise((r) => setTimeout(r, 800));

const result = await evalJs(`(function(){
  var borders = [];
  document.querySelectorAll('.t').forEach(function(el){
    var declared = parseFloat(el.dataset.w);
    var computed = parseFloat(getComputedStyle(el).borderTopWidth);
    // 实际画出来的高度
    var rect = el.getBoundingClientRect();
    borders.push({declared: declared, computed: computed, rectH: Math.round(rect.height*100)/100});
  });
  var strokes = [];
  document.querySelectorAll('line').forEach(function(el){
    var declared = parseFloat(el.dataset.w);
    var computed = parseFloat(getComputedStyle(el).strokeWidth);
    strokes.push({declared: declared, computed: computed});
  });
  return {borders: borders, strokes: strokes};
})()`);

console.log('=== border-width 量化实测（1440, dpr=1）===\n');
console.log('声明值 → computed 值  |  是否符合 max(1,floor(w))  |  是否符合 round(w)');
let floorMatch = 0, roundMatch = 0, unchanged = 0;
for (const b of result.borders) {
  const expectedFloor = Math.max(1, Math.floor(b.declared));
  const expectedRound = Math.max(1, Math.round(b.declared));
  const okFloor = Math.abs(b.computed - expectedFloor) < 0.01;
  const okRound = Math.abs(b.computed - expectedRound) < 0.01;
  if (okFloor) floorMatch++;
  if (okRound) roundMatch++;
  if (Math.abs(b.declared - b.computed) < 0.01) unchanged++;
  const mark = Math.abs(b.declared - b.computed) < 0.01 ? '（未变）' : `→ ${b.computed}`;
  console.log(`  ${String(b.declared).padStart(6)}px ${mark.padEnd(12)} floor:${okFloor ? '✓' : '✗'}  round:${okRound ? '✓' : '✗'}`);
}
console.log(`\nborder: floor 吻合 ${floorMatch}/${result.borders.length}，round 吻合 ${roundMatch}/${result.borders.length}，未量化 ${unchanged}/${result.borders.length}`);

console.log('\n=== stroke-width 量化实测 ===\n');
let sUnchanged = 0;
for (const s of result.strokes) {
  const same = Math.abs(s.declared - s.computed) < 0.01;
  if (same) sUnchanged++;
  if (!same) console.log(`  ${s.declared}px → ${s.computed}px  （变了！）`);
}
console.log(`stroke: 未量化 ${sUnchanged}/${result.strokes.length}`);

console.log('\n=== 结论 ===');
if (unchanged < result.borders.length && floorMatch > roundMatch) {
  console.log('✓ EXEC-B 的指控成立：border-width 被 floor 量化（不是 round），stroke 不量化。');
  console.log('  → 「声称值必须 ±0.05 在渲染里找到」对 border 物理上不可能成立。');
} else if (unchanged === result.borders.length) {
  console.log('✗ border-width 没有被量化，EXEC-B 的指控不成立。');
} else {
  console.log('部分成立，见上表。');
}

ws.close(); ch.kill(); server.close(); process.exit(0);
