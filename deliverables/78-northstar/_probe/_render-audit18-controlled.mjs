#!/usr/bin/env node
/* 渲染层审计 · 第十八遍：受控实验——只改字体链，别的一律不动（2026-11-24）
 *
 * 观察研究里「链长」和「链上有没有本机可用族」完全混杂（链长≥3 且链上有本机CJK族 = 0 案），
 * 无法用统计拆开。这里做真实验：把真实产物的 h1 字体声明替换成几组**只差一个维度**的链，
 * 其余 CSS/DOM 逐字节不变，直接量浏览器画了谁。
 *
 * 每个案（S13 生成体、S01 无衬线体）跑这些臂：
 *   A 原链              —— 基线的长度/成员
 *   B 原链 + 2 个未装族 —— 只加长，成员性质不变（全不可用）
 *   C 原链 + 2 个已装族 —— 加长，且引入本机可用成员
 *   D 只留 1 个已装族   —— 最短，但成员可用
 *   E 只留 1 个未装族   —— 最短，成员不可用
 * 若「换字」跟着长度走 → A≒B 且 C≒D（换）；若跟着成员走 → A≒B≒E（换）且 C≒D（不换）。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': MIME[extname(req.url)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* 臂定义：{标签, 用于替换的 font-family 值, 链长, 是否含本机可用CJK族} */
const ARMS = [
  { k: 'A', label: '原链（2，全不可用）', decl: '"EB Garamond","Noto Serif SC",serif', len: 2, avail: false },
  { k: 'B', label: '加长到 4（仍全不可用）', decl: '"EB Garamond","Noto Serif SC","Spectral","Petrona",serif', len: 4, avail: false },
  { k: 'C', label: '加长到 4（末位塞 SimSun）', decl: '"EB Garamond","Noto Serif SC","Spectral","SimSun",serif', len: 4, avail: true },
  { k: 'D', label: '最短 1（只 SimSun）', decl: 'SimSun,serif', len: 1, avail: true },
  { k: 'E', label: '最短 1（只 EB Garamond）', decl: '"EB Garamond",serif', len: 1, avail: false },
  { k: 'F', label: '最短 1（只 Noto Sans SC，已装）', decl: '"Noto Sans SC",serif', len: 1, avail: true },
  { k: 'G', label: '原链但首族换成已装 Noto Sans SC', decl: '"Noto Sans SC","Source Han Sans SC",serif', len: 2, avail: true },
];

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');
await pg.send('Network.enable');
await pg.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*fonts.gstatic.font.im*'] });
/* 用 data: 页承载，只塞一个 h1，字体声明由臂决定：把 DOM/CSS 噪音全部消掉，
 * 这样测到的只有「这条链会画成什么」。 */
const out = [];
for (const id of ['S13', 'S01']) {
  const src = await readFile(join(BT, id, 'index.html'), 'utf8');
  /* 取真实 h1 文本，保留真实字号/字重之外的一切都清掉 */
  const h1m = src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const h1 = (h1m ? h1m[1] : '修鞋与配钥匙预约').replace(/<br\s*\/?>/gi, ' ');
  for (const arm of ARMS) {
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}
h1{margin:0;padding:20px;font-size:64px;line-height:1.1;font-weight:400;font-family:${arm.decl}}</style>
</head><body><h1 id="t">${h1.replace(/<[^>]+>/g, '')}</h1></body></html>`;
    const url = `http://127.0.0.1:${PORT}/__arm.html?_=${encodeURIComponent(id + arm.k)}`;
    /* 走 data: URL 不行（相对路径/CSS 无所谓），用临时文件更稳 */
    const tmp = join(ROOT, `deliverables/78-northstar/_probe/__arm-${id}-${arm.k}.html`);
    await writeFile(tmp, html);
    await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_probe/__arm-${id}-${arm.k}.html`, { settleMs: 200 });
    const doc = await pg.send('DOM.getDocument', { depth: -1 });
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#t' });
    let pf = [];
    try { pf = (await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || []; } catch {}
    const real = pf.map((f) => ({ fam: f.familyName, glyphs: f.glyphCount, custom: !!f.isCustomFont }));
    const first = real.length ? real[0].fam : '(无)';
    out.push({ id, ...arm, real, first, switched: !/EB Garamond|EBGaramond|Noto Sans SC$/i.test(first) || (arm.k === 'A' || arm.k === 'B' || arm.k === 'E') });
  }
}
await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit18-controlled.json');
await writeFile(path, JSON.stringify(out, null, 1));

console.log('案    臂  链长 含可用  实际绘制                       换到链外?');
for (const r of out) {
  const disp = r.real.map((x) => x.fam + ':' + x.glyphs + (x.custom ? 'W' : '')).join(' + ') || '(空)';
  const chainNorms = r.decl.split(',').map((s) => s.replace(/["']/g, '').trim().toLowerCase());
  const onChain = r.real.every((x) => chainNorms.some((c) => c === x.fam.toLowerCase() || x.fam.toLowerCase().startsWith(c)));
  console.log(`${r.id.padEnd(6)}${r.k}   ${String(r.len).padEnd(4)} ${String(r.avail).padEnd(7)} ${disp.padEnd(32)} ${onChain ? '否（在链上）' : '★是（链外）'}`);
}
console.log('\nJSON → ' + path);