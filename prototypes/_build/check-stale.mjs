// 闸门陈旧度检查：任一案的 / 产品的源文件比它的 report.json.at 新，就是陈旧
//
// 为什么需要它：这是 **AH-11 与 AH-14、N1 三次缺陷的共同根因** ——
// 改了原型之后忘了重渲染，于是选型台展示的是**旧修订的闸门结果与截图**。
// 它不会被任何闸门规则发现（闸门只查当前 report.json 的内容，不查它有多旧）。
//
// 2026-10-28 扩到产品自身。为什么要扩：
//   `_selection/` 早在 1f30e7d（2026-10-22）就有一份入库的 report.json，
//   但那之后它的 6 个源文件被改了 **+6214 / −783 行**（app.js +1118、prompt-copy.js +1590、
//   style.css +842、index.html +228、data.js +216、prompts.js +2152）。
//   本脚本报「✓ 全部新鲜」，因为它和 `verify-prototype --all`、`check-anchors` 三处
//   复制了同一个 `/^S\d{2}-/` 选择器 —— 病根不是没人写检查，是检查的目录列表漏了一层。
//   后果实测（2026-10-28 用 inspect.mjs 重跑 53.6 秒）：产品从报告声称的 `FAIL 0`
//   变成 `FAIL 2`（body-size / hairline）。也就是说，**用户看到的闸门结论是 6 天前的**。
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

/* 原型之外的「也有闸门报告」的入口 —— 定义在 `_entries.mjs`，不在这里。
 *
 * 为什么搬走：这个列表原来在本文件里硬编码，而 `check-anchors.mjs` 与
 * `verify-prototype.mjs` 各自又写了一遍 `/^S\d{2}-/`。三处同时漏掉 `_selection`，
 * 于是"选型台的报告陈旧了 5.94 天"这件事，三份检查没有一份报出来。
 * 现在唯一来源是 `_entries.mjs`：新增产品入口只改那一处，三份脚本一起生效。 */
import { CASE_DIR_RE, CASE_SOURCES, productEntries, caseDirs } from './_entries.mjs';

/** 返回 [{id, which, gapMin, at, mtime}] */
export function findStale() {
  const out = [];

  // ① 原型（S01..S30）
  for (const name of caseDirs(P)) {
    const rep = join(P, name, '.inspect', 'report.json');
    if (!existsSync(rep)) continue;
    let at;
    try {
      at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime();
    } catch { continue; }
    if (!Number.isFinite(at)) continue;
    let newest = 0;
    let which = '';
    for (const f of CASE_SOURCES) {
      const p = join(P, name, f);
      if (existsSync(p)) {
        const m = statSync(p).mtimeMs;
        if (m > newest) { newest = m; which = f; }
      }
    }
    const gapMin = (newest - at) / 60000;
    // 1 分钟容差：同一次渲染里 html/css 与 report 的写入顺序会有秒级差
    if (gapMin > 1) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });
  }

  // ② 原型之外的入口（2026-10-28 新增，清单来自 _entries.mjs）
  for (const e of productEntries(P)) {
    const rep = join(P, e.dir, '.inspect', 'report.json');
    // 没有报告就不归这里管：那是「从未渲染过」，不是「陈旧」，该由别的检查报。
    if (!existsSync(rep)) continue;
    let at;
    try {
      at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime();
    } catch { continue; }
    if (!Number.isFinite(at)) continue;
    let newest = 0;
    let which = '';
    for (const f of e.sources) {
      const p = join(P, e.dir, f);
      if (!existsSync(p)) continue;
      const m = statSync(p).mtimeMs;
      if (m > newest) { newest = m; which = f; }
    }
    if (!which) continue;
    const gapMin = (newest - at) / 60000;
    if (gapMin > 1) out.push({ id: e.dir, dir: e.dir, which, gapMin: Math.round(gapMin), label: e.label, render: e.render });
  }

  /* ③ 提示词数据链（2026-10-30 新增）
   *
   * 为什么需要它：这是**连续第二轮**出现「生成物无陈旧守卫」的同类缺陷。
   *   第 69 轮：`_selection/.inspect/report.json` 冻结 6 天，无检查器覆盖
   *            → 闸门谎报 FAIL 0（实际 2 条 FAIL）
   *   第 70 轮：`_prompts/dna-raw.json` 落后 S13 的 style.css **5065 分钟**（3.5 天）
   *            → 生成链 2/3 产物不可复现，且差点把脏字体名写进产品
   *
   * 两者的共同点：都是生成物、都被 git 跟踪（所以看起来"有版本"）、
   * 都依赖会变的源文件、都不在任何检查器的视野里。
   *
   * 链条：Sxx/style.css + index.html
   *         → dna-raw.json → dna-clean.json → prompts.js
   * 每一环都必须比它的输入新，否则就是陈旧。
   */
  const CHAIN = [
    {
      /* 规格文件：链条最上游，也是**唯一完全没有守卫**的生成物（2026-10-30 补）。
       *
       * `extract-specs.mjs` 从 `deliverables/05-schemes-*.md` 切出 30 份规格，
       * 而所有下游（data.js 的 palette / prompts.js 的色板与字号）都以规格为权威。
       * 规格陈旧 = 用户看到和拿到的全部基于过时数据，且没有一处会报警。
       *
       * 输入用 05 号源文件；如果它不存在（比如 clone 后没跑过），本条自动跳过。 */
      product: '_specs/S01.md',
      inputs: () => {
        /* `P` = `prototypes/`，所以仓库根是它的上一级。这里不能假设有个 ROOT 变量。 */
        const repoRoot = join(P, '..');
        return ['04-schemes-01-10.md', '05-schemes-11-20.md', '05-schemes-21-30.md']
          .map((f) => join(repoRoot, 'deliverables', f))
          .filter((f) => existsSync(f));
      },
      hint: 'node prototypes/_build/extract-specs.mjs',
      label: '规格链·_specs',
    },
    {
      /* ⚠️ 路径全部相对于 `P`（= `prototypes/`），**不要**再带 `prototypes/` 前缀。
       * 2026-10-30 第一版写了 'prototypes/_prompts/dna-raw.json'，join(P, ...) 之后
       * 变成 prototypes/prototypes/_prompts/... → existsSync 恒 false → 守卫静默失效。
       * 而它失效的样子是"全部新鲜"，看起来像通过 —— 这是最危险的一类 bug。 */
      product: '_prompts/dna-raw.json',
      inputs: () => caseDirs(P).flatMap((n) => [join(P, n, 'style.css'), join(P, n, 'index.html')]),
      hint: 'node prototypes/_prompts/extract-dna.mjs',
      label: '提示词链·dna-raw',
    },
    {
      product: '_prompts/dna-clean.json',
      inputs: () => [join(P, '_prompts/dna-raw.json'), join(P, '_prompts/clean-dna.mjs')],
      hint: 'node prototypes/_prompts/clean-dna.mjs',
      label: '提示词链·dna-clean',
    },
    {
      product: '_selection/prompts.js',
      inputs: () => [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')],
      hint: 'node prototypes/_prompts/build-prompts.mjs',
      label: '提示词链·prompts.js',
    },
  ];
  for (const link of CHAIN) {
    const prod = join(P, link.product);
    if (!existsSync(prod)) continue;                 // 产物不存在 = 另一类问题，不归这里
    const prodM = statSync(prod).mtimeMs;
    let newest = 0, which = '';
    for (const f of link.inputs()) {
      if (!existsSync(f)) continue;
      const m = statSync(f).mtimeMs;
      if (m > newest) {
        newest = m;
        /* 显示用路径：优先截成 `prototypes/` 之后的部分（原型链的输入都在那下面）；
         * 规格链的输入在仓库根的 `deliverables/` 下，那条 `split` 命中不了，
         * 原来会回退成完整绝对路径（`D:\Web\style\deliverables\...`），读起来很吵。 */
        const norm = f.replace(/\\/g, '/');
        const afterProto = norm.split('/prototypes/')[1];
        which = afterProto || norm.split('/deliverables/').pop() || norm;
        if (!afterProto && norm.includes('/deliverables/')) which = 'deliverables/' + which;
      }
    }
    if (!which) continue;
    const gapMin = (newest - prodM) / 60000;
    if (process.env.DEBUG_STALE_CHAIN) {
      console.error('[chain] ' + link.label + ' prodM=' + prodM + ' newest=' + newest + ' gapMin=' + gapMin.toFixed(2) + ' which=' + which);
    }
    if (gapMin > 1) {
      out.push({
        id: link.label,
        dir: link.product,
        which,
        gapMin: Math.round(gapMin),
        label: link.label,
        render: link.hint,
      });
    }
  }

  return out.sort((a, b) => b.gapMin - a.gapMin);
}

const stale = findStale();
if (!quiet) {
  const nCase = caseDirs(P).length;
  const nExtra = productEntries(P).filter((e) => existsSync(join(P, e.dir, '.inspect', 'report.json'))).length;
  console.log(`闸门陈旧度：检查 ${nCase} 案${nExtra ? ` + ${nExtra} 个产品入口` : ''}`);
}
if (stale.length) {
  console.log(`  ⚠️ ${stale.length} 项陈旧（源文件比 report.json 新，说明改了没重渲染）：`);
  for (const s of stale) {
    const name = s.label ? `${s.label}(${s.dir})` : s.id;
    const cmd = s.render || `node prototypes/_build/render-scheme.mjs ${s.dir}`;
    console.log(`     ${name}  ${s.which} 落后 ${s.gapMin} 分钟  →  ${cmd}`);
  }
  console.log('  陈旧的后果：选型台与 data.js 展示的是**旧修订**的闸门结果与截图。');
  process.exit(1);
}
if (!quiet) console.log('  ✓ 全部新鲜');
process.exit(0);
