#!/usr/bin/env node
/* 渲染层闸门的最小可行原型（2026-11-22）
 *
 * 这是给 score.mjs 的"加一层渲染验证"的**可行性证明**，不是成品。
 * 只做四件读源码做不到的事，每条都给出「读数 + 与源码判据的差」：
 *
 *   G1 底色：body/html 的计算 backgroundColor 是否等于提示词的底色
 *   G2 正文字号：字数加权的实渲染字号（不是 body 声明值）
 *   G3 可见条目：score.mjs 选中的标签里，真正可见（有盒、不透明、不在屏外）的有几个
 *   G4 字体：h1 的实际平台字体是否落在提示词链上（四态：WEB/FIRST-OK/FALLBACK/GENERIC）
 *
 * 成本目标：单案一次导航 + 一次 evaluate，不截整页图。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': MIME[extname(req.url)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch { if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; } res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const TASK = ['S01', 'S05', 'S09', 'S13', 'S15', 'S17', 'S18', 'S19', 'S21',
  'S22', 'S23', 'S24', 'S29', 'S31', 'S32', 'S34', 'S34-r2', 'S35'];
const TAGS = { S01: 'article', S05: 'figure', S09: 'article', S13: 'article', S15: 'article',
  S17: 'section', S18: 'article', S19: 'article', S21: 'article', S22: 'article',
  S23: 'li', S24: 'article', S29: 'section', S31: 'article', S32: 'article',
  S34: 'article', 'S34-r2': 'article', S35: 'article' };

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');
/* 阻断外部字体请求：本机 fonts.googleapis.com 不可达，不阻断时每个 @import 要等
 * 25s 的导航超时（实测 S34/S34-r2/S35）。阻断后单案 0.4s。
 * 这同时让测量**可复现**：否则渲染取决于跑的时候网通不通。 */
await pg.send('Network.enable');
await pg.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*fonts.gstatic.font.im*'] });

const t0 = Date.now();
const rows = [];
for (const id of TASK) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  const bgM = prompt.match(/页面底色[^。]*?用\s*(#[0-9A-Fa-f]{6})/);
  const wantBg = bgM ? bgM[1].toUpperCase() : null;
  const bodyM = prompt.match(/正文约\s*(\d+)px/);
  const s = Date.now();
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 250 });
  const r = await pg.eval(`(() => {
    const px = (v) => parseFloat(v) || 0;
    const hex = (v) => { const m = String(v).match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
      const p = m[1].split(',').map(Number); if (p.length > 3 && p[3] === 0) return null;
      return '#' + p.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase(); };
    /* G1 */
    const bg = { html: hex(getComputedStyle(document.documentElement).backgroundColor),
                 body: hex(getComputedStyle(document.body).backgroundColor) };
    /* G2 字数加权正文 */
    let chars = 0, sum = 0;
    for (const el of document.querySelectorAll('body *')) {
      const c = getComputedStyle(el);
      if (c.display === 'none' || c.visibility === 'hidden') continue;
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\\s/g, '');
      if (!t) continue;
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
      chars += t.length; sum += t.length * px(c.fontSize);
    }
    /* G3 可见条目：用调用方给的标签 */
    const tag = ${JSON.stringify(TAGS[id])};
    const items = [...document.querySelectorAll(tag)];
    const visItems = items.filter((e) => {
      const c = getComputedStyle(e);
      if (c.display === 'none' || c.visibility === 'hidden') return false;
      if (px(c.opacity) < 0.05) return false;
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    }).length;
    /* G4 h1 声明链 */
    const h1 = document.querySelector('h1');
    return { bg, bodyWeighted: chars ? Math.round(sum / chars * 10) / 10 : 0,
             itemsTotal: items.length, itemsVisible: visItems,
             h1Chain: h1 ? getComputedStyle(h1).fontFamily : null,
             titlePx: h1 ? px(getComputedStyle(h1).fontSize) : 0 };
  })()`);
  /* G4 平台字体要单独一次 CDP 调用 */
  let real = [], isWeb = false;
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'h1' });
  if (q.nodeId) {
    try {
      const f = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
      real = (f.fonts || []).map((x) => x.familyName);
      isWeb = (f.fonts || []).some((x) => x.isCustomFont);
    } catch {}
  }
  const ms = Date.now() - s;
  rows.push({ id, wantBg, ...r, real, isWeb, ms });
  process.stderr.write(`  ${id} ${ms}ms\n`);
}
await browser.close(); server.close();
const total = Date.now() - t0;

console.log('\n案    底色(要/渲)         正文加权  条目(总/可见)  标题   h1 实际字体');
for (const r of rows) {
  const bgOk = r.wantBg ? ((r.bg.body === r.wantBg || r.bg.html === r.wantBg) ? 'OK' : 'XX') : '-';
  console.log(`${r.id.padEnd(6)} ${String(r.wantBg).padEnd(8)}/${String(r.bg.body).padEnd(8)} ${bgOk.padEnd(3)} ${String(r.bodyWeighted).padStart(7)}  ${String(r.itemsTotal + '/' + r.itemsVisible).padStart(11)}  ${String(r.titlePx).padStart(4)}  ${r.real.join('+') || '-'}${r.isWeb ? '(web)' : ''}`);
}
const avg = rows.reduce((s, r) => s + r.ms, 0) / rows.length;
console.log(`\n单案均耗时 ${Math.round(avg)}ms（含导航 250ms）  总 ${(total / 1000).toFixed(1)}s / ${rows.length} 案`);
