/* 探针 v6：在三个候选插入位真插字段 8，量 scrollHeight 增量与落点屏数。 */
import http from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
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
function send(m, p) {
  return new Promise((res) => {
    const myId = ++idc;
    const on = (ev) => { const d = JSON.parse(ev.data); if (d.id === myId) { ws.removeEventListener('message', on); res(d); } };
    ws.addEventListener('message', on); ws.send(JSON.stringify({ id: myId, method: m, params: p }));
  });
}
const evalx = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : r; };

const SIM = (text) => `
(function(){
  var d = document.getElementById('detail');
  var dl = document.querySelector('#d-body .fields');
  var base = d.scrollHeight;
  function mkAfter(label){
    var f = document.createElement('div'); f.className='field';
    var dt=document.createElement('dt'); dt.textContent='去 AI 味审查点';
    var dd=document.createElement('dd'); dd.textContent=${JSON.stringify(text)};
    f.appendChild(dt); f.appendChild(dd);
    var ref=[].slice.call(dl.querySelectorAll('.field')).filter(function(x){return x.querySelector('dt').textContent===label;})[0];
    ref.parentNode.insertBefore(f, ref.nextSibling);
    var top = Math.round(f.offsetTop), h = Math.round(f.offsetHeight);
    f.parentNode.removeChild(f);
    return {top: top, h: h};
  }
  return {
    baseScroll: base, clientH: d.clientHeight,
    afterLanding: mkAfter('可落地要点'),
    afterMotion: mkAfter('动效与交互'),
    vh: innerHeight
  };
})()
`;

server.listen(0, '127.0.0.1', async () => {
  const sPort = server.address().port;
  const prof = mkdtempSync(join(tmpdir(), 'meas6-'));
  const dPort = 9400 + Math.floor(Math.random() * 90);
  const c = spawn(CHROME, ['--headless=new', `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--window-size=1456,995', `--remote-debugging-port=${dPort}`,
    `http://127.0.0.1:${sPort}/prototypes/_selection/`], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 40; i++) { await sleep(500); try { list = await (await fetch(`http://127.0.0.1:${dPort}/json/list`)).json(); break; } catch (e) {} }
  const page = list.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));
  const out = {};
  for (const id of ids) {
    const r = rows.find((x) => x.id === id);
    await send('Page.navigate', { url: `http://127.0.0.1:${sPort}/prototypes/_selection/#${id}` });
    await sleep(2400);
    out[id] = await evalx(SIM(r.f8));
  }
  console.log(JSON.stringify(out, null, 1));
  try { c.kill(); } catch (e) {}
  try { rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  server.close(); process.exit(0);
});
