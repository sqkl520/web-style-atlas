// B-6：提示语「约 N 字」是否与真实提示词长度一致；「会留洞」阈值是否与提示词 N 一致
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto("http://127.0.0.1:9583/prototypes/_selection/index.html", { settleMs: 1600 });

const rows = [];
for (let i = 0; i < 30; i++) {
  await p.eval((idx) => document.querySelectorAll("#ledger > li")[idx].click(), i);
  await new Promise((r) => setTimeout(r, 200));
  const d = await p.eval(() => {
    const host = document.getElementById("d-body");
    const hint = (host.querySelector(".prompt-cta span") || {}).textContent || "";
    const id = document.getElementById("d-no").textContent.trim();
    // 直接算真实提示词
    const txt = window.buildStylePrompt ? window.buildStylePrompt(id) : "";
    return { id, hint: hint.trim(), realLen: txt.length, promptText: txt };
  });
  rows.push(d);
  await p.eval(() => document.getElementById("d-close").click());
  await new Promise((r) => setTimeout(r, 100));
}

console.log("=== 「约 N 字」与实际长度 ===");
let mismatch = 0;
for (const r of rows) {
  const m = /约 (\d+) 字/.exec(r.hint);
  if (!m) continue;
  const claimed = +m[1];
  const real = r.realLen;
  const diff = Math.abs(claimed - real);
  if (diff > 2) { mismatch++; console.log(`  ⚠ ${r.id}: 声称 ${claimed} / 实际 ${real}（差 ${diff}）`); }
}
console.log(mismatch ? `不一致 ${mismatch} 案` : "全部一致（±2 字内）");

console.log("\n=== 「会留洞」阈值 vs 提示词里的 N ===");
let thr = 0;
for (const r of rows) {
  const m = /内容少于 (\d+) 条会留洞/.exec(r.hint);
  if (!m) continue;
  const claimed = +m[1];
  const inPrompt = +( /我实际有 (\d+) 个条目/.exec(r.promptText) || [])[1];
  if (claimed !== inPrompt) { thr++; console.log(`  ⚠ ${r.id}: 提示语说 ${claimed} 条，提示词说 ${inPrompt} 条`); }
}
console.log(thr ? `不一致 ${thr} 案` : "全部一致");

console.log("\n=== S18 专项：提示词说 20 条，页面实际 60 行 ===");
const s18 = rows.find((r) => r.id === "S18");
console.log("  S18 hint:", s18.hint);
console.log("  S18 提示词结构行:", s18.promptText.split("\n").filter((l) => /我实际有|这个版式的单元/.test(l)).join(" || "));

writeFileSync("D:/Web/style/deliverables/62-verify/r2/b6-hintlen.json", JSON.stringify(rows.map(({ promptText, ...r }) => r), null, 1), "utf8");
await p.close(); await b.close();
