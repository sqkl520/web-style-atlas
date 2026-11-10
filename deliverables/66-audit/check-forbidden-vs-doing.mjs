/* 66-audit 只读探针：「提示词禁止的」与「原型自己做的」正面冲突清单。
 *
 * 提示词第 2 条（当前版）无条件写着：
 *   「用你自己的真实数量排：有几个排几个，不凑整、不留空位、不留占位符、编号连续不跳号。」
 * 第 3 条 yes 分支又写：「把空出来的位置删掉、整块重排，不要留空槽」
 *
 * 但若干原型**把空位本身做成签名机制**：
 *   · S19 第 215 行：「空抽屉不删除、不合并：第 4 与第 16 两个空位留在柜面上……「借出」也是这柜档案的一部分」
 *   · S02 第 83 行表头：「16 件器物实测台账（缺号 1 处）」——第 5 级就是空缺，编号跳号
 *   · S06 3 张 card--blank + 1 张 card--fault
 *
 * 判据：主单元集合里 class 或**紧邻**文本明确表示"空/缺/废"的，且原型正文里有
 * 「不删除 / 位置照留 / 缺号 / 保留空位」这类**保留声明**的，判为 CONFLICT。
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

/* 每案：主单元 class 精确模式 + 空位类的 class 片段 */
const SPEC = {
  S02: { dir: "S02-gilded-symmetry-salon", unit: /<li class="step[^"]*"/g, blank: /is-vacant/ },
  S06: { dir: "S06-showa-kissaten-ledger", unit: /<article class="card[^"]*"/g, blank: /card--blank|card--fault/ },
  S19: { dir: "S19-copperplate-herbarium-cabinet", unit: /<li class="dw[^"]*"/g, blank: /dw--void/ },
};

const KEEP_RE = /不删除|不合并|位置照留|空位留在|保留空位|照旧|缺号|空抽屉不/;

console.log("id   主单元  空位单元  原型是否明说「保留空位」  提示词第2条要求");
for (const [id, sp] of Object.entries(SPEC)) {
  const html = readFileSync(join(ROOT, "prototypes", sp.dir, "index.html"), "utf8");
  const units = [...html.matchAll(sp.unit)].map((m) => m[0]);
  const blanks = units.filter((u) => sp.blank.test(u)).length;
  const keepHits = [];
  for (const m of html.matchAll(new RegExp(KEEP_RE.source, "g"))) {
    keepHits.push(html.slice(Math.max(0, m.index - 26), m.index + 26).replace(/\s+/g, " ").trim());
  }
  const keeps = keepHits.length > 0;
  console.log(
    `${id}  ${String(units.length).padStart(6)}  ${String(blanks).padStart(8)}  ${(keeps ? "是（" + keepHits.length + " 处）" : "否").padEnd(24)}  ${blanks > 0 && keeps ? "⚠ 冲突：不许留空位/不许跳号" : "—"}`
  );
  for (const k of keepHits.slice(0, 2)) console.log("     · 「…" + k + "…」");
}

console.log("\n>>> 提示词第 2 条是无条件分支（无 if/不足），对 30 案一律生效；");
console.log(">>> 但它禁止的东西恰好是 S19/S02/S06 的签名机制。");
