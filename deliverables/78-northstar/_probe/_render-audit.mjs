#!/usr/bin/env node
/* 渲染层审计（2026-11-22）
 *
 * 目的：把 `_blindtest/score.mjs` 的「读源码字符串」结论，与真浏览器里的
 * 「计算样式 / 实际用的字体 / 图片是否真的解码出来」逐项对照，量化盲区。
 *
 * 不改 score.mjs、不改 prototypes/ 下任何文件。只读。
 *
 * 用法：node deliverables/78-northstar/_probe/_render-audit.mjs [S18 S05 ...]
 * 输出：_probe/_render-audit.json + 控制台表格
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

/* 站点根 = 仓库根（与 74-q7/measure.mjs 同一取舍：原型要引 ../_fonts/）。
 * 404 一律记下来 —— 「字体 404 不报错、只静默回退」正是本审计要量的东西。 */
const missing = new Set();
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    if (/\/favicon\.ico$/.test(rel)) { res.writeHead(204); res.end(); return; }
    missing.add(rel);
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* 源码侧结论（与 score.mjs 同口径搬过来，只搬不改语义，便于对账） */
function sourceFacts(html, prompt) {
  const hexes = [...new Set((prompt.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()))];
  const bgM = prompt.match(/页面底色[^。]*?用\s*(#[0-9A-Fa-f]{6})/);
  const wantBg = bgM ? bgM[1].toUpperCase() : null;
  const varOf = {};
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) varOf[m[1]] = m[2].toUpperCase();
  const bgs = [...html.matchAll(/background(?:-color)?\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const bgUsed = wantBg ? bgs.some((v) => {
    const hs = (v.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase());
    const vs = [...v.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => varOf[m[1]]).filter(Boolean);
    return hs.includes(wantBg) || vs.includes(wantBg);
  }) : null;

  /* 字号：与 score.mjs 的 pxOf 一致（clamp 取 max，calc 求和，rem×16） */
  const pxOf = (expr) => {
    const v = String(expr).trim();
    const fn = v.match(/^(clamp|min|max)\(([\s\S]*)\)$/i);
    if (fn) { const a = fn[2].split(',').map((s) => pxOf(s)).filter((n) => n > 0); return a.length ? Math.max(...a) : 0; }
    const calc = v.match(/^calc\(([\s\S]*)\)$/i);
    if (calc) { const parts = [...calc[1].matchAll(/([+-]?)\s*([\d.]+)px/g)]; return parts.reduce((a, m) => a + (m[1] === '-' ? -1 : 1) * parseFloat(m[2]), 0); }
    const p2 = v.match(/^([\d.]+)px$/); if (p2) return parseFloat(p2[1]);
    const r = v.match(/^([\d.]+)(rem|em)$/); if (r) return parseFloat(r[1]) * 16;
    return 0;
  };
  const decls = [...html.matchAll(/font-size\s*:\s*([^;}]+)/g)].map((m) => pxOf(m[1])).filter((n) => n > 0);
  const bodyRule = html.match(/(?:^|\n)\s*body\s*\{([^}]*)\}/);
  const rootRule = html.match(/(?:^|\n)\s*:root\s*\{([^}]*)\}/);
  let srcBody = 0;
  if (bodyRule) srcBody = pxOf((bodyRule[1].match(/font-size\s*:\s*([^;}]+)/) || [])[1] || '');
  if (!srcBody && rootRule) srcBody = pxOf((rootRule[1].match(/font-size\s*:\s*([^;}]+)/) || [])[1] || '');
  const srcMaxTitle = decls.length ? Math.max(...decls) : null;

  /* 圆角：源码侧「声明了几条非 0」 */
  const radii = [...html.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const corners = (v) => v.replace(/!important/gi, '').trim().split(/\s+/).filter(Boolean);
  const isZero = (c) => /^0(px|em|rem|%)?$/i.test(c);
  const srcRadiusNonZero = radii.filter((v) => !corners(v).every(isZero));
  const hasRadiusRule = /圆角：全站一律\s*0/.test(prompt);

  /* 字体：提示词点名的族名（与 score.mjs 的 famLine 抽取一致） */
  const famLine = (prompt.match(/字体：[^\n]*(?:\n[^\n]*)*?(?=\n\s*(?:\d+\.|结构约束|$))/m) || [''])[0];
  const famNames = [...new Set((famLine.match(/[A-Z][A-Za-z ]{2,}(?=\s*(?:→|（|$|、))/g) || [])
    .map((s) => s.trim()).filter((s) => s && !/^[A-Z]$/.test(s)))];

  return { hexes, wantBg, bgUsed, srcBody, srcMaxTitle, radiiDeclared: radii.length,
           srcRadiusNonZero, hasRadiusRule, famNames };
}

const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d/.test(d.name))
      .map((d) => d.name).filter((id) => existsSync(join(BT, id, 'index.html'))).sort();

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');

const out = [];
for (const id of ids) {
  missing.clear();
  const html = await readFile(join(BT, id, 'index.html'), 'utf8');
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  const S = sourceFacts(html, prompt);
  const t0 = Date.now();
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 600 });

  /* 图片是否真的解码成功（源码里有 <img> ≠ 用户看到一张图） */
  const img = await pg.eval(`(() => {
    const is = [...document.querySelectorAll('img')];
    return {
      n: is.length,
      loaded: is.filter((i) => i.complete && i.naturalWidth > 0).length,
      zeroBox: is.filter((i) => { const r = i.getBoundingClientRect(); return r.width * r.height === 0; }).length,
      sample: is.slice(0, 2).map((i) => (i.getAttribute('src') || '')),
    };
  })()`);

  /* 计算样式总览 */
  const cs = await pg.eval(`(() => {
    const px = (v) => parseFloat(v) || 0;
    const els = [...document.querySelectorAll('*')];
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const hex = (v) => {
      const m = String(v).match(/rgba?\\(([^)]+)\\)/);
      if (!m) return null;
      const p = m[1].split(',').map((x) => parseFloat(x));
      if (p.length > 3 && p[3] === 0) return null;
      return '#' + [p[0], p[1], p[2]].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    let visible = 0, radiusNonZero = 0, hidden = 0, zeroBox = 0;
    const radiusSamples = [];
    const sizes = [];
    const painted = new Set();
    for (const el of els) {
      const c = getComputedStyle(el);
      if (c.display === 'none' || c.visibility === 'hidden') { hidden++; continue; }
      const r = el.getBoundingClientRect();
      if (r.width * r.height === 0) { zeroBox++; continue; }
      visible++;
      for (const k of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) {
        if (px(c[k]) > 0.01) {
          radiusNonZero++;
          if (radiusSamples.length < 3) radiusSamples.push(el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0] + '=' + c.borderTopLeftRadius);
          break;
        }
      }
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (ownText) sizes.push({ tag: el.tagName.toLowerCase(), px: px(c.fontSize) });
      for (const k of ['backgroundColor', 'color', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor']) {
        const h = hex(c[k]); if (h) painted.add(h);
      }
    }
    /* 伪元素：:before/:after 常是铺面的大色块（S01 的红斜条就是 .page::after） */
    let pseudoN = 0, pseudoPainted = 0;
    for (const el of els.slice(0, 4000)) {
      for (const pe of ['::before', '::after']) {
        const c = getComputedStyle(el, pe);
        if (!c.content || c.content === 'none' || c.display === 'none') continue;
        pseudoN++;
        const h = hex(c.backgroundColor); if (h) { painted.add(h); pseudoPainted++; }
      }
    }
    const maxSize = sizes.length ? Math.max(...sizes.map((s) => s.px)) : 0;
    const sizeHist = {};
    for (const s of sizes) sizeHist[s.px] = (sizeHist[s.px] || 0) + 1;
    let mainP = null, bestLen = 0;
    for (const el of document.querySelectorAll('p, li, td, dd')) {
      const c = getComputedStyle(el);
      if (c.display === 'none' || c.visibility === 'hidden') continue;
      const len = (el.textContent || '').trim().length;
      if (len > bestLen) { bestLen = len; mainP = { tag: el.tagName.toLowerCase(), px: px(c.fontSize), len }; }
    }
    return {
      htmlBg: hex(root.backgroundColor) || null, htmlBgRaw: root.backgroundColor,
      bodyBg: hex(body.backgroundColor) || null, bodyBgRaw: body.backgroundColor,
      bodyFs: px(body.fontSize), htmlFs: px(root.fontSize),
      bodyFf: body.fontFamily,
      visible, hidden, zeroBox, pseudoN, pseudoPainted,
      radiusNonZero, radiusSamples,
      maxSize, sizeTop: Object.entries(sizeHist).sort((a, b) => b[1] - a[1]).slice(0, 5),
      mainP,
      painted: [...painted],
      docH: document.documentElement.scrollHeight,
      viewH: innerHeight,
      hOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      h1: (document.querySelector('h1') ? document.querySelector('h1').textContent.trim().slice(0, 24) : ''),
    };
  })()`);

  /* 实际渲染用的字体：CSS.getPlatformFontsForNode 取真实族名 */
  const ff = await pg.eval(`(() => {
    const first = (s) => {
      const e = document.querySelector(s); if (!e) return null;
      const c = getComputedStyle(e);
      return { sel: s, ff: c.fontFamily.split(',')[0].replace(/["']/g, '').trim() };
    };
    return [first('h1'), first('body'), first('p')].filter(Boolean);
  })()`);
  const fontReal = [];
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  for (const x of ff) {
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: x.sel });
    if (!q.nodeId) { fontReal.push({ ...x, real: '(no node)' }); continue; }
    try {
      const f = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
      fontReal.push({ ...x, real: (f.fonts || []).map((z) => z.familyName).join('+') || '(none)',
                      custom: (f.fonts || []).some((z) => z.isCustomFont) });
    } catch (e) { fontReal.push({ ...x, real: 'ERR:' + e.message.slice(0, 40) }); }
  }

  const paintedSet = new Set(cs.painted);
  const paintedHit = S.hexes.filter((h) => paintedSet.has(h));

  out.push({
    id, ms: Date.now() - t0,
    src: S,
    render: { ...cs, img, fontReal },
    cmp: {
      bgWant: S.wantBg,
      bgSourceSays: S.bgUsed,
      bgRenderedBody: cs.bodyBg,
      bgRenderedHtml: cs.htmlBg,
      bgMatch: S.wantBg ? (cs.bodyBg === S.wantBg || cs.htmlBg === S.wantBg) : null,
      bodySrc: S.srcBody, bodyRendered: cs.bodyFs, bodyActual: cs.mainP ? cs.mainP.px : null,
      titleSrc: S.srcMaxTitle, titleRendered: cs.maxSize,
      radiusSrc: S.srcRadiusNonZero.length, radiusRendered: cs.radiusNonZero,
      hexSrc: S.hexes.length, hexPainted: paintedHit.length, hexNotPainted: S.hexes.filter((h) => !paintedSet.has(h)),
      imgSrc: img.n, imgLoaded: img.loaded,
    },
    missingAssets: [...missing].slice(0, 6),
  });
  process.stderr.write(`  ${id} ${Date.now() - t0}ms\n`);
}

await browser.close();
server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit.json');
await writeFile(path, JSON.stringify(out, null, 1));

const pad = (s, n) => String(s).padEnd(n);
console.log('\n案     底色(要/渲)        正文字号(源/渲/实)   标题(源/渲)  圆角(源/渲) hex(渲/源) 图(源/载) 字体(声明→实际)');
for (const r of out) {
  const c = r.cmp;
  const bgMark = c.bgMatch === null ? '-' : c.bgMatch ? 'OK' : 'XX';
  console.log([
    pad(r.id, 6),
    pad(`${c.bgWant || '-'}/${c.bgRenderedBody} ${bgMark}`, 21),
    pad(`${c.bodySrc}/${c.bodyRendered}/${c.bodyActual}`, 19),
    pad(`${c.titleSrc}/${c.titleRendered}`, 12),
    pad(`${c.radiusSrc}/${c.radiusRendered}`, 10),
    pad(`${c.hexPainted}/${c.hexSrc}`, 8),
    pad(`${c.imgSrc}/${c.imgLoaded}`, 8),
    r.render.fontReal.map((f) => `${f.ff}→${f.real}`).slice(0, 2).join(' '),
  ].join(' '));
}
const slow = out.reduce((a, b) => (a.ms > b.ms ? a : b));
const avg = out.reduce((s, r) => s + r.ms, 0) / out.length;
console.log(`\n每案耗时：均 ${Math.round(avg)}ms，最慢 ${slow.id} ${slow.ms}ms\nJSON → ${path}`);
