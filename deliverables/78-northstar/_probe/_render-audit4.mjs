#!/usr/bin/env node
/* 渲染层审计 · 第四遍：等 document.fonts.ready 之后再量字体（2026-11-22）
 *
 * 第三遍在 settleMs=500 时量，实测有两案 `document.fonts.status === 'loading'`，
 * 说明「字体不一致」这个结论至少有一部分是**测量时机**造成的。
 * 一个渲染闸门如果不等 fonts.ready，就会把「还没加载完」报成「用错了字体」——
 * 那正是本仓库反复出现的「判据自己坏了」。
 *
 * 这一遍：goto → 等 fonts.ready（上限 8s）→ 再取平台字体，与第三遍对照。
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

const PINNED = ['S01', 'S05', 'S09', 'S13', 'S15', 'S17', 'S18', 'S19', 'S21',
  'S22', 'S23', 'S24', 'S29', 'S31', 'S32', 'S34', 'S34-r2', 'S35'];
const ids = (process.argv.slice(2).length ? process.argv.slice(2) : PINNED)
  .filter((id) => existsSync(join(BT, id, 'index.html')));

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');

const rows = [];
for (const id of ids) {
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 300 });
  const t0 = Date.now();
  const status = await pg.eval(`Promise.race([
    document.fonts.ready.then(() => 'ready'),
    new Promise((r) => setTimeout(() => r('timeout'), 8000)),
  ])`);
  const waited = Date.now() - t0;
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const picks = await pg.eval(`(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null;
      const t = (e.textContent || '').trim(); if (!t) return null;
      return { sel: s, decl: getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim() }; };
    return [g('h1'), g('p')].filter(Boolean);
  })()`);
  const items = [];
  for (const p of picks) {
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: p.sel });
    if (!q.nodeId) continue;
    try {
      const f = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
      const fams = (f.fonts || []).map((z) => z.familyName);
      items.push({ ...p, real: fams.join('+') || '(none)', hit: fams.some((x) => x === p.decl) });
    } catch { items.push({ ...p, real: 'ERR' }); }
  }
  const nFonts = await pg.eval(`document.fonts.size`);
  rows.push({ id, status, waited, nFonts, items });
  process.stderr.write(`  ${id} ${status} ${waited}ms\n`);
}

await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit4.json');
await writeFile(path, JSON.stringify(rows, null, 1));

console.log('\n== 等 fonts.ready 之后的字体对照 ==');
let mism = 0, h1mism = 0;
for (const r of rows) {
  const h1 = r.items.find((i) => i.sel === 'h1');
  if (h1 && !h1.hit) h1mism++;
  if (r.items.some((i) => !i.hit)) mism++;
  console.log(`${r.id.padEnd(6)} fonts.${r.status.padEnd(7)} ${String(r.waited).padStart(5)}ms size=${String(r.nFonts).padStart(3)}  ` +
    r.items.map((i) => `${i.sel}:"${i.decl}"→${i.real}${i.hit ? '' : ' ✗'}`).join('   '));
}
console.log(`\nh1 首族不一致 ${h1mism}/${rows.length} 案；任一元素不一致 ${mism}/${rows.length} 案`);
console.log('JSON → ' + path);
