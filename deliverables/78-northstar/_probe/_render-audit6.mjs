#!/usr/bin/env node
/* 渲染层审计 · 第六遍：结构判据的可见性（2026-11-22）
 *
 * score.mjs 的 ④ 结构数的是**源码里的标签个数**：
 *   `(html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length`
 * 它不区分「这个 <article> 用户看得见吗」。
 *
 * 这一遍对每个案：
 *   ① 按 score.mjs 实际选中的那个标签（gotTag），数「源码里几个 / 渲染后可见几个」；
 *   ② 断图（src 404）的元素盒子是否仍然占出面积 ——
 *      占不出面积就是"用户看到一个空洞"，而源码判据只数 <img> 个数。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const buf = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch { if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; } res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* score.mjs 实际选中的标签（取自 node score.mjs --all 的输出，2026-11-22 05:44 那一版） */
const GOT = {
  S01: 'article', S05: 'figure', S09: 'article', S13: 'article', S15: 'article',
  S17: 'section', S18: 'article', S19: 'article', S21: 'article', S22: 'article',
  S23: 'li', S24: 'article', S29: 'section', S31: 'article', S32: 'article',
  S34: 'article', 'S34-r2': 'article', S35: 'article',
};
const PINNED = Object.keys(GOT);

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });

const rows = [];
for (const id of PINNED) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  const html = await readFile(join(BT, id, 'index.html'), 'utf8');
  const tag = GOT[id];
  const srcCount = (html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
  const srcImg = (html.match(/<img[\s>]/g) || []).length;
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 700 });
  const r = await pg.eval(`(() => {
    const tag = ${JSON.stringify(tag)};
    const els = [...document.querySelectorAll(tag)];
    const vis = (e) => {
      const c = getComputedStyle(e);
      if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0) return false;
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const offscreen = (e) => {
      const b = e.getBoundingClientRect();
      return b.right <= 0 || b.left >= innerWidth || b.bottom <= 0;
    };
    const shown = els.filter(vis);
    const imgs = [...document.querySelectorAll('img')];
    const imgBox = imgs.map((i) => {
      const b = i.getBoundingClientRect();
      return { ok: i.complete && i.naturalWidth > 0, w: Math.round(b.width), h: Math.round(b.height),
               area: Math.round(b.width * b.height), alt: i.getAttribute('alt') || '' };
    });
    return {
      tag, total: els.length, visible: shown.length,
      offscreenVisible: shown.filter(offscreen).length,
      hiddenBy: {
        displayNone: els.filter((e) => getComputedStyle(e).display === 'none').length,
        zeroBox: els.filter((e) => { const b = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && b.width * b.height === 0; }).length,
        opacity0: els.filter((e) => parseFloat(getComputedStyle(e).opacity) === 0).length,
      },
      imgBox,
    };
  })()`);
  rows.push({ id, srcCount, srcImg, ...r });
  process.stderr.write(`  ${id} ${tag} ${r.total}→${r.visible}\n`);
}
await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit6.json');
await writeFile(path, JSON.stringify(rows, null, 1));

console.log('\n== ④ 结构：源码标签数 vs 渲染后可见数 ==');
for (const r of rows) {
  const bad = r.total !== r.visible ? '  ← 不一致' : '';
  console.log(`${r.id.padEnd(6)} <${r.tag}>: 源码 ${String(r.srcCount).padStart(2)} / DOM ${String(r.total).padStart(2)} / 可见 ${String(r.visible).padStart(2)}` +
    `  (display:none ${r.hiddenBy.displayNone}, 零盒 ${r.hiddenBy.zeroBox}, opacity0 ${r.hiddenBy.opacity0})${bad}`);
}
console.log('\n== 图片：源码 <img> 数 vs 实际解码成功数 vs 占位面积 ==');
for (const r of rows) {
  const ok = r.imgBox.filter((b) => b.ok).length;
  const zero = r.imgBox.filter((b) => b.area === 0).length;
  const areas = r.imgBox.map((b) => b.w + 'x' + b.h).join(' ');
  console.log(`${r.id.padEnd(6)} 源码 ${r.srcImg} → 解码 ${ok}  零面积 ${zero}  盒子 ${areas || '-'}`);
}
console.log('\nJSON → ' + path);
