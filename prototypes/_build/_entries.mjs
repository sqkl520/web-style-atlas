// 「有闸门报告 / 需要被检查的入口」的唯一定义处。
//
// 为什么要有这个文件：2026-10-28 之前，两份脚本各自写了一遍
//   if (!/^S\d{2}-/.test(d.name)) continue;
//   · check-stale.mjs:23   （陈旧度）
//   · check-anchors.mjs:26 （死锚点）
// （`verify-prototype.mjs:144` 也写过第三遍，但它统计的是「30 个展品达标数」，
//  口径必须固定为 30 才能与 README 的 26/30 对上，所以**它有意保持只扫原型** ——
//  理由写在它自己那段注释里，不要"顺手统一"到这里。）
//
// 于是 `prototypes/_selection/`（用户主入口）被**两处同时漏掉**。
// 后果不是"没写检查"，而是**写了检查、检查看不见它**：
//   · 选型台有一份入库的 `.inspect/report.json`，at = 2026-10-21
//   · 之后它的源文件被改了 25 个 commit、+6214/−783 行
//   · 其间它从「闸门 FAIL 0」变成「FAIL 2」，而检查一直说"全部新鲜 / 无死锚点"
// 病根不是没人写检查，是检查的**范围**散落在几份脚本里、没有单一来源。
//
// 所以：新增任何"也有闸门报告的入口"，只改这个文件里的 PRODUCTS。
// 三份脚本都从这里 import。

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** 原型目录（S01..S30）的命名规则。原型的源文件固定是 index.html + style.css。 */
export const CASE_DIR_RE = /^S\d{2}-/;

/** 原型的源文件（陈旧判据用）。 */
export const CASE_SOURCES = ['index.html', 'style.css'];

/**
 * 原型之外、同样有 `.inspect/report.json` 的产品入口。
 *
 * 每项：
 *   dir      —— `prototypes/` 下的目录名
 *   label    —— 中文名（打印用）
 *   sources  —— 陈旧判据要看哪些源文件。**必须逐项列全**：
 *               少列一个 = 那个文件的改动永远不会让报告变陈旧 = 检查对它失效。
 *               产品是多文件协作（app.js / prompt-copy.js / data.js / prompts.js
 *               任何一处改了渲染结果都可能变），不能像原型那样只认 html+css。
 *   render   —— 重新生成报告的命令（提示用）
 *   anchor   —— 锚点检查扫哪个 html（没有就 null）
 */
export const PRODUCTS = [
  {
    dir: '_selection',
    label: '选型台',
    sources: [
      'index.html', 'style.css', 'app.js',
      'prompt-copy.js', 'data.js', 'prompts.js',
      'wizard.html', 'wizard.css', 'wizard.js',
      /* `self-gate.js` 不列：它和 report.json 由同一次 render-scheme 生成，
         mtime 必然比 at 晚几毫秒，列进来会让每次重渲染后立刻又报"陈旧"，
         把报警变成噪声。它是产物，不是源。 */
    ],
    render: 'node prototypes/_build/render-scheme.mjs _selection',
    anchor: 'index.html',
  },
];

/** 原型目录名（S01..S30），已排序。 */
export function caseDirs(protoRoot) {
  return readdirSync(protoRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && CASE_DIR_RE.test(d.name))
    .map((d) => d.name)
    .sort();
}

/** 实际存在的产品入口（目录不存在就跳过，不让 check-stale 之类因此崩掉）。 */
export function productEntries(protoRoot) {
  return PRODUCTS.filter((p) => existsSync(join(protoRoot, p.dir)));
}

/** 所有需要检查的目录名（原型 + 产品）。 */
export function allDirs(protoRoot) {
  return [...caseDirs(protoRoot), ...productEntries(protoRoot).map((p) => p.dir)];
}
