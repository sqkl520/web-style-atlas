#!/usr/bin/env node
/* 渲染层审计 · 第十六遍：把「本机到底有没有这个族 / 它能不能画汉字」用黄金方法测出来（2026-11-24）
 *
 * audit15 的 canvas 宽度探针有致命假阴性：SimSun 正是本机 CJK 的默认回退面，
 * 所以 '"SimSun", monospace' 与 'monospace' 同宽 → 被判「未安装」。
 * 本遍改用 CSS.getPlatformFontsForNode 直接问渲染器「这个族名的 span 实际由谁画的」：
 *   探针节点放进文档，逐族两段样本（LATIN / CJK），返回实际绘制族名与字形数。
 *   返回族名 ≈ 请求族名 → 本机有该族；否则 → 本机没有，落到了别处（记下落到了谁）。
 * 这同时给出「该族能否画汉字」：CJK 样本若由别的族绘制，说明该族无 CJK 字形。
 *
 * 分两次跑同一批案：
 *   MODE=open     不阻断 Google Fonts（复现 audit14 的天况）
 *   MODE=blocked  阻断 Google Fonts（_render-gate.mjs 用的可复现口径）
 * 两次的 h1 判定若不同，说明 audit14 的 WEB/FALLBACK 是网络天况的函数，不是产物属性。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MODE = process.env.MODE || 'open';
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
const LAT = 'AbCdEfGh1234';
const CJK = '修鞋配钥匙预约';
const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');
await pg.send('Network.enable');
if (MODE === 'blocked') {
  await pg.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*fonts.gstatic.font.im*'] });
}
let net = [];
browser.on(pg.sessionId, 'Network.responseReceived', (p) => {
  if (/fonts\.(googleapis|gstatic)/.test(p.response?.url || '')) net.push({ url: (p.response.url || '').slice(0, 60), status: p.response.status });
});

/* 逐族探测：单族 span（不加 generic 尾巴），分别测拉丁与汉字实际由谁绘制 */
async function probeFamily(family) {
  const r = await pg.eval(`(() => {
    const host = document.createElement('div');
    host.id = '__fontprobe';
    host.style.cssText = 'position:absolute;left:-99999px;top:0;font-size:40px;visibility:visible';
    const mk = (txt, fam) => {
      const s = document.createElement('span');
      s.textContent = txt;
      s.style.fontFamily = JSON.stringify(fam);   // 只写一个族名，不留 generic 尾巴
      return s;
    };
    const a = mk(${JSON.stringify(LAT)}, ${JSON.stringify(family)});
    const b = mk(${JSON.stringify(CJK)}, ${JSON.stringify(family)});
    host.appendChild(a); host.appendChild(b);
    document.body.appendChild(host);
    return true;
  })()`);
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const out = {};
  for (const [key, text] of [['latin', LAT], ['cjk', CJK]]) {
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: `#__fontprobe span:nth-child(${key === 'latin' ? 1 : 2})` });
    if (!q.nodeId) { out[key] = null; continue; }
    try {
      const f = (await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || [];
      out[key] = f.map((x) => ({ fam: x.familyName, glyphs: x.glyphCount, custom: !!x.isCustomFont }));
    } catch { out[key] = null; }
  }
  await pg.eval(`(() => { const h = document.getElementById('__fontprobe'); if (h) h.remove(); })()`);
  return out;
}

const rows = [];
for (const id of TASK) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  net = [];
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 400 });
  await pg.eval(`Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])`);
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const real = {};
  const wanted = new Set();
  for (const which of ['title', 'body']) {
    const sel = which === 'title' ? 'h1' : 'p';
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) { real[which] = null; continue; }
    const full = await pg.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? getComputedStyle(e).fontFamily : ''; })()`);
    let pf = [];
    try { pf = (await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || []; } catch {}
    const chain = chainOf(prompt, which);
    chain.forEach((c) => wanted.add(c));
    full.split(',').forEach((c) => { const t = c.replace(/["']/g, '').trim(); if (t) wanted.add(t); });
    pf.forEach((f) => wanted.add(f.familyName));
    real[which] = { fullDecl: full, platform: pf.map((f) => ({ fam: f.familyName, glyphs: f.glyphCount, custom: !!f.isCustomFont })), chain };
  }
  const probe = {};
  for (const fam of wanted) probe[fam] = await probeFamily(fam);
  rows.push({ id, net: net.slice(), real, probe });
  process.stderr.write(`  ${id}\n`);
}
await browser.close(); server.close();
const path = join(ROOT, `deliverables/78-northstar/_probe/_render-audit16-${MODE}.json`);
await writeFile(path, JSON.stringify(rows, null, 1));
console.log(`MODE=${MODE} → ${path}`);
for (const r of rows) {
  const t = r.real.title;
  console.log(`${r.id.padEnd(6)} h1=${t ? t.platform.map((p) => p.fam + ':' + p.glyphs + (p.custom ? 'W' : '')).join('+') : '-'}  net=${r.net.map((n) => n.status).join(',') || '无'}`);
}