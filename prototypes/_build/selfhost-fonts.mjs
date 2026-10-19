#!/usr/bin/env node
// 把旧 8 个原型里残留的外链字体换成自托管。
//
// 背景（已实测）：S03/S13/S25 有 0 个 @font-face，**完全**依赖 Google Fonts CDN；
// S08 只有 1 个本地 @font-face，其余靠 CDN；S17 的 1 个 @font-face 是 local("文津宋体")，
// 即依赖**系统字体**而不是随包资源；S21 的 72 个 @font-face 只覆盖中文，Antonio 与 IBM Plex Mono 仍走 CDN；
// S04 的 Latin 是本地 woff2，但中文 LXGW WenKai 走 jsdelivr。
// 后果不是"丑"，是**渲染依赖网络与系统字体**——网络一抖或换机器，字体就回退，
// 而闸门查不出来（font-fallback 只检查"已声明且已加载"的族）。
//
//   node selfhost-fonts.mjs --dry     只看会改什么
//   node selfhost-fonts.mjs           真改（先备份 index.html 到 index.html.bak-fonts）
import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const CSSDIR = join(PROTO, '_fonts', 'css');
const dry = process.argv.includes('--dry');

// 每个原型要链哪些自托管样式表（族与字重已按该页 CSS 的 font-family 声明核对过）
const PLAN = {
  'S03-long-exposure-observatory': ['ibm-plex-mono__400-600', 'ibm-plex-sans__400-600', 'space-grotesk__400-500', 'noto-sans-sc__100..900'],
  'S07-slate-ink-contents': ['noto-serif-sc__400-700'],                       // 本地 4 个 Latin @font-face 已自托管，缺的是中文
  'S08-amber-overprint-lightbox': ['gloock__400', 'source-serif-4__400-600', 'noto-serif-sc__400-700'],
  'S13-blind-debossed-dispatch': ['eb-garamond__400-600', 'dm-mono__400-500', 'noto-serif-sc__400-700'],
  'S17-revenue-stamp-stub': ['literata__400-600-700', 'sometype-mono__400-600', 'noto-serif-sc__400-700'],
  'S21-interlocking-release-book': ['antonio__400-600', 'ibm-plex-mono__400-500'], // 中文 72 片已自托管，缺 Latin 与等宽
  'S25-spotcolor-contents-zine': ['besley__400-700', 'noto-serif-sc__400-700'],
  // S04 的 Latin（Unbounded / Redaction 20 / Martian Mono）本来就是本地 woff2 @font-face，
  // 只有中文 LXGW WenKai 走 jsdelivr（Google Fonts 上没有 SC 版，只有 TC 版），
  // 用 fetch-css-fonts.mjs 从原始 webfont 包自托管成 lxgw-wenkai__400.css。
  'S04-mango-collage-wall': ['lxgw-wenkai__400'],
};

const EXTERNAL = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/;

let changed = 0, skipped = 0;
for (const [dir, cssList] of Object.entries(PLAN)) {
  const html = join(PROTO, dir, 'index.html');
  if (!existsSync(html)) { console.log(`跳过 ${dir}：没有 index.html`); skipped++; continue; }
  const orig = readFileSync(html, 'utf8');

  // 缺哪个样式表就先报出来，不要写一个指向不存在文件的 link
  const missing = cssList.filter((k) => !existsSync(join(CSSDIR, k + '.css')));
  if (missing.length) { console.log(`跳过 ${dir}：_fonts/css 缺 ${missing.join(', ')}`); skipped++; continue; }

  const lines = orig.split('\n');
  const kept = [];
  let removed = 0, alreadyHasLocal = 0;
  for (const ln of lines) {
    if (/<link\b/.test(ln) && EXTERNAL.test(ln)) { removed++; continue; }   // 外链字体 + preconnect 一起删
    if (/<link\b/.test(ln) && /_fonts\/css\//.test(ln)) alreadyHasLocal++;
    kept.push(ln);
  }
  // 插到 <link rel="stylesheet" href="style.css"> 之前；找不到就插到 </head> 之前
  const localLinks = cssList.map((k) => `<link rel="stylesheet" href="../_fonts/css/${k}.css">`);
  let out = kept.join('\n');
  if (alreadyHasLocal === 0) {
    const anchor = /^.*<link[^>]*href=["']style\.css["'][^>]*>.*$/m;
    if (anchor.test(out)) {
      out = out.replace(anchor, (m) => localLinks.join('\n') + '\n' + m);
    } else if (out.includes('</head>')) {
      out = out.replace('</head>', localLinks.join('\n') + '\n</head>');
    } else { console.log(`跳过 ${dir}：找不到插入锚点`); skipped++; continue; }
  }

  console.log(`${dir}: 删除外链 ${removed} 行，插入本地 link ${localLinks.length} 条${alreadyHasLocal ? '（已有本地 link，仅删外链）' : ''}`);
  for (const l of localLinks) console.log('    + ' + l);
  if (!dry) {
    if (!existsSync(html + '.bak-fonts')) copyFileSync(html, html + '.bak-fonts');
    writeFileSync(html, out, 'utf8');
  }
  changed++;
}
console.log(`\n处理 ${changed} 个，跳过 ${skipped} 个${dry ? '（dry run，未写盘）' : ''}`);

if (existsSync(CSSDIR)) {
  const have = readdirSync(CSSDIR).filter((f) => f.endsWith('.css')).length;
  console.log(`_fonts/css 现有 ${have} 个样式表`);
}
