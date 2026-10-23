#!/usr/bin/env node
// 给已经有素材、但缺 assets/CREDITS.md 的原型补上署名文件。
//
// 旧 8 个原型建得比这份规范早，素材都在、credits.json 也大多在，只是没有那份人可读的署名表。
// 这不是闸门问题（它们 FAIL=0），是**交付完整性与授权可追溯性**的问题：
// CC BY / CC BY-SA 的照片要求在使用处给出署名，光有一份 json 不算给读者看过。
//
//   node write-credits.mjs            给所有缺 CREDITS.md 的原型补
//   node write-credits.mjs S03-...    只处理指定方案
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function loadCredits(dir) {
  const out = [];
  for (const sub of ['assets/credits.json', 'build/raw/credits.json', 'build/raw-s01/credits.json', 'build/credits.json', 'build/raw/credits-raw.json']) {
    const p = join(dir, sub);
    if (!existsSync(p)) continue;
    try {
      // 剥 BOM：PowerShell 写的 json 都会带 EF BB BF，JSON.parse 会直接抛
      const arr = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
      if (Array.isArray(arr)) out.push(...arr);
    } catch { /* 坏的就跳过，下面的表里会体现 */ }
  }
  return out;
}

const targets = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .filter((n) => (only.length ? only.includes(n) : true))
  .filter((n) => existsSync(join(PROTO, n, 'assets')))
  .filter((n) => !existsSync(join(PROTO, n, 'assets', 'CREDITS.md')))
  .sort();

if (!targets.length) { console.log('没有缺 CREDITS.md 的原型'); process.exit(0); }

let made = 0;
for (const name of targets) {
  const dir = join(PROTO, name);
  const assets = join(dir, 'assets');
  const id = name.slice(0, 3);
  const creds = loadCredits(dir);
  const files = readdirSync(assets).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const textures = files.filter((f) => /^texture-/.test(f));
  const photos = files.filter((f) => !/^texture-/.test(f));

  const have = new Set(creds.map((c) => String(c.file || c.filename || '').replace(/\\/g, '/').split('/').pop()));

  const L = [];
  L.push('# 素材来源与署名');
  L.push('');
  L.push(`> 本文件由 \`prototypes/_build/write-credits.mjs\` 从本目录及 \`build/\` 下已有的 \`credits.json\` 汇总生成，**不是手抄**。`);
  L.push('> 本方案建于这份施工规范之前，素材是在当时网络可用时从 Wikimedia Commons 抓取的。');
  L.push('');
  L.push('## 一、真实照片');
  L.push('');
  const listed = creds.filter((c) => {
    const f = String(c.file || c.filename || '').replace(/\\/g, '/').split('/').pop();
    return f && files.includes(f);
  });
  if (listed.length) {
    L.push('| 文件 | 标题 | 作者 | 许可 | 来源页 |');
    L.push('| --- | --- | --- | --- | --- |');
    for (const c of listed) {
      const f = String(c.file || c.filename).replace(/\\/g, '/').split('/').pop();
      L.push(`| \`${f}\` | ${String(c.title || f).replace(/^File:/i, '')} | ${c.artist || '（原件未标注作者）'} | ${c.license || '见来源页'} | ${c.page || c.original ? `[原件页](${c.page || c.original})` : '—'} |`);
    }
  } else {
    L.push('（`credits.json` 与磁盘上的文件对不上，或本方案没有留存的署名记录。**这是一个未闭合的缺口**：');
    L.push('照片本身是从 Wikimedia Commons 抓的，逐张的作者与许可没有随包保留下来。若要对外使用，');
    L.push('需要按 `build/` 下的抓取脚本与检索词重新核对一遍来源。）');
  }
  L.push('');
  const unlisted = photos.filter((f) => !have.has(f));
  if (unlisted.length) {
    L.push('### 盘上存在但署名表里没有对应记录的位图');
    L.push('');
    for (const f of unlisted) L.push(`- \`${f}\` （${Math.round(statSync(join(assets, f)).size / 1024)} KB）`);
    L.push('');
  }
  L.push('## 二、程序化纹理 / 生成物');
  L.push('');
  if (textures.length) {
    for (const f of textures) L.push(`- \`${f}\` （${Math.round(statSync(join(assets, f)).size / 1024)} KB）—— 代码生成，非照片。`);
  } else {
    L.push('（本目录没有以 `texture-` 命名的生成物；若有其他生成图版，见 `build/` 下的生成脚本。）');
  }
  L.push('');
  L.push('## 三、字体');
  L.push('');
  L.push('页面字体全部自托管在 `prototypes/_fonts/`，来源为 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。');
  L.push('');

  writeFileSync(join(assets, 'CREDITS.md'), L.join('\n'), 'utf8');
  console.log(`  ${id} ${name}: 写 CREDITS.md（照片 ${photos.length} / 有条目 ${listed.length} / 纹理 ${textures.length}）`);
  made++;
}
console.log(`\n共补 ${made} 份`);
