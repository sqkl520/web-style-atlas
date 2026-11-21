#!/usr/bin/env node
/* 渲染层审计 · 第十三遍：两条可量化的余量（2026-11-22）
 *
 * ① clamp 的 vw 项在窄视口会吃掉标题倍数。提示词要求的是「最大标题 = 正文的 N 倍」，
 *    score.mjs 把 clamp 取 max —— 那只有宽视口成立。这里量出每案在 1280/1440/1920
 *    三档下「标题 / 正文字号」的真实倍数，与提示词要求对照。
 *
 * ② 图片：提示词要求「占出真实可见的面积与合适比例」。盲测产物全部引用不存在的
 *    images/占位-N.jpg（19/19 案解码成功数 = 0），所以 score.mjs 数到的 <img>
 *    在用户眼里是**破图图标**。这里量「渲染盒子宽高比」与「img 的 width/height 属性宽高比」
 *    的偏差 —— 偏差大 = 图会被拉伸；另外量破图是否仍占面积。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': MIME[extname(req.url)] || 'application/octet-stream' });
    res.end(buf);
  } catch { if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; } res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const TASK = ['S01', 'S05', 'S09', 'S13', 'S15', 'S17', 'S18', 'S19', 'S21',
  'S22', 'S23', 'S24', 'S29', 'S31', 'S32', 'S34', 'S34-r2', 'S35'];
const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();

const rows = [];
for (const id of TASK) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  const multM = prompt.match(/最大标题要压到正文的\s*([\d.]+)\s*倍/);
  const bodyM = prompt.match(/正文约\s*(\d+)px/);
  const per = {};
  for (const w of [1280, 1440, 1920]) {
    await pg.setViewport({ width: w, height: w === 1920 ? 1080 : w === 1280 ? 800 : 900 });
    await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 350 });
    per[w] = await pg.eval(`(() => {
      const px = (v) => parseFloat(v) || 0;
      const h1 = document.querySelector('h1');
      return { h1: h1 ? px(getComputedStyle(h1).fontSize) : 0,
               body: px(getComputedStyle(document.body).fontSize) };
    })()`);
  }
  await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 350 });
  const imgs = await pg.eval(`[...document.querySelectorAll('img')].map((i) => {
    const r = i.getBoundingClientRect();
    const aw = Number(i.getAttribute('width')) || 0, ah = Number(i.getAttribute('height')) || 0;
    return { boxAspect: r.height ? Math.round(r.width / r.height * 100) / 100 : null,
             attrAspect: (aw && ah) ? Math.round(aw / ah * 100) / 100 : null,
             area: Math.round(r.width * r.height), ok: i.complete && i.naturalWidth > 0,
             src: (i.getAttribute('src') || '').split('/').pop() };
  })`);
  rows.push({ id, wantMult: multM ? Number(multM[1]) : null, wantBody: bodyM ? Number(bodyM[1]) : null, per, imgs });
  process.stderr.write(`  ${id}\n`);
}
await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit13.json');
await writeFile(path, JSON.stringify(rows, null, 1));

console.log('== ① 标题/正文 的真实倍数（按渲染的 h1 ÷ 渲染的 body） ==');
console.log('案     要求倍数  1280       1440       1920      1280 是否达标');
for (const r of rows) {
  const f = (w) => (r.per[w].body ? (r.per[w].h1 / r.per[w].body) : 0);
  const ok1280 = r.wantMult != null ? Math.abs(f(1280) - r.wantMult) / r.wantMult <= 4 / (r.wantBody || 16) * 0 + (Math.abs(r.per[1280].h1 - r.wantBody * r.wantMult) <= 4 ? 1 : 0) : null;
  console.log(`${r.id.padEnd(6)} ${String(r.wantMult).padStart(6)}  ` +
    [1280, 1440, 1920].map((w) => `${f(w).toFixed(2)}(${r.per[w].h1}px)`.padEnd(11)).join('') +
    ` ${ok1280 === null ? '-' : ok1280 ? 'OK' : 'XX'}`);
}
console.log('\n== ② 图片：破图比例 + 盒子宽高比 vs 声明宽高比 ==');
for (const r of rows) {
  if (!r.imgs.length) { console.log(`${r.id.padEnd(6)} 无图`); continue; }
  const broken = r.imgs.filter((i) => !i.ok).length;
  const badAspect = r.imgs.filter((i) => i.boxAspect && i.attrAspect && Math.abs(i.boxAspect - i.attrAspect) / i.attrAspect > 0.08);
  console.log(`${r.id.padEnd(6)} 图 ${r.imgs.length}  破图 ${broken}  宽高比偏差>8% 的 ${badAspect.length}` +
    (badAspect.length ? '：' + badAspect.map((i) => `${i.src} 盒${i.boxAspect}/声明${i.attrAspect}`).join(' ') : '') +
    `  零面积 ${r.imgs.filter((i) => i.area === 0).length}`);
}
console.log('\nJSON → ' + path);
