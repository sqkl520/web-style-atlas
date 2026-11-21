#!/usr/bin/env node
/* 渲染层审计 · 第七遍：区分「动画还没跑完」与「真的看不见」（2026-11-22）
 *
 * 第六遍量出 S18/S29/S32 的条目在 DOM 里 5 个、可见只有 1–2 个。
 * 但「可见 1 个」有两种完全不同的成因：
 *   (a) 入场动画 / 滚动揭示还没触发 —— 用户滚动后能看到，是行为，不是缺陷；
 *   (b) 结构真的塌了（零尺寸盒、被父容器裁掉）—— 用户永远看不到。
 *
 * 把两者混在一起报，就是本仓库第 5 类缺陷（判据与被测物共享盲区）的反面：
 * **把正常行为报成缺陷**。这一遍按时间序列量：0.3s / 1s / 3s，以及滚动到底之后。
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

const TARGETS = { S18: 'article.job', S29: 'section.chapter', S32: 'article' };

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });

const out = [];
for (const [id, sel] of Object.entries(TARGETS)) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 200 });
  const snap = () => pg.eval(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(sel)})];
    return els.map((e) => {
      const c = getComputedStyle(e);
      const b = e.getBoundingClientRect();
      return { op: Math.round(parseFloat(c.opacity) * 100) / 100, w: Math.round(b.width), h: Math.round(b.height),
               anim: c.animationName + '/' + c.animationPlayState, tr: c.transitionProperty.slice(0, 20) };
    });
  })()`);
  const t = {};
  t['0.3s'] = await snap();
  await new Promise((r) => setTimeout(r, 1000)); t['1.3s'] = await snap();
  await new Promise((r) => setTimeout(r, 2000)); t['3.3s'] = await snap();
  /* 滚到底再滚回顶：触发 IntersectionObserver */
  await pg.eval(`(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); })()`);
  await new Promise((r) => setTimeout(r, 600)); t.scrolled = await snap();
  out.push({ id, sel, t });
  process.stderr.write(`  ${id}\n`);
}
await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit7.json');
await writeFile(path, JSON.stringify(out, null, 1));

for (const r of out) {
  console.log(`\n== ${r.id}  ${r.sel}  (${r.t['0.3s'].length} 个) ==`);
  for (const [k, v] of Object.entries(r.t)) {
    const vis = v.filter((x) => x.op > 0 && x.w * x.h > 0).length;
    console.log(`  ${k.padEnd(8)} 可见 ${vis}/${v.length}  ` + v.map((x) => `op${x.op}(${x.w}x${x.h})`).join(' '));
  }
}
console.log('\nJSON → ' + path);
