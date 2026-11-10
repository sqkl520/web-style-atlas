// B-9：搜索框 vs 芯片口径分歧——搜词给 0 行，但点同名芯片能筛出 N 行，且空状态不提芯片这条路
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto("http://127.0.0.1:9583/prototypes/_selection/index.html", { settleMs: 1500 });

const terms = await p.eval(() => [
  ...document.querySelectorAll("#flt-scene button[data-scene]"),
  ...document.querySelectorAll(".scene-more button[data-scene]"),
].map((x) => x.dataset.scene));

const rows = [];
for (const t of terms) {
  // 1) 只打字
  await p.eval(() => { const q = document.getElementById("q"); q.value = ""; q.dispatchEvent(new Event("input", { bubbles: true })); document.getElementById("reset").click(); });
  await new Promise((r) => setTimeout(r, 160));
  await p.eval((term) => { const q = document.getElementById("q"); q.value = term; q.dispatchEvent(new Event("input", { bubbles: true })); }, t);
  await new Promise((r) => setTimeout(r, 300));
  const bySearch = await p.eval(() => {
    const et = document.getElementById("empty-tpl");
    return {
      rows: document.querySelectorAll("#ledger > li").length,
      emptyTplHead: (et.querySelector(".tpl-empty-head") || {}).textContent || "",
      emptyVisible: !document.getElementById("empty").hidden,
    };
  });
  // 2) 清空后点芯片
  await p.eval(() => { const q = document.getElementById("q"); q.value = ""; q.dispatchEvent(new Event("input", { bubbles: true })); document.getElementById("reset").click(); });
  await new Promise((r) => setTimeout(r, 160));
  await p.eval((term) => {
    const btn = [...document.querySelectorAll("#flt-scene button, .scene-more button")].find((x) => x.dataset.scene === term);
    const more = document.querySelector(".scene-more"), tog = document.querySelector(".scene-toggle");
    if (more && more.contains(btn) && more.style.display === "none" && tog) tog.click();
    btn.click();
  }, t);
  await new Promise((r) => setTimeout(r, 300));
  const byChip = await p.eval(() => document.querySelectorAll("#ledger > li").length);
  rows.push({ term: t, bySearch: bySearch.rows, byChip, head: bySearch.emptyTplHead });
}

writeFileSync("D:/Web/style/deliverables/62-verify/r2/b9-split.json", JSON.stringify(rows, null, 1), "utf8");

const gap = rows.filter((r) => r.bySearch === 0 && r.byChip > 0);
console.log("=== 搜词 0 行、但点同名芯片有结果的词 ===");
for (const g of gap) {
  const mentionsChip = /芯片|点左侧/.test(g.head);
  console.log(`  ${g.term.padEnd(8)} 搜索=${g.bySearch} 芯片=${g.byChip}  空状态提到点芯片吗: ${mentionsChip ? "提到" : "❌ 没提"}`);
  console.log(`      原文: ${g.head.slice(0, 110)}`);
}
console.log(`\n合计 ${gap.length} 个词有分歧；其中 ${gap.filter((g) => !/芯片|点左侧/.test(g.head)).length} 个空状态没告诉用户去点芯片`);
await p.close(); await b.close();
