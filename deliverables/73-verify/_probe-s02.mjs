/* 逐字取证：S02 的 body 到底有没有挂图，以及 check-texture 的 bodyBlocks()
 * 在 S02 上实际返回了什么。
 *
 * 把 check-texture.mjs:51-64 的函数原样复制过来，对同一份 CSS 跑，
 * 这样"闸门看到了什么"就是可复现的事实，不是我的推断。
 */
import { readFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/S02-gilded-symmetry-salon/style.css';
const raw = readFileSync(F, 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = stripComments(raw);

/* ── 原样复制 check-texture.mjs 的 bodyBlocks ── */
function bodyBlocks(css) {
  const out = [];
  const re = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[2].trim();
    const parts = sel.split(',').map((s) => s.trim());
    const isBareBody = parts.some((s) => s === 'body' || s === 'html');
    if (isBareBody) out.push({ sel, decls: m[3] });
  }
  return out;
}

const blocks = bodyBlocks(css);
console.log('闸门在 S02 上看到的 body/html 规则：' + blocks.length + ' 条');
for (const b of blocks) {
  console.log('  sel = ' + JSON.stringify(b.sel));
  console.log('  decls = ' + JSON.stringify(b.decls.trim().slice(0, 120)));
  const biM = b.decls.match(/background-image\s*:\s*([^;}]+)/i);
  console.log('  background-image 命中：' + (biM ? JSON.stringify(biM[1].trim()) : '无'));
  console.log('');
}

/* 源码里 body 块的真实位置 */
const i = raw.indexOf('body {');
console.log('源码里 `body {` 的位置：' + i);
console.log('该块原文：');
console.log(raw.slice(i, i + 420));
