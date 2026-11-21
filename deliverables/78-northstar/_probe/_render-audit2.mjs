#!/usr/bin/env node
/* 渲染层审计 · 第二遍（2026-11-22）
 *
 * 第一遍（_render-audit.mjs）量的是「1440×900 一档下的计算样式」。
 * 这一遍补三件第一遍量不到、但同样属于"源码字符串 ≠ 用户看到的东西"的事：
 *
 *   ① 视口相关：clamp(vw) 的字号在 1280/1440/1920 三档会算出不同的值。
 *      源码判据把 clamp 取 max —— 那只在宽视口成立。
 *   ② 字体可用性：document.fonts.check() 逐族判定「这个字体到底在不在」，
 *      并与原型（自托管 ../_fonts/）对照 —— 原型与产物的字体基线是否一致。
 *   ③ 屏幕外元素：position:fixed/absolute 被推出视口的可见元素。
 *
 * 另附：断开網路时的字体请求统计（本机实测 fonts.googleapis.com 不可达）。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf',
};
const requests = { font: 0, fontOk: 0, fontFail: 0, img: 0, imgFail: 0, external: [] };
const netFails = new Set();
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    if (/\/favicon\.ico$/.test(rel)) { res.writeHead(204); res.end(); return; }
    netFails.add(rel);
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d/.test(d.name))
      .map((d) => d.name).filter((id) => existsSync(join(BT, id, 'index.html'))).sort();

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.send('DOM.enable');
await pg.send('CSS.enable');
await pg.send('Network.enable');
pg.browser.on(pg.sessionId, 'Network.requestWillBeSent', (p) => {
  const u = p.request.url;
  if (/^https?:/.test(u) && !/127\.0\.0\.1/.test(u)) requests.external.push(u.split('?')[0]);
});
pg.browser.on(pg.sessionId, 'Network.loadingFailed', (p) => { netFails.add('NETFAIL:' + (p.errorText || '?')); });

const VIEWPORTS = [[1280, 800], [1440, 900], [1920, 1080]];
const rows = [];

for (const id of ids) {
  const t0 = Date.now();
  const perVp = {};
  for (const [w, h] of VIEWPORTS) {
    await pg.setViewport({ width: w, height: h });
    await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 450 });
    perVp[w] = await pg.eval(`(() => {
      const px = (v) => parseFloat(v) || 0;
      const h1 = document.querySelector('h1');
      const h1s = h1 ? px(getComputedStyle(h1).fontSize) : 0;
      /* 全页最大的"实际字号"：只看有自己文字节点的元素 */
      let max = 0;
      for (const el of document.querySelectorAll('*')) {
        const c = getComputedStyle(el);
        if (c.display === 'none' || c.visibility === 'hidden') continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height === 0) continue;
        max = Math.max(max, px(c.fontSize));
      }
      /* 屏幕外：右/左溢出视口超过一屏宽度的可见元素 */
      let offRight = 0, offLeft = 0;
      for (const el of document.querySelectorAll('body *')) {
        const c = getComputedStyle(el);
        if (c.display === 'none' || c.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height === 0) continue;
        if (r.left >= innerWidth) offRight++;
        if (r.right <= 0) offLeft++;
      }
      return { h1: h1s, max, offRight, offLeft,
               docH: document.documentElement.scrollHeight,
               hOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    })()`);
  }
  /* 字体可用性：把 body/h1 链上每一族拿去问 document.fonts.check */
  await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 450 });
  const fonts = await pg.eval(`(async () => {
    const fams = new Set();
    for (const el of document.querySelectorAll('body, h1, p, .mono, code, pre, .num, .price')) {
      const c = getComputedStyle(el); if (!c.fontFamily) continue;
      for (const p of c.fontFamily.split(',')) {
        const n = p.trim().replace(/^["']|["']$/g, '');
        if (n && !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|inherit|initial)$/.test(n)) fams.add(n);
      }
    }
    const out = {};
    for (const f of fams) {
      try { out[f] = document.fonts.check('16px "' + f.replace(/"/g, '') + '"'); }
      catch (e) { out[f] = 'ERR'; }
    }
    return { status: document.fonts.status, size: document.fonts.size, check: out };
  })()`);
  rows.push({ id, perVp, fonts, ms: Date.now() - t0 });
  process.stderr.write(`  ${id} ${Date.now() - t0}ms\n`);
}

/* ── 基线：原型（自托管字体）与产物同类测量 ─────────────────────────── */
const BASE = ['S18-fluorescent-repair-bench', 'S01-red-wedge-broadsheet', 'S24-cyanotype-forest-path'];
const baseline = [];
for (const name of BASE) {
  const p = join(ROOT, 'prototypes', name, 'index.html');
  if (!existsSync(p)) { baseline.push({ name, err: 'no index.html' }); continue; }
  await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${PORT}/prototypes/${name}/index.html`, { settleMs: 1200 });
  const b = await pg.eval(`(async () => {
    const el = document.querySelector('h1');
    const ff = el ? getComputedStyle(el).fontFamily : '';
    const first = ff.split(',')[0].replace(/^["']|["']$/g, '').trim();
    const ok = first ? document.fonts.check('16px "' + first + '"') : null;
    return { ff, first, check: ok, fontsStatus: document.fonts.status, loaded: document.fonts.size };
  })()`);
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'h1' });
  let platform = null;
  if (q.nodeId) {
    try {
      const f = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
      platform = (f.fonts || []).map((z) => z.familyName + (z.isCustomFont ? '(自定义)' : ''));
    } catch {}
  }
  baseline.push({ name, ...b, platform });
}

await browser.close();
server.close();

const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit2.json');
await writeFile(path, JSON.stringify({ rows, baseline, requests, netFails: [...netFails].slice(0, 40) }, null, 1));

console.log('\n== ① 标题字号随视口（源码判据取 clamp 的 max） ==');
console.log('案      h1@1280  h1@1440  h1@1920   全页最大@1280  源码说的');
for (const r of rows) {
  console.log(`${r.id.padEnd(6)} ${String(r.perVp[1280].h1).padStart(7)}  ${String(r.perVp[1440].h1).padStart(7)}  ${String(r.perVp[1920].h1).padStart(7)}   ${String(r.perVp[1280].max).padStart(11)}    (见 score.mjs)`);
}
console.log('\n== ② 字体可用性（document.fonts.check，在产物页面里问） ==');
for (const r of rows) {
  const missing = Object.entries(r.fonts.check).filter(([, v]) => v === false).map(([k]) => k);
  console.log(`${r.id.padEnd(6)} status=${r.fonts.status} 声明族 ${Object.keys(r.fonts.check).length} 不可用 ${missing.length}` +
    (missing.length ? '：' + missing.slice(0, 6).join(', ') : ''));
}
console.log('\n== ③ 屏幕外元素 ==');
for (const r of rows) {
  const any = VIEWPORTS.map(([w]) => r.perVp[w].offRight + r.perVp[w].offLeft);
  console.log(`${r.id.padEnd(6)} 1280:${any[0]} 1440:${any[1]} 1920:${any[2]}  横向溢出 ${VIEWPORTS.map(([w]) => r.perVp[w].hOverflow ? 'Y' : '.') .join('')}`);
}
console.log('\n== ④ 基线：原型（自托管 ../_fonts/） ==');
for (const b of baseline) {
  console.log(`${b.name || b.err}  h1 首族=${b.first}  check=${b.check}  平台实际=${JSON.stringify(b.platform)}  fonts.size=${b.loaded}`);
}
console.log(`\n外部请求（去重前 ${requests.external.length}）：` + [...new Set(requests.external)].slice(0, 8).join('\n  '));
console.log(`\n本地 404 种类 ${netFails.size}，样本：` + [...netFails].slice(0, 6).join(' '));
console.log('JSON → ' + path);
