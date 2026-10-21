// 闸门陈旧度检查：任一案的 index.html / style.css 比它的 report.json.at 新，就是陈旧
//
// 为什么需要它：这是 **AH-11 与 AH-14、N1 三次缺陷的共同根因** ——
// 改了原型之后忘了重渲染，于是选型台展示的是**旧修订的闸门结果与截图**。
// 它不会被任何闸门规则发现（闸门只查当前 report.json 的内容，不查它有多旧）。
//
// 由误报驳回与修复成本评估员提出，我采纳并落成脚本。
// 实测它会立刻命中 S13（落后 993 分钟）与 S14（落后 11 分钟）。
//
// 用法：node prototypes/_build/check-stale.mjs [--quiet]
//   退出码 0 = 全部新鲜；1 = 有陈旧项（可接进 CI / 提交前检查）

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const quiet = process.argv.includes('--quiet');

/** 返回 [{id, which, gapMin, at, mtime}] */
export function findStale() {
  const out = [];
  for (const d of readdirSync(P, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
    const rep = join(P, d.name, '.inspect', 'report.json');
    if (!existsSync(rep)) continue;
    let at;
    try {
      at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime();
    } catch { continue; }
    if (!Number.isFinite(at)) continue;
    let newest = 0;
    let which = '';
    for (const f of ['index.html', 'style.css']) {
      const p = join(P, d.name, f);
      if (existsSync(p)) {
        const m = statSync(p).mtimeMs;
        if (m > newest) { newest = m; which = f; }
      }
    }
    const gapMin = (newest - at) / 60000;
    // 1 分钟容差：同一次渲染里 html/css 与 report 的写入顺序会有秒级差
    if (gapMin > 1) out.push({ id: d.name.slice(0, 3), dir: d.name, which, gapMin: Math.round(gapMin) });
  }
  return out.sort((a, b) => b.gapMin - a.gapMin);
}

const stale = findStale();
if (!quiet) {
  console.log(`闸门陈旧度：检查 ${readdirSync(P, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).length} 案`);
}
if (stale.length) {
  console.log(`  ⚠️ ${stale.length} 案陈旧（源文件比 report.json 新，说明改了没重渲染）：`);
  for (const s of stale) {
    console.log(`     ${s.id}  ${s.which} 落后 ${s.gapMin} 分钟  →  node prototypes/_build/render-scheme.mjs ${s.dir}`);
  }
  console.log('  陈旧的后果：选型台与 data.js 展示的是**旧修订**的闸门结果与截图。');
  process.exit(1);
}
if (!quiet) console.log('  ✓ 全部新鲜');
process.exit(0);
