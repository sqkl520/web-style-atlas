/* 用修好的 measure.mjs 跑全库 35 案，拿 columns 真值。
 * 这是 01-ROUND-SUMMARY.md §六 那张表的复算 —— 那张表是修复前/修复中间态跑的。 */
import { measure } from '../../74-q7/measure.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const src = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const SCHEMES = ctx.window.SCHEMES;

/* 只算到需要的：每案 CSS 里有没有 auto-fit / auto-fill */
const cssKind = (dir) => {
  try {
    const css = readFileSync(join(ROOT, 'prototypes', dir, 'style.css'), 'utf8');
    if (/repeat\(\s*auto-(fit|fill)/.test(css)) return 'auto-fit';
    if (/grid-template-columns/.test(css)) return 'fixed?';
    return 'no-gtc';
  } catch { return 'ERR'; }
};

const only = process.argv.slice(2).filter((a) => /^S\d{2}$/.test(a));
const rows = [];
for (const s of SCHEMES) {
  if (only.length && !only.includes(s.id)) continue;
  const html = join(ROOT, 'prototypes', s.dir, 'index.html');
  let r;
  try { r = await measure(html); }
  catch (e) { rows.push({ id: s.id, err: e.message.slice(0, 60) }); continue; }
  rows.push({
    id: s.id, tracks: r.gridTracks, cols: r.maxColCount, sel: r.gridSel,
    ratio: (r.mainRatio || []).map((v) => +v.toFixed(3)).join(','),
    css: cssKind(s.dir),
  });
  console.log(JSON.stringify(rows.at(-1)));
}
console.log('\n=== 汇总 ===');
const ok = rows.filter((r) => !r.err);
console.log(`成功 ${ok.length} / ${rows.length}`);
console.log('auto-fit 案:', ok.filter((r) => r.css === 'auto-fit').map((r) => r.id).join(' '));
console.log('失败:', rows.filter((r) => r.err).map((r) => r.id + ':' + r.err).join(' | ') || '无');
process.exit(0);
