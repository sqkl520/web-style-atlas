#!/usr/bin/env node
/* 渲染层审计 · 第十四遍：字体「到底是谁画的」逐案定案（2026-11-22）
 *
 * 前几遍留下三个互相矛盾的数字（10/18 链外、16/18 不一致、部分案 isCustomFont=true），
 * 原因是我把「链走完了落到通用族」和「拿到链外字体」混成了一类。
 * 这一遍把判据拆成四态，逐案给结论：
 *
 *   WEB      首族以 webfont 形式加载成功（isCustomFont=true 且族名匹配）→ 真按提示词渲染
 *   FIRST-OK 首族是系统已装字体（document.fonts.check 为 true，非 webfont）→ 真按提示词渲染
 *   FALLBACK 首族不可用，落到链上后续位（族名在链上）→ 合规回退（提示词允许"缺字就用下一个"）
 *   GENERIC  首族不可用，落到通用族（SimSun / Arial…）→ 链被跳过，用户看到的不是指定字体
 *
 * 同时记录「产物是否自带字体来源」：@font-face / @import Google Fonts / <link> 到自托管。
 * 这一列决定 GENERIC 该归咎于谁。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': MIME[extname(req.url)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch { if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; } res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const norm = (s) => String(s).replace(/\s+/g, '').replace(/["']/g, '').toLowerCase();
const GENERIC_REALMS = new Set(['simsun', 'simhei', 'nsimsun', 'microsoftyahei', 'msyh', 'dengxian',
  'arial', 'helvetica', 'timesnewroman', 'couriernew', 'georgia', 'songti', 'stsong', 'kaiti', 'fangsong']);

function chainOf(prompt, which) {
  const re = which === 'title'
    ? /(?:标题按这个顺序取第一个可用的|标题按序取)：([^（\n。]+)/
    : /正文同理，按序取：([^（\n。]+)/;
  const m = prompt.match(re);
  if (!m) return [];
  return m[1].split('→').map((s) => s.trim()).filter(Boolean);
}

const TASK = ['S01', 'S05', 'S09', 'S13', 'S15', 'S17', 'S18', 'S19', 'S21',
  'S22', 'S23', 'S24', 'S29', 'S31', 'S32', 'S34', 'S34-r2', 'S35'];
const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');

const rows = [];
for (const id of TASK) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  const html = await readFile(join(BT, id, 'index.html'), 'utf8');
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  const ships = {
    fontFace: (html.match(/@font-face/g) || []).length,
    googleImport: /@import\s+url\(\s*['"]?https?:\/\/fonts\.googleapis/.test(html) || /fonts\.googleapis/.test(html),
    selfHostedLink: /<link[^>]+_fonts\//.test(html),
    localSrc: (html.match(/src\s*:\s*local\(/g) || []).length,
  };
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 300 });
  await pg.eval(`Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))])`);
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const out = {};
  for (const [sel, which] of [['h1', 'title'], ['p', 'body']]) {
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) { out[which] = null; continue; }
    const decl = await pg.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? getComputedStyle(e).fontFamily : ''; })()`);
    const first = decl.split(',')[0].replace(/["']/g, '').trim();
    let platform = [];
    try { platform = (await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || []; } catch {}
    const real = platform.map((f) => f.familyName);
    const isWeb = platform.some((f) => f.isCustomFont);
    const chain = chainOf(prompt, which);
    let verdict;
    const realNorm = real.map(norm);
    const chainNorm = chain.map(norm);
    if (realNorm.length && realNorm.every((r) => chainNorm.some((c) => r === c || r.startsWith(c) || c.startsWith(r)))) {
      verdict = realNorm.some((r) => r === norm(first)) ? (isWeb ? 'WEB' : 'FIRST-OK') : 'FALLBACK';
    } else if (realNorm.every((r) => GENERIC_REALMS.has(r))) {
      verdict = 'GENERIC';
    } else {
      verdict = 'OUTSIDE';
    }
    out[which] = { decl: decl.slice(0, 60), first, real, isWeb, chain, verdict };
  }
  rows.push({ id, ships, out });
  process.stderr.write(`  ${id}\n`);
}
await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit14.json');
await writeFile(path, JSON.stringify(rows, null, 1));

console.log('案     自带字体来源                                  h1 判定      实际族                        p 判定');
for (const r of rows) {
  const s = r.ships;
  const src = [s.fontFace ? `@font-face×${s.fontFace}` : '', s.googleImport ? '@import(Google)' : '',
    s.selfHostedLink ? '<link self>' : '', s.localSrc ? `local()×${s.localSrc}` : ''].filter(Boolean).join(' ') || '无';
  const h = r.out.title, p = r.out.body;
  console.log(`${r.id.padEnd(6)} ${src.padEnd(44)} ${String(h && h.verdict).padEnd(11)} ${String(h && h.real.join('+')).slice(0, 28).padEnd(29)} ${p && p.verdict}`);
}
const tally = {};
for (const r of rows) { const v = r.out.title ? r.out.title.verdict : 'n/a'; tally[v] = (tally[v] || 0) + 1; }
console.log('\nh1 判定分布：' + JSON.stringify(tally));
const withSrc = rows.filter((r) => r.ships.fontFace || r.ships.googleImport || r.ships.selfHostedLink).map((r) => r.id);
const noSrc = rows.filter((r) => !(r.ships.fontFace || r.ships.googleImport || r.ships.selfHostedLink)).map((r) => r.id);
console.log('自带字体来源 ' + withSrc.length + ' 案：' + withSrc.join(' '));
console.log('零字体来源（只写名字）' + noSrc.length + ' 案：' + noSrc.join(' '));
console.log('\nJSON → ' + path);
