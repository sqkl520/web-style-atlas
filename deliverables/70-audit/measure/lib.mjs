// 共享脚手架：静态服务器 + CDP 浏览器 + 30 案清单 + 落盘。
// 不改任何 tracked 文件；只服务 D:/Web/style 下的既有文件，外加内存里的自检 fixture。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = 'D:/Web/style';
export const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = HERE;
export { sleep };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

// fixtures: Map<"/__fixture/x.html", "<html…>">，只存在于内存，不落盘。
export async function startServer(port, fixtures = new Map()) {
  const server = createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (fixtures.has(u)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fixtures.get(u));
      return;
    }
    const p = join(ROOT, u);
    if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
    try {
      const body = readFileSync(p);
      res.writeHead(200, { 'Content-Type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return server;
}

export function cases() {
  return readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
    .map((d) => ({ id: d.name.slice(0, 3), dir: d.name }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function launch() {
  return Browser.launch({ headless: true, width: 1440, height: 900 });
}

// 等字体真的就位再量：字体没到，字号层级和文字色面积都不可信。
export async function gotoStable(page, url, settleMs = 900) {
  await page.goto(url, { settleMs: 0, timeoutMs: 30000 });
  await page.eval(`(async () => {
    try { await document.fonts.ready; } catch (e) {}
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.fonts ? document.fonts.status : 'n/a';
  })()`).catch(() => {});
  await sleep(settleMs);
}

export function writeJson(name, obj) {
  mkdirSync(OUT, { recursive: true });
  const p = join(OUT, name);
  writeFileSync(p, JSON.stringify(obj, null, 1), 'utf8');
  return p;
}

export function readJson(name) {
  return JSON.parse(readFileSync(join(OUT, name), 'utf8'));
}

export function inject(fn, arg) {
  return '(' + fn.toString() + ')(' + JSON.stringify(arg === undefined ? null : arg) + ')';
}

// #RRGGBB 归一
export function hexOf(rgb) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return ('#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2])).toUpperCase();
}
