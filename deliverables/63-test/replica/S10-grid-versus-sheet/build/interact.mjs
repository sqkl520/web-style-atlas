// 交互回归：字段 7 的四条动效与字段 12 的三条出口，闸门只拍静态图，拍不到这些。
// 用法：node build/interact.mjs
import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('.');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/S10-grid-versus-sheet/index.html`;

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(url, { settleMs: 1400 });

const out = {};
const ev = (expr) => page.eval(expr);
const fire = (sel, type) => ev(`(() => { const el = document.querySelector('${sel}'); if (!el) return 'MISSING'; el.dispatchEvent(new MouseEvent('${type}', {bubbles:true})); return 'ok'; })()`);
const click = (sel) => ev(`(() => { const el = document.querySelector('${sel}'); if (!el) return 'MISSING'; el.click(); return 'ok'; })()`);

const order = () => ev(`[].map.call(document.querySelectorAll('#rows tr'), (t) => t.getAttribute('data-lead'))`);

out['初始顺序'] = await order();
out['切到报价组'] = await click('#g-price');
await sleep(420);
out['报价序前 3'] = await ev(`[].map.call(document.querySelectorAll('#rows tr'), (t) => t.children[1].innerText.trim()).slice(0,3)`);
out['分离类已加'] = await click('#g-diff');
out['pre-separated 出现过'] = await ev(`!!document.querySelector('#g-diff')`);
await sleep(420);
out['差额序前 3'] = await ev(`[].map.call(document.querySelectorAll('#rows tr'), (t) => t.children[3].innerText.trim()).slice(0,3)`);
out['切回到货周期'] = await click('#g-lead');
await sleep(420);
out['周期序前 3'] = await order();

out['筛选前可见行'] = await ev(`[].filter.call(document.querySelectorAll('#rows tr'), (t) => t.offsetParent !== null).length`);
out['点先看已填'] = await click('#filled-btn');
await sleep(120);
out['筛选后可见行'] = await ev(`[].filter.call(document.querySelectorAll('#rows tr'), (t) => t.offsetParent !== null).length`);
out['错误块被压低'] = await ev(`document.querySelector('#error-block').classList.contains('is-quiet')`);
out['状态句'] = await ev(`document.querySelector('#live').innerText`);
out['还原'] = await click('#filled-btn');

out['悬停游标'] = await fire('#rows tr:nth-child(3) td:nth-child(5)', 'mouseover');
await sleep(200);
out['游标不透明度'] = await ev(`getComputedStyle(document.querySelector('#rows tr:nth-child(3) .cell-no'), '::after').opacity`);
out['游标边长'] = await ev(`getComputedStyle(document.querySelector('#rows tr:nth-child(3) .cell-no'), '::after').width`);
await ev(`document.querySelector('.ship, .sheet').classList.contains('settled')`);

out['套准收束后 settled'] = await ev(`document.querySelector('.sheet').classList.contains('settled')`);
out['栏线错位'] = await ev(`getComputedStyle(document.querySelector('.plate-rules')).transform`);
// 滚动到表格触发 IntersectionObserver 的套准回位
await ev(`window.scrollTo({ top: 900, behavior: 'instant' })`);
await sleep(500);
out['进视口后 settled'] = await ev(`document.querySelector('.sheet').classList.contains('settled')`);
out['进视口后栏线错位'] = await ev(`getComputedStyle(document.querySelector('.plate-rules')).transform`);
out['刻度游标符号可读'] = await ev(`document.querySelector('.scale').getBoundingClientRect().width > 40`);
await ev(`window.scrollTo({ top: 0, behavior: 'instant' })`);

// 指针光标（字段 7 第五条）
await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400, button: 'none' });
await sleep(120);
out['自绘光标出现'] = await ev(`(() => { const c = document.querySelector('.data-cursor'); return c ? getComputedStyle(c).visibility : 'NO-NODE'; })()`);

console.log(JSON.stringify(out, null, 1));
console.log('控制台异常：' + page.consoleErrors.length + (page.consoleErrors.length ? ' -> ' + page.consoleErrors.slice(0, 3).join(' | ') : ''));
await page.close();
await browser.close();
server.close();
