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
    /* ⚠️ 2026-10-31：`at` 缺失/非法从前是 `continue` 静默跳过 ——
     * 那等于「这一案的陈旧度无法判定」被当成「不陈旧」（同一类"空集是子集"缺陷，
     * 与 check-contract.mjs 的 C0 同款）。改为报出来，让 reader 知道有一案没查。
     * 注意这里不能用 out.push 的普通形状：渲染命令对它是无意义的。 */
    if (!Number.isFinite(at)) {
      out.push({
        id: name.slice(0, 3), dir: name, which: '.inspect/report.json 的 at 字段',
        gapMin: 0, label: 'at 缺失或非法',
        render: 'node prototypes/_build/render-scheme.mjs ' + name,
      });
      continue;
    }
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
    /* 阈值 1 → 3 分钟（2026-10-31 实测后调整）。
     *
     * `inspect.mjs` 在**渲染开始**写 `at`（L61）、**最后**写 report（L171），
     * 所以 `report.mtime − at` = 单轮渲染耗时。30 案实测：min 0.37 / 中位 0.74 分钟，
     * 但 S02 是 1.6 分钟。若容差只有 1 分钟，那么在 S02 那种较慢的渲染期间
     * 别人碰一下 style.css，渲染成功完成后仍会被判「源比产物新」——假阳性。
     * 3 分钟覆盖实测的最大正常耗时（且远小于真正"改了没重渲染"的量级：
     * 真正陈旧的案是 10000+ 分钟）。 */
    if (gapMin > 3) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });

    /* jpg 截图与 report 同步性（2026-10-31 新增）。
     *
     * 为什么查它：`report.json` 里的数字旧了还能看出来，`.inspect/*.jpg`
     * 是一张**看起来正常**的旧截图 —— 人翻截图会以为页面现在长这样。
     *
     * ⚠️ 判据**不能**是 `jpg.mtime > at`。`inspect.mjs` 的写入顺序是
     *   at(L61) → jpg(L87-128) → report.json(L171)
     * 所以成功渲染必然让 jpg 比 at 新。实测该判据下 30/30 全红，纯假阳性。
     * 正确判据是 `jpg.mtime > report.json.mtime` —— 实测 1/30，
     * 且那 1 例是真的（重渲染时截图写入失败会留下这种状态）。 */
    const insp = join(P, name, '.inspect');
    let jpgs = [];
    try { jpgs = readdirSync(insp).filter((f) => f.endsWith('.jpg')); } catch { /* 没有 .inspect 就算了 */ }
    if (jpgs.length) {
      const repM = statSync(rep).mtimeMs;
      let newestJpg = 0;
      let jpgName = '';
      for (const f of jpgs) {
        const m = statSync(join(insp, f)).mtimeMs;
        if (m > newestJpg) { newestJpg = m; jpgName = f; }
      }
      /* 容差 5 秒：实测 S14 的 tablet-page-02.jpg 只比 report.json 新 **1 秒** ——
       * 那是同一次渲染末尾的写入顺序差（inspect.mjs 先写大部分截图再写 report，
       * 个别图最后补写），不是"截图与报告不同步"。没有容差会把这种正常抖动报成缺陷。 */
      if (newestJpg > repM + 5000) {
        out.push({
          id: name.slice(0, 3), dir: name, which: jpgName + '（截图比 report.json 新）',
          gapMin: Math.round((newestJpg - repM) / 60000), label: '截图与报告不同步',
          render: 'node prototypes/_build/render-scheme.mjs ' + name,
        });
      }
    }
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
    /* 阈值 1 → 3 分钟，与第①节（30 案）保持一致。
     *
     * `at` 是渲染**开始**时刻、report 是渲染**结束**才写，所以 `report.mtime − at`
     * = 单轮渲染耗时。实测选型台是 0.84 分钟 —— 1 分钟容差只剩 0.16 分钟余量，
     * 机器慢一点或并行跑别的渲染就会假阳性。
     *
     * 终验 Agent 指出「阈值只改了 1/3」（第① 节改了、第②③ 节没改），这条是第②节。 */
    if (gapMin > 3) out.push({ id: e.dir, dir: e.dir, which, gapMin: Math.round(gapMin), label: e.label, render: e.render });
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
    /* 阈值统一为 3 分钟（2026-10-31 终验指出"只改了 1/3"）。
     *
     * 注意这一节与①②不同：它比的是**产物 mtime vs 输入 mtime**，不是 `at`，
     * 所以没有"渲染耗时"这个混淆因素。但生成链是 `extract-dna → clean-dna →
     * build-prompts` 三段串行跑，中间产物写完再读会有秒级抖动；
     * 3 分钟给足余量，且真陈旧的量级是 1000+ 分钟，不会漏。 */
    if (gapMin > 3) {
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
