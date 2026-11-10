// 执行轮共用：静态服务 + 浏览器 + 稳定化等待。
// 为什么不用 file://：CDP 下 file:// 与 Node 看到的磁盘视图可能不同，且 fetch()/相对资源行为不同。
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

export const ROOT = resolve('D:/Web/style');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
};

// base：要服务的站点根。默认仓库根（原型里的 ../_fonts/ 才取得到）。
// 端口：不写死。内核分配的随机端口可能落进 Chrome 的 restricted ports
// （实测拿到 5061 → net::ERR_UNSAFE_PORT，整轮在第一个案子上就崩），
// 所以自己在 9200–9999 里试，撞上占用就换一个。避开 Chrome 的 restricted 列表。
const CHROME_UNSAFE = new Set([6000, 6665, 6666, 6667, 6668, 6669, 6697]);
export async function serve(base = ROOT, port = 0) {
  const B = resolve(base);
  const server = createServer((req, res) => {
    try {
      let f = resolve(join(B, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (f !== B && !f.startsWith(B + sep)) { res.writeHead(403); return res.end('no'); }
      if (statSync(f).isDirectory()) f = join(f, 'index.html');
      res.writeHead(200, {
        'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream',
        'content-length': statSync(f).size,
        'cache-control': 'no-store',
      });
      createReadStream(f).pipe(res);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  if (port) {
    await new Promise((r, rej) => { server.once('error', rej); server.listen(port, '127.0.0.1', r); });
  } else {
    for (let p = 9211; ; p++) {
      if (CHROME_UNSAFE.has(p)) continue;
      try {
        await new Promise((r, rej) => { server.once('error', rej); server.listen(p, '127.0.0.1', r); });
        break;
      } catch (e) {
        if (e.code !== 'EADDRINUSE') throw e;
        server.removeAllListeners('error');
      }
    }
  }
  const actual = server.address().port;
  // rel 用 '/' 分隔（不要用 path.sep —— Windows 上是 '\\'，会把整串编码成一个段，
  // 实测导致 style.css 落到站点根、0 条规则、全部等宽判定落空）。逐段 encodeURIComponent。
  return { server, port: actual, url: (rel) => `http://127.0.0.1:${actual}/${String(rel).split(/[\\/]+/).filter(Boolean).map(encodeURIComponent).join('/')}` };
}

export async function openPage(browser, { width, height, mobile = false }) {
  const page = await browser.newPage({ width, height, dsf: 1, mobile });
  // 坑：launch({width,height}) 不切视口，必须显式 setViewport。
  await page.setViewport({ width, height, dsf: 1, mobile });
  return page;
}

// 坑：document.fonts.ready 之后布局还要 ~900ms 才稳；统一等 1500ms。
export async function settle(page, ms = 1500) {
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(ms);
  await page.eval('window.scrollTo({ top: 0, behavior: "instant" })').catch(() => {});
  await sleep(250);
}

// 冻结动效：让两次截图可比（不是"更好看"，是"可复现"）。
// 必须 before/after 用同一套冻结方式，否则比较无效。
export async function freeze(page) {
  await page.eval(`(() => {
    const s = document.createElement('style');
    s.id = '__freeze';
    s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;animation-delay:0s!important;transition-delay:0s!important;caret-color:transparent!important}';
    document.head.appendChild(s);
    if (document.getAnimations) for (const a of document.getAnimations()) { try { a.finish(); } catch {} }
    return true;
  })()`).catch(() => {});
  await sleep(500);
}

export { sleep, Browser, writeFileSync };
