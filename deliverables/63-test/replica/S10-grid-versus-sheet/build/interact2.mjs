// 针对性回归：把真实指针移到表格行上，验证 ① 行悬停让刻度游标滑出 ② 自绘 L 游标跟随
import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('.');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/S10-grid-versus-sheet/index.html`;

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(url, { settleMs: 1400 });
const out = {};

// 滚到表格第 4 行，取该行第 5 栏中心
await page.eval(`document.querySelector('#rows tr:nth-child(4)').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await sleep(500);
const box = await page.eval(`(() => { const r = document.querySelector('#rows tr:nth-child(4) .cell-no').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
out['取样点'] = box;
await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
await sleep(260);

out['行处于 hover'] = await page.eval(`document.querySelector('#rows tr:nth-child(4)').matches(':hover')`);
out['游标不透明度'] = await page.eval(`getComputedStyle(document.querySelector('#rows tr:nth-child(4) .cell-no'), '::after').opacity`);
out['游标位移'] = await page.eval(`getComputedStyle(document.querySelector('#rows tr:nth-child(4) .cell-no'), '::after').transform`);
out['自绘光标可见'] = await page.eval(`getComputedStyle(document.querySelector('.data-cursor')).visibility`);
out['自绘光标位移'] = await page.eval(`document.querySelector('.data-cursor').style.transform`);
out['表格 cursor'] = await page.eval(`getComputedStyle(document.querySelector('.grid-table')).cursor`);
out['单元格 cursor'] = await page.eval(`getComputedStyle(document.querySelector('#rows tr:nth-child(4) .cell-no')).cursor`);
out['行高亮'] = await page.eval(`getComputedStyle(document.querySelector('#rows tr:nth-child(4)')).backgroundColor`);

// 离开表格后自绘光标应隐藏
await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: 60, button: 'none' });
await sleep(200);
out['离开表格后光标'] = await page.eval(`getComputedStyle(document.querySelector('.data-cursor')).visibility`);

// 按钮悬停反馈
const b = await page.eval(`(() => { const r = document.querySelector('#proof-btn').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
await page.eval(`window.scrollTo({ top: 0, behavior: 'instant' })`);
await sleep(300);
const b2 = await page.eval(`(() => { const r = document.querySelector('#proof-btn').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b2.x, y: b2.y, button: 'none' });
await sleep(260);
out['主按钮 hover 底色'] = await page.eval(`getComputedStyle(document.querySelector('#proof-btn')).backgroundColor`);
out['按钮初始底色(记录点)'] = b;

console.log(JSON.stringify(out, null, 1));
console.log('控制台异常：' + page.consoleErrors.length);
await page.close();
await browser.close();
server.close();
