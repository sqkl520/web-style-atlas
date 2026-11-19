#!/usr/bin/env node
/* 生成选型台卡片的缩略图变体（2026-11-05）。
 *
 * 【要修的死路，实测】
 * 卡片缩略图实显 152×86 CSS px，@dpr2 需要 304×171。
 * 而它加载的是 1440×900 的全尺寸截图 —— 只用到原图 4.0% 的像素，
 * 超采样 4.7×。实测 35 张合计 5.03 MiB，平均 147 KB/张。
 *
 * 懒加载（app.js 已修）把首屏从 35 张降到 7 张，但**每张的字节没变**：
 * 首屏仍要 1.17 MiB。两份浪费是独立的，这一份是"每张太大"。
 *
 * 【为什么用 CDP 而不是装 sharp/sharp】
 * 仓库铁律是零 npm 依赖（只用 node: 内置 + 相对导入）。装图像库会破坏它。
 * 而本仓库已经有 Chrome 的 CDP 通道（prototypes/_build/vendor/cdp.mjs），
 * 让浏览器自己解码 → 缩放 → 重编码是零依赖的（浏览器本来就在做这件事）。
 *
 * 【产出】
 * 对每个案的 shots.desktop[0]，生成同目录下的 `<原名>.thumb.jpg`，
 * 宽 304（= 152 × 2，覆盖 dpr2）。卡片优先用它，缺失时回退原图。
 *
 * 【为什么生成物要提交进仓库，而不是构建时现算】
 * 站点是**纯静态、浏览器直接打开**的（用户双击 index.html 或走 Pages），
 * 没有构建步骤。缩略图必须在仓库里。
 *
 * 用法：
 *   node prototypes/_build/make-thumbs.mjs            # 生成缺失的
 *   node prototypes/_build/make-thumbs.mjs --force    # 全部重生成
 *   node prototypes/_build/make-thumbs.mjs --check    # 只报告，不写
 */
import { existsSync, statSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from './vendor/cdp.mjs';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');
const FORCE = process.argv.includes('--force');
const CHECK = process.argv.includes('--check');
const THUMB_W = 304;
const THUMB_Q = 72;

/* 从 data.js 读不到（它是浏览器脚本），所以直接扫目录 —— 更稳：
   即使 data.js 与磁盘不同步，这个脚本处理的是**文件**，不是数据。 */
const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const targets = [];
for (const dir of dirs) {
  const fold = join(PROTO, dir, '.inspect', 'desktop-fold.jpg');
  if (!existsSync(fold)) continue;
  const out = fold.replace(/\.jpg$/, '.thumb.jpg');
  targets.push({ id: dir.slice(0, 3), fold, out });
}

let need = 0, have = 0;
for (const t of targets) {
  const stale = !existsSync(t.out) || (FORCE) ||
    (existsSync(t.out) && statSync(t.out).mtimeMs < statSync(t.fold).mtimeMs);
  if (stale) need++; else have++;
}
console.log(`缩略图：${targets.length} 个案，已有 ${have}，需生成 ${need}`);
if (!need) { console.log('无事可做。'); process.exit(0); }
if (CHECK) { console.log('（--check：不写文件）'); process.exit(need ? 1 : 0); }

const browser = await Browser.launch({ width: 1200, height: 800 });
let done = 0, bytesBefore = 0, bytesAfter = 0;
try {
  const pg = await browser.newPage({ width: 1200, height: 800 });
  /* 空白页只加载一次，之后靠 JS 换图源 —— 避免每个案都导航一遍。 */
  await pg.goto('about:blank', { settleMs: 100 });

  for (const t of targets) {
    const stale = !existsSync(t.out) || FORCE ||
      (existsSync(t.out) && statSync(t.out).mtimeMs < statSync(t.fold).mtimeMs);
    if (!stale) continue;
    const before = statSync(t.fold).size;
    const dataUrl = 'data:image/jpeg;base64,' + readFileSync(t.fold).toString('base64');

    /* 在页面里：解码 → canvas 缩放 → toDataURL('image/jpeg', q)。
       naturalWidth 可能小于目标宽（老旧截图），此时按原宽输出，不放大 ——
       放大只会变糊且变大。 */
    const outUrl = await pg.eval(`(function () {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () {
          var w = Math.min(${THUMB_W}, img.naturalWidth);
          var h = Math.round(w * img.naturalHeight / img.naturalWidth);
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', ${THUMB_Q / 100}));
        };
        img.onerror = function () { rej(new Error('decode failed')); };
        img.src = ${JSON.stringify(dataUrl)};
      });
    })()`);
    if (!outUrl || outUrl.indexOf('data:image/jpeg;base64,') !== 0) {
      console.error(`  ✗ ${t.id} 编码失败`);
      continue;
    }
    const buf = Buffer.from(outUrl.slice('data:image/jpeg;base64,'.length), 'base64');
    writeFileSync(t.out, buf);
    bytesBefore += before; bytesAfter += buf.length;
    done++;
    console.log(`  ${t.id}  ${(before / 1024).toFixed(0)} → ${(buf.length / 1024).toFixed(1)} KB`);
  }
} finally {
  await browser.close();
}

console.log(`\n生成 ${done} 张；${(bytesBefore / 1048576).toFixed(2)} → ${(bytesAfter / 1048576).toFixed(2)} MiB`);
