#!/usr/bin/env node
/* 渲染层审计 · 第十五遍：给「链长 vs 换字」这张交叉表先做测量有效性检查（2026-11-24）
 *
 * audit14 给出 tally 可复现，但有三处会让统计变成假象，本遍只补这三项，不改判据：
 *   V1 网络：本机 curl 到 fonts.googleapis.com 返回 000，但 audit14 里 5 个 @import 案报 isWeb=true。
 *      若 webfont 是靠 127.0.0.1:7897 代理偶然加载的，则 GENERIC 是天况而不是链长。
 *      逐案记录字体请求 URL + 状态码 + 是否 fromDiskCache。
 *   V2 glyphCount：audit14 把同一元素的多个平台字体压平成族名数组，丢掉了「谁画了多少字」。
 *      S17 正文 real=[Noto Serif SC ExtraLight, SimSun]，必须知道是 10:1 还是 1:10。
 *   V3 本机是否有这个族：逐链成员做 canvas 宽度差检测（X,monospace 与 monospace 同宽 → 本机无 X），
 *      用来区分「链长不够」和「链上根本没有可用的字」。
 * 另外补 fullDecl（audit14 把 decl 截到 60 字符，S24 的声明链在 JSON 里是被切断的）。
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
await pg.send('Network.enable');

/* 网络：只记字体域，别的噪音不进来 */
let net = [];
const off = browser.on(pg.sessionId, 'Network.responseReceived', (p) => {
  const u = p.response?.url || '';
  if (/fonts\.(googleapis|gstatic)/.test(u)) {
    net.push({ url: u.slice(0, 110), status: p.response.status, disk: !!p.response.fromDiskCache,
      type: p.response.mimeType });
  }
});
const offFail = browser.on(pg.sessionId, 'Network.loadingFailed', (p) => {
  net.push({ failed: true, err: p.errorText, id: p.requestId });
});

const rows = [];
for (const id of TASK) {
  if (!existsSync(join(BT, id, 'index.html'))) continue;
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  net = [];
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 400 });
  await pg.eval(`Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))])`);
  const fontsState = await pg.eval(`(() => {
    const out = [];
    document.fonts.forEach((f) => out.push({ family: f.family, status: f.status, src: f.src && f.src.slice(0, 60) }));
    return out;
  })()`);
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const body = {};
  const probeFamilies = new Set();
  for (const which of ['title', 'body']) {
    const sel = which === 'title' ? 'h1' : 'p';
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) { body[which] = null; continue; }
    const full = await pg.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)});
      return e ? getComputedStyle(e).fontFamily : ''; })()`);
    let pf = [];
    try { pf = (await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || []; } catch {}
    for (const f of pf) probeFamilies.add(f.familyName);
    const chain = chainOf(prompt, which);
    for (const c of chain) probeFamilies.add(c);
    for (const c of full.split(',')) probeFamilies.add(c.replace(/["']/g, '').trim());
    body[which] = {
      fullDecl: full,
      platform: pf.map((f) => ({ family: f.familyName, glyphs: f.glyphCount, custom: !!f.isCustomFont })),
      chain,
    };
  }
  /* V3 本机是否装了某个族：canvas 宽度差。CJK 用汉字串，拉丁用大写字串，两者都量，取任一不同即算有 */
  const fams = [...probeFamilies].filter(Boolean);
  const avail = await pg.eval(`(() => {
    const fams = ${JSON.stringify(fams)};
    const cv = document.createElement('canvas').getContext('2d');
    const LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const CJK = '修鞋配钥匙预约登记北街缝纫铺子';
    const w = (f, s) => { cv.font = '72px ' + JSON.stringify(f) + ', monospace'; return cv.measureText(s).width; };
    const base = { lat: w('monospace', LAT), cjk: w('monospace', CJK) };
    const out = {};
    for (const f of fams) {
      /* 与两种通用基线比：任一不同 → 该族在本机有字形 */
      const dl = Math.abs(w(f, LAT) - base.lat) > 0.5;
      const dc = Math.abs(w(f, CJK) - base.cjk) > 0.5;
      out[f] = { latinDiff: dl, cjkDiff: dc, installed: dl || dc };
    }
    return out;
  })()`);
  rows.push({ id, net: net.slice(), fontsState, body, avail });
  process.stderr.write(`  ${id}\n`);
}
off(); offFail();
await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit15.json');
await writeFile(path, JSON.stringify(rows, null, 1));

console.log('\n案     字体网络请求                                            已加载FontFace          h1 平台字体(族:字数:web)');
for (const r of rows) {
  const n = r.net.filter((x) => !x.failed);
  const f = r.net.filter((x) => x.failed);
  const nsum = n.length ? n.map((x) => x.status + (x.disk ? 'D' : '')).join(',') : (f.length ? 'FAILED:' + f[0].err : '无请求');
  const ff = r.fontsState.map((x) => x.family + ':' + x.status).join(' ');
  const t = r.body.title;
  const plat = t ? t.platform.map((p) => `${p.family}:${p.glyphs}${p.custom ? ':web' : ''}`).join(' + ') : '-';
  console.log(`${r.id.padEnd(6)} ${nsum.padEnd(56)} ${(ff || '-').slice(0, 40).padEnd(40)} ${plat}`);
}
console.log('\n本机字形可得性（installed=canvas 宽度与 monospace 基线不同）');
for (const r of rows) {
  const parts = [];
  for (const [k, v] of Object.entries(r.avail)) parts.push(`${k}=${v.installed ? 'Y' : 'n'}`);
  console.log(`  ${r.id.padEnd(6)} ${parts.join('  ')}`);
}
console.log('\nJSON → ' + path);