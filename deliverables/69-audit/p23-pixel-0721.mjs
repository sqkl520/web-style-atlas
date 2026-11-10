// 实验 B：S07 / S21 包 <code> 之后，像素是否逐字节不变（冻结动效）。
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const BASE = resolve('D:/Web/style/deliverables/69-audit/exp3');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(BASE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(BASE + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8861, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });

const grab = async (variant) => {
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false, reducedMotion: true });
  await p.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await p.goto(`http://127.0.0.1:8861/${variant}/index.html`, { timeoutMs: 30000, settleMs: 900 });
  await p.eval('document.fonts.ready.then(() => true)');
  await sleep(2000);
  await p.eval(`(() => { const s=document.createElement('style'); s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(s); for (const a of (document.getAnimations?document.getAnimations():[])) { try{a.finish();}catch{} } return true; })()`);
  await sleep(600);
  const shots = {}; let pageH = 0;
  for (const y of [0, 900, 1800, 2700, 3600]) {
    await p.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
    await sleep(700);
    const b = await p.screenshot({ format: 'png' });
    shots[y] = createHash('sha256').update(b).digest('hex');
  }
  pageH = await p.eval('document.documentElement.scrollHeight');
  await p.close();
  return { shots, pageH };
};
for (const id of ['S07', 'S21']) {
  const a = await grab(`${id}-orig`);
  const b = await grab(`${id}-wrapped`);
  console.log(`\n########## ${id}  页面总高 orig=${a.pageH} wrapped=${b.pageH} ${a.pageH === b.pageH ? '(相同)' : '(不同!)'}`);
  for (const y of Object.keys(a.shots)) console.log(`  scrollY ${String(y).padEnd(5)} ${a.shots[y].slice(0, 10)}  ${b.shots[y].slice(0, 10)}  ${a.shots[y] === b.shots[y] ? '★ 逐字节相同' : '✗ 不同'}`);
}
await browser.close(); server.close();
