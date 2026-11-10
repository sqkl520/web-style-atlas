/* 探针 v9：详情面板首屏 900px 里到底有什么（字段一个都进不来吗）。 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
const ROOT = 'D:/Web/style';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const ids = process.argv.slice(2);
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]).split('#')[0];
  let abs = normalize(join(ROOT, p));
  if (existsSync(abs) && statSync(abs).isDirectory()) abs = join(abs, 'index.html');
  if (!abs.startsWith(normalize(ROOT)) || !existsSync(abs)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream' });
  createReadStream(abs).pipe(res);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, idc = 0;
function send(m, p) { return new Promise((res) => { const myId = ++idc; const on = (ev) => { const d = JSON.parse(ev.data); if (d.id === myId) { ws.removeEventListener('message', on); res(d); } }; ws.addEventListener('message', on); ws.send(JSON.stringify({ id: myId, method: m, params: p })); }); }
const evalx = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : r; };
const PROBE = `
(function(){
  var d=document.getElementById('detail');
  var body=document.getElementById('d-body');
  var kids=[].slice.call(body.children).map(function(el){
    return {cls: el.className, top: Math.round(el.getBoundingClientRect().top + d.scrollTop), h: Math.round(el.getBoundingClientRect().height)};
  });
  var f1=document.querySelector('#d-body .fields .field');
  return {scrollH:d.scrollHeight, clientH:d.clientHeight, vh:innerHeight,
          kids:kids, firstFieldTop: f1?Math.round(f1.getBoundingClientRect().top+d.scrollTop):null,
          firstFieldScreen: f1?+((f1.getBoundingClientRect().top+d.scrollTop)/innerHeight).toFixed(2):null,
          fieldsTop: Math.round(document.querySelector('#d-body .fields').getBoundingClientRect().top + d.scrollTop)};
})()
`;
server.listen(0, '127.0.0.1', async () => {
  const sPort = server.address().port;
  const prof = mkdtempSync(join(tmpdir(), 'meas9-'));
  const dPort = 9600 + Math.floor(Math.random() * 40);
  const c = spawn(CHROME, ['--headless=new', `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--window-size=1456,995', `--remote-debugging-port=${dPort}`, `http://127.0.0.1:${sPort}/prototypes/_selection/`], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 40; i++) { await sleep(500); try { list = await (await fetch(`http://127.0.0.1:${dPort}/json/list`)).json(); break; } catch (e) {} }
  const page = list.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const out = {};
  for (const id of ids) { await send('Page.navigate', { url: `http://127.0.0.1:${sPort}/prototypes/_selection/#${id}` }); await sleep(2500); out[id] = await evalx(PROBE); }
  console.log(JSON.stringify(out, null, 1));
  try { c.kill(); } catch (e) {} try { rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  server.close(); process.exit(0);
});
