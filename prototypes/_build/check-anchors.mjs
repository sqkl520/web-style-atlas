// 锚点完整性检查：`href="#X"` 有没有对应的 `id="X"`
//
// 为什么需要它：误报驳回与修复成本评估员实测 S07 有一个死锚点
// （`#entry-118`，而真实 id 是 `p118`）——**真实点击 scrollY 0→0 不动，点了个寂寞**。
// 这类缺陷任何闸门规则都查不到：闸门只看资源、字体、Emoji、断链图、溢出，
// 不看站内锚点。而它只需 2 分钟就能修。
//
// ⚠️ 已知假阳性：JS 动态拼的 href（例如 S05 的 `href="#dg-' + keys[i] + '"`）
//    会被正则抓到"没有对应 id"。所以本脚本会标出**含引号或 `+` 的锚点**另行列出，
//    不混进"真死锚点"。
//
// 用法：node prototypes/_build/check-anchors.mjs [--quiet]
//   退出码 0 = 无死锚点；1 = 有

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// 目录清单来自 _entries.mjs：2026-10-28 之前这里是硬编码的 /^S\d{2}-/，
// 于是 `prototypes/_selection/`（用户主入口）的锚点从来没被查过。
// 而 check-stale 与 verify-prototype 各写了一遍同样的正则，三处一起漏。
import { allDirs } from './_entries.mjs';

const P = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const quiet = process.argv.includes('--quiet');

const dead = [];
const dynamic = [];
let scanned = 0;

for (const name of allDirs(P)) {
  const p = join(P, name, 'index.html');
  if (!existsSync(p)) continue;
  scanned++;
  const t = readFileSync(p, 'utf8');
  const hrefs = [...new Set([...t.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
  const ids = new Set([...t.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const h of hrefs) {
    if (ids.has(h)) continue;
    // JS 拼接的（含引号、加号、方括号）不算死锚点，单独列
    //
    // 两个数组的形状必须一致：`three` 是打印用的短 id，`dead` 有而 `dynamic` 没有的话，
    // 下面打印动态项的那条循环就会照着死锚点的模板去读它，打出
    // `undefined  href="#dg-' + keys[i] + '"`。
    // 实测（2026-10-27）：修前输出 `undefined  href="#dg-' + keys[i] + '"`，S05 那条被标成了
    // 一个不存在的案子。这类"检查器自己说谎"的噪声比漏报更伤——读者会开始不信整份输出。
    if (/['"+\[\]]/.test(h)) dynamic.push({ dir: name, three: name.slice(0, 3), href: h });
    else dead.push({ dir: name, three: name.slice(0, 3), href: h });
  }
}

if (!quiet) console.log(`锚点完整性：扫了 ${scanned} 个入口`);
if (dynamic.length && !quiet) {
  console.log(`  动态拼接的（需人工确认，不算死锚点）：${dynamic.length} 处`);
  for (const x of dynamic) console.log(`     ${x.three}  href="#${x.href.slice(0, 40)}"`);
}
if (dead.length) {
  console.log(`  ⚠️ 死锚点 ${dead.length} 处（点了不会滚，闸门查不到）：`);
  for (const x of dead) console.log(`     ${x.three}  href="#${x.href}" 在 ${x.dir}/index.html 里没有对应 id`);
  process.exit(1);
}
if (!quiet) console.log('  ✓ 无死锚点');
process.exit(0);
