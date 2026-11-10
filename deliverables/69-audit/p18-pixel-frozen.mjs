// 排除动效时序干扰后重比像素：先 prefers-reduced-motion + 停掉所有动画，再截图。
import { writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const BASE = resolve('D:/Web/style/deliverables/69-audit/exp2');
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
await new Promise((r) => server.listen(8851, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });

const grab = async (variant) => {
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false, reducedMotion: true });
  await p.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await p.goto(`http://127.0.0.1:8851/${variant}/index.html`, { timeoutMs: 30000, settleMs: 900 });
  await p.eval('document.fonts.ready.then(() => true)');
  await sleep(2000);
  // 冻结动画与过渡，并强制所有 is-pressed / is-pinned 状态一致
  await p.eval(`(() => {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
    document.head.appendChild(s);
    for (const a of document.getAnimations ? document.getAnimations() : []) { try { a.finish(); } catch {} }
    return true;
  })()`);
  await sleep(600);
  const shots = {};
  for (const y of [0, 900, 1800, 2700, 3600]) {
    await p.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
    await sleep(700);
    const b = await p.screenshot({ format: 'png' });
    shots[y] = createHash('sha256').update(b).digest('hex');
  }
  await p.close();
  return shots;
};
const a = await grab('orig');
const b = await grab('wrapped');
await browser.close(); server.close();
console.log('冻结动效后的像素比对：');
for (const y of Object.keys(a)) console.log(`  scrollY ${String(y).padEnd(5)} orig ${a[y].slice(0, 10)}  wrapped ${b[y].slice(0, 10)}  ${a[y] === b[y] ? '★ 逐字节相同' : '✗ 不同'}`);
console.log(`\n相同 ${Object.keys(a).filter((y) => a[y] === b[y]).length} / 5 屏`);
