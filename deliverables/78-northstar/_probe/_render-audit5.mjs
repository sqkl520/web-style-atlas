#!/usr/bin/env node
/* 渲染层审计 · 第五遍：把「实际用的字体」对照「提示词给的字体链」逐案归类（2026-11-22）
 *
 * 第五遍存在的理由：第四遍量出「16/18 案 h1 声明的首族 ≠ 实际用的族」。
 * 但这个数字本身**不足以定罪** —— 提示词原文写的是
 *   「标题按这个顺序取第一个可用的：A → B（前一个缺字就用下一个）」
 * 也就是说：退回链上的第二名是**照做**，不是失败。
 *
 * 真正要判的是三件事，三件都读源码看不出来：
 *   ① actual 是不是链上某一位（不是 → 跳链了，这才是缺陷）
 *   ② 跳到哪里去了（System 默认无衬线 / 某个链外字体）
 *   ③ 网页字体到底有没有加载成功（isCustomFont true = 我们自己声明的 face 生效了）
 *
 * 归类：FIRST（首位命中）/ CHAIN（链上后续位）/ GENERIC（落到通用族）/
 *       OUTSIDE（链外，真缺陷）/ UNKNOWN（提示词没给这条链）
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

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace']);
const norm = (s) => String(s).replace(/\s+/g, '').replace(/["']/g, '').toLowerCase();

/* 从提示词里取标题链 / 正文档（与 score.mjs 的锚点一致） */
function chainsFromPrompt(prompt) {
  const title = [];
  const body = [];
  const titleM = prompt.match(/(?:标题按这个顺序取第一个可用的|标题按序取)：([^（\n。]+)/);
  const bodyM = prompt.match(/正文同理，按序取：([^（\n。]+)/);
  if (titleM) for (const p of titleM[1].split('→')) { const n = p.trim(); if (n) title.push(n); }
  if (bodyM) for (const p of bodyM[1].split('→')) { const n = p.trim(); if (n) body.push(n); }
  return { title, body };
}

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
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  const { title, body } = chainsFromPrompt(prompt);
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 300 });
  await pg.eval(`Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))])`);
  const doc = await pg.send('DOM.getDocument', { depth: -1 });

  const picks = await pg.eval(`(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null;
      const t = (e.textContent || '').trim(); if (!t) return null;
      return { sel: s, chain: getComputedStyle(e).fontFamily }; };
    return [g('h1'), g('p')].filter(Boolean);
  })()`);

  const items = [];
  for (const p of picks) {
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: p.sel });
    if (!q.nodeId) continue;
    let fonts = [];
    try { fonts = (await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || []; } catch {}
    const real = fonts.map((f) => f.familyName);
    const isCustom = fonts.some((f) => f.isCustomFont);
    const res = { sel: p.sel, declChain: p.chain, real, isCustom };
    /* 归类：real 里每一个都拿去找它落在链的哪一位 */
    const chain = p.sel === 'h1' ? title : body;
    res.chain = chain;
    res.verdicts = real.map((r) => {
      const nr = norm(r);
      const idx = chain.findIndex((c) => norm(c) === nr || nr.startsWith(norm(c)) || norm(c).startsWith(nr));
      if (idx === 0) return { fam: r, v: 'FIRST' };
      if (idx > 0) return { fam: r, v: 'CHAIN#' + (idx + 1) + '(' + chain[idx] + ')' };
      if (GENERIC.has(nr)) return { fam: r, v: 'GENERIC' };
      return { fam: r, v: 'OUTSIDE' };
    });
    items.push(res);
  }
  rows.push({ id, titleChain: title, bodyChain: body, items });
  process.stderr.write(`  ${id}\n`);
}

await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit5.json');
await writeFile(path, JSON.stringify(rows, null, 1));

console.log('\n== h1 实际字体落在提示词链的哪一位 ==');
let outside = 0, chainOnly = 0, first = 0;
for (const r of rows) {
  const h1 = r.items.find((i) => i.sel === 'h1');
  if (!h1) continue;
  const v = h1.verdicts;
  const bad = v.some((x) => x.v === 'OUTSIDE');
  if (bad) outside++;
  else if (v.some((x) => x.v.startsWith('CHAIN#'))) chainOnly++;
  else if (v.length && v.every((x) => x.v === 'FIRST')) first++;
  console.log(`${r.id.padEnd(6)} 链[${r.titleChain.join(' → ') || '-'}]  实际[${h1.real.join('+') || '-'}]${h1.isCustom ? '(网页字体)' : ''}  → ${v.map((x) => x.v).join(', ')}`);
}
console.log(`\nh1：首位命中 ${first}；退到链上后续位 ${chainOnly}；链外 ${outside}；共 ${rows.length}`);

console.log('\n== p 实际字体落在链的哪一位 ==');
for (const r of rows) {
  const p = r.items.find((i) => i.sel === 'p');
  if (!p) continue;
  console.log(`${r.id.padEnd(6)} 链[${r.bodyChain.join(' → ') || '-'}]  实际[${p.real.join('+') || '-'}]${p.isCustom ? '(网页字体)' : ''}  → ${p.verdicts.map((x) => x.v).join(', ')}`);
}
console.log('\nJSON → ' + path);
