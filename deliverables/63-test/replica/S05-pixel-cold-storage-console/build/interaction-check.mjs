// S05 交互功能实测：闸门只看静态渲染，动效与控件是否真的接上要自己量。
// 用法：node build/interaction-check.mjs（cwd 必须是 D:\Web\style）
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const FILE = resolve(ROOT, 'prototypes/S05-pixel-cold-storage-console/index.html');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${relative(ROOT, FILE).split(sep).join('/')}`;

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(url, { timeoutMs: 30000, settleMs: 800 });
await sleep(1800);

const read = () => page.eval(() => ({
  readout: document.querySelector('.panel--bay2 .lattice--md').getAttribute('aria-label'),
  viewBox: document.querySelector('.panel--bay2 .lattice--md').getAttribute('viewBox'),
  glyphs: document.querySelectorAll('.panel--bay2 .lattice-cells use').length,
  row: document.querySelectorAll('.panel--bay2 .rows code')[1].textContent,
  hint: document.getElementById('setpoint-hint').textContent,
  btn: document.getElementById('setpoint').textContent + '/' + document.getElementById('setpoint').disabled,
  leverPos: document.getElementById('lever-bay').getAttribute('data-pos'),
  leverTransform: getComputedStyle(document.querySelector('.lever-arm')).transform,
  zonePressed: [...document.querySelectorAll('.zone')].map((z) => z.getAttribute('aria-pressed')).join(','),
  blanked: document.querySelectorAll('.panel.is-blanked').length,
  scanned: document.querySelectorAll('.panel.is-scanned, .plate.is-scanned, .rail.is-scanned').length,
  probeLogged: document.querySelector('.panel--probe').classList.contains('is-probe-logged'),
  probeValue: document.getElementById('probe-id').value,
}));

const out = { initial: await read() };

// 1) 主按钮：把 2 号库调到 −20℃
await page.eval(() => { document.getElementById('setpoint').click(); });
await sleep(400);
out.afterButton = await read();

// 2) 拨杆拖到最冷档 −22℃（同一个 <input type="range">）
await page.eval(() => {
  const i = document.getElementById('target');
  i.value = '-22';
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(400);
out.afterLever = await read();

// 3) 库区切换：全灭 120ms 后逐行显影
await page.eval(() => { document.querySelectorAll('.zone')[2].click(); });
await sleep(60);
out.duringSwitch = await read();
await sleep(600);
out.afterSwitch = await read();

// 4) 探头编号：不足 6 位 / 抄满 6 位
await page.eval(() => {
  const i = document.getElementById('probe-id');
  i.value = '417';
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(80);
out.probeShort = await read();
await page.eval(() => {
  const i = document.getElementById('probe-id');
  i.value = '417abc0289';
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(80);
out.probeFull = await read();

console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
