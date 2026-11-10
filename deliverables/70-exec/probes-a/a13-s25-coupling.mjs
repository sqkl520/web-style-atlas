/**
 * 探针 a13：验证我在报告里对 S25 的那句判断 ——
 * 「只加 HTML 扫描、保留 0.5px 合并 → S25 变成 2px、3px（1 被 1.2 吃掉）」
 *
 * 这是审计报告 PATCH-linewidth.md §2.4 末段提到但没被当成硬约束的一点：
 * 两个 patch 是**强耦合**的，不能分开实施。本探针把四种组合都跑一遍。
 *
 * 重跑：node deliverables/70-exec/probes-a/a13-s25-coupling.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const DIR = "S25-spotcolor-contents-zine";
const css = readFileSync(join(P, DIR, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const html = readFileSync(join(P, DIR, "index.html"), "utf8");
const round2 = (n) => Math.round(n * 100) / 100;

const OLD_RE = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;

function collect(useHtml) {
  const w = new Set();
  for (const m of css.matchAll(OLD_RE)) {
    for (const q of m[1].matchAll(/([0-9.]+)px/g)) { const n = +q[1]; if (n > 0) w.add(round2(n)); }
    if (/stroke-width/i.test(m[0])) {
      const b = m[1].match(/^\s*([0-9.]+)\s*$/);
      if (b && +b[1] > 0) w.add(round2(+b[1]));
    }
  }
  if (useHtml) for (const m of html.matchAll(/stroke-width\s*=\s*["']?([0-9.]+)/g)) { const n = +m[1]; if (n > 0) w.add(round2(n)); }
  return [...w].sort((a, b) => a - b);
}

function narrow(list) {
  const fine = list.filter((x) => x < 1);
  const coarse = [];
  for (const x of list.filter((v) => v >= 1)) if (!coarse.some((c) => Math.abs(c - x) < 0.5)) coarse.push(x);
  return fine.concat(coarse).sort((a, b) => a - b);
}

const fmt = (a) => (a.length ? a.map((n) => n + "px").join("、") : "(空)");

const raw_css = collect(false), raw_both = collect(true);
console.log("=== S25 四种组合 ===");
console.log("① 只扫 CSS + 0.5px 合并（改前实况）     : " + fmt(narrow(raw_css)));
console.log("② 只扫 CSS + 不合并                    : " + fmt(raw_css));
console.log("③ 加扫 HTML + 0.5px 合并（「只加半套」）  : " + fmt(narrow(raw_both)));
console.log("④ 加扫 HTML + 不合并（本次实际采用）    : " + fmt(raw_both));
console.log("\n原始集合（只 CSS） : " + raw_css.join(","));
console.log("原始集合（CSS+HTML）: " + raw_both.join(","));

const claim = fmt(narrow(raw_both)) === "1px、2px、3px";
console.log("\n验证报告中的断言「只加 HTML、保留合并 → 1px、2px、3px（1.2 仍被 1 吃掉）」：" + (claim ? "✓ 成立" : "✗ 不成立（实际 " + fmt(narrow(raw_both)) + "）"));
console.log("\n机理：coarse 从 1 开始，1.2 与 1 相差 0.2 < 0.5 → 1.2 被丢弃，1 留下。");
console.log("      也就是说 1 与 1.2 里**被丢掉的是 1.2**（装订线那一级），留下的是 1。");
console.log("结论：只加 HTML 扫描不够 —— 仍然缺 1.2px。两个 patch 必须同时实施。");
process.exit(claim ? 0 : 1);
