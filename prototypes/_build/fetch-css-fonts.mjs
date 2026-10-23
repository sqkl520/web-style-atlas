#!/usr/bin/env node
// 从一个任意的远程 CSS（不是 Google Fonts 的 css2 端点）把字体自托管下来。
// 存在的理由：S04 的中文主字体 LXGW WenKai 不在 Google Fonts 上（那里只有 TC 版），
// 它的官方 webfont 包发在 jsdelivr 上，形态是一层 index CSS -> 若干子 CSS -> 大量 woff2 分片。
// 而 S04 原先直接 <link> 到 jsdelivr，等于把整页中文的渲染押在网络上。
//
//   node fetch-css-fonts.mjs --url <cssUrl> --as <family-slug> [--weights 400]
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'prototypes', '_fonts');
const FILES = join(OUT, 'files');
const CSSDIR = join(OUT, 'css');

const argv = process.argv.slice(2);
const get = (k, d) => { const i = argv.indexOf(k); return i !== -1 ? argv[i + 1] : d; };
const startUrl = get('--url');
const asSlug = get('--as');
const weights = get('--weights', '400');
if (!startUrl || !asSlug) { console.error('用法: node fetch-css-fonts.mjs --url <cssUrl> --as <slug> [--weights 400]'); process.exit(2); }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const abs = (u, base) => (u.startsWith('http') ? u : new URL(u, base).href);

async function getText(url) {
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
    catch (e) { if (t === 4) throw e; await new Promise((r) => setTimeout(r, 700 * t)); }
  }
}
async function getBuf(url) {
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (t === 4) throw e; await new Promise((r) => setTimeout(r, 700 * t)); }
  }
}

// 递归展开 @import 与 url(...css) 形式的子样式表
const seen = new Set();
async function collect(url, depth = 0) {
  if (seen.has(url) || depth > 3) return '';
  seen.add(url);
  let css = await getText(url);
  const subs = [...css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/g)].map((m) => m[1]);
  for (const s of subs) css += '\n' + (await collect(abs(s, url), depth + 1));
  return css;
}

console.log('抓取 ' + startUrl);
const css = await collect(startUrl);
const blocks = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
console.log(`展开后：${blocks.length} 个 @font-face，@import 展开 ${seen.size} 层文档`);
if (!blocks.length) { console.error('没有 @font-face'); process.exit(3); }

const urls = [...new Set(blocks.map((b) => (/url\(\s*["']?([^"')]+\.woff2)/.exec(b) || [])[1]).filter(Boolean))];
const dir = join(FILES, asSlug);
mkdirSync(dir, { recursive: true });
console.log(`需要下载 ${urls.length} 个 woff2 分片`);

const urlMap = new Map();
let bytes = 0, got = 0, failed = 0;
const jobs = urls.map((u) => {
  const full = abs(u, startUrl);
  const name = (full.split('/').pop() || 'x').split('?')[0];
  const h = createHash('sha1').update(full).digest('hex').slice(0, 8);
  const fn = h + '-' + name;
  urlMap.set(u, `../files/${asSlug}/${fn}`);
  return { full, dest: join(dir, fn), name };
});
const CONC = 6;
let cursor = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (cursor < jobs.length) {
    const j = jobs[cursor++];
    if (existsSync(j.dest)) { bytes += statSync(j.dest).size; got++; continue; }
    try { const b = await getBuf(j.full); writeFileSync(j.dest, b); bytes += b.length; got++; }
    catch (e) { failed++; console.error('  ✗ ' + j.name + ': ' + e.message); }
  }
}));

mkdirSync(CSSDIR, { recursive: true });
const cssOut = blocks
  .map((b) => b.replace(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g, (_, u) => `url('${urlMap.get(u) || u}')`))
  .join('\n');
const key = `${asSlug}__${weights}`;
const header = `/* 自托管（由 prototypes/_build/fetch-css-fonts.mjs 生成，勿手改）\n   来源：${startUrl}\n   分片：${blocks.length} 个 @font-face / ${got} 个 woff2 / ${(bytes / 1024).toFixed(1)} KB\n   注意：这一族不在 Google Fonts 上（那里只有 TC 版），必须从原始 webfont 包自托管。 */\n`;
writeFileSync(join(CSSDIR, key + '.css'), header + cssOut, 'utf8');

console.log(`\n完成：${got} 片 / ${(bytes / 1024 / 1024).toFixed(2)} MB / 失败 ${failed}`);
console.log('样式表：prototypes/_fonts/css/' + key + '.css');
