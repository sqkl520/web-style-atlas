// 降级回归：在 prefers-reduced-motion: reduce 下量签名机制是否仍在位（不是被否掉）
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
const page = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
await page.goto(url, { settleMs: 700 });
const out = {};
out['媒体查询生效'] = await page.eval(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
out['未进视口栏线错位'] = await page.eval(`getComputedStyle(document.querySelector('.plate-rules')).transform`);
out['红版块错位'] = await page.eval(`getComputedStyle(document.querySelector('.state-error')).transform`);
out['标题动画时长'] = await page.eval(`getComputedStyle(document.querySelector('h1')).animationDuration`);
out['标题可见'] = await page.eval(`getComputedStyle(document.querySelector('h1')).opacity`);
out['套准线动画时长'] = await page.eval(`getComputedStyle(document.querySelector('.reg-tl')).animationDuration`);
await page.eval(`document.querySelector('#rows').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await sleep(400);
out['进视口后栏线错位'] = await page.eval(`getComputedStyle(document.querySelector('.plate-rules')).transform`);
out['游标 transition'] = await page.eval(`getComputedStyle(document.querySelector('.cell-no'), '::after').transitionDuration`);
out['游标位移'] = await page.eval(`getComputedStyle(document.querySelector('.cell-no'), '::after').transform`);
out['游标边长'] = await page.eval(`getComputedStyle(document.querySelector('.cell-no'), '::after').width`);
console.log(JSON.stringify(out, null, 1));
console.log('控制台异常：' + page.consoleErrors.length);
await page.close();
await browser.close();
server.close();
