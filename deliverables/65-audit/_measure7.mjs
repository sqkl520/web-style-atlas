/* 探针 v7：量"骨架版"（手写 3 条，约 100 字）插进面板的实际 px 与落点。 */
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

const HAND = {
  S15: ['全站只有一个页面底色 #E7EBE9，没有任何一段换底色——分区靠三层硫酸纸交叠出的明暗。', '没有一个圆角、没有一处投影：深度只由三层 0 / 3 / 7px 的错位产生。', '平面图 14 个热区面积按舱室真实面积等比，大小不等、间距不等。'],
  S18: ['没有 hero：正文是一条连续走纸，版心偏左 12%，右侧专留空挂纸牌。', '全部元素直角，立体感只来自边孔阴影与折页压痕，不用任何投影。', '只有一种暗底 #0A0D0A；分区靠折页线与边孔，不换底色。'],
  S22: ['底色自始至终没变过，分区靠折痕、页码与三档透光差，没有一段换底色。', '没有吸顶导航、没有背景模糊；分区手段是"光"，不是"模糊"。', '全部直角，容器只用折痕的单向暗带与纸纤维边，页面里没有一片浮起的卡片。'],
  S30: ['全部直角；贴纸厚度只用 1px 深边加 0.5px 亮边表达，没有一处柔和投影。', '版面被一条对角线撕痕切开，标题压在撕痕一侧且不居中，首屏没有三等宽卡片。', '离型纸是 #EDEDED（R=G=B=237、饱和度 0%）而不是纯白，墨是脏黑 #141414；荧光绿是丝网专色，只出现在贴纸本体内，从不铺成背景。'],
  S13: ['全站圆角为 0、零柔和投影；唯一阴影来自常驻 135° 的单向硬光源，按下时翻到 315°。', '立体感一律给成三个数：压深 0.4mm、亮度差 3%、边缘对比度 14%。', '只有一种底 #F4E3BE；条款条目是 7 条与 4 条两段，不是 3 / 6 / 9。'],
  S08: ['导航不固定、没有任何背景模糊；分区靠六块实体板的层叠深度与侧壁面。', '容器没有 16–32px 圆角，板角只有 2mm 的 45° 倒角；投影是按光源方向偏移 3px 的硬阴影，不是柔影。', '底色是 #120C08 而不是 #000000，文字是 #E8DCC8 而不是 #FFFFFF。'],
};
const SIM = (text, labelled) => `
(function(){
  var d=document.getElementById('detail'), dl=document.querySelector('#d-body .fields');
  var base=d.scrollHeight;
  function mk(label, txt, asList){
    var f=document.createElement('div'); f.className='field';
    var dt=document.createElement('dt'); dt.textContent=label;
    var dd=document.createElement('dd'); dd.textContent=txt;
    f.appendChild(dt); f.appendChild(dd);
    var ref=[].slice.call(dl.querySelectorAll('.field')).filter(function(x){return x.querySelector('dt').textContent==='可落地要点';})[0];
    ref.parentNode.insertBefore(f, ref.nextSibling);
    var top=Math.round(f.offsetTop), h=Math.round(f.offsetHeight);
    f.parentNode.removeChild(f);
    return {top:top,h:h};
  }
  return {base:base, vh:innerHeight, skim: mk('去 AI 味审查点', ${JSON.stringify(text)})};
})()
`;
server.listen(0, '127.0.0.1', async () => {
  const sPort = server.address().port;
  const prof = mkdtempSync(join(tmpdir(), 'meas7-'));
  const dPort = 9500 + Math.floor(Math.random() * 60);
  const c = spawn(CHROME, ['--headless=new', `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--window-size=1456,995', `--remote-debugging-port=${dPort}`,
    `http://127.0.0.1:${sPort}/prototypes/_selection/`], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 40; i++) { await sleep(500); try { list = await (await fetch(`http://127.0.0.1:${dPort}/json/list`)).json(); break; } catch (e) {} }
  const page = list.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const out = {};
  for (const id of ids) {
    await send('Page.navigate', { url: `http://127.0.0.1:${sPort}/prototypes/_selection/#${id}` });
    await sleep(2400);
    out[id] = await evalx(SIM(HAND[id].join('  ')));
  }
  console.log(JSON.stringify(out, null, 1));
  try { c.kill(); } catch (e) {}
  try { rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  server.close(); process.exit(0);
});
