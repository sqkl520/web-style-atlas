// B-7：隐藏容器残留——先命中模板的词，再换成不命中的词，看旧卡片/引导句是否残留
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto("http://127.0.0.1:9583/prototypes/_selection/index.html", { settleMs: 1600 });

const snap = () => p.eval(() => {
  const et = document.getElementById("empty-tpl");
  return {
    q: document.getElementById("q").value,
    rows: document.querySelectorAll("#ledger > li").length,
    stripHidden: document.getElementById("tpl-strip").hidden,
    lead: document.getElementById("tpl-strip-lead").textContent.trim(),
    stripCards: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.dataset.tpl),
    emptyTplHidden: et.hidden,
    emptyTplCards: [...et.querySelectorAll(".tpl-card")].map((c) => c.dataset.tpl),
    emptyTplHead: (et.querySelector(".tpl-empty-head") || {}).textContent || "",
    emptyTplHTMLLen: et.innerHTML.length,
  };
});

const setQ = async (t) => {
  await p.eval((term) => {
    const q = document.getElementById("q");
    q.value = term;
    q.dispatchEvent(new Event("input", { bubbles: true }));
  }, t);
  await new Promise((r) => setTimeout(r, 380));
};

const seq = [];
// 顺序：命中模板的空状态 → 不命中的空状态 → 命中 → 有行的搜索
const plan = ["餐厅", "酒吧", "甜品", "zzzz", "摄影", "咖啡", "S01", "钢结构"];
for (const t of plan) {
  await setQ(t);
  seq.push(await snap());
}
// 反向：有行 → 0 行
await setQ("S07");
seq.push(await snap());
await setQ("酒吧");
seq.push(await snap());

writeFileSync("D:/Web/style/deliverables/62-verify/r2/b7-residue.json", JSON.stringify(seq, null, 1), "utf8");

console.log("=== 连续换词，看隐藏容器是否残留 ===");
for (const s of seq) {
  console.log(`q=${JSON.stringify(s.q).padEnd(10)} rows=${String(s.rows).padEnd(2)} stripHidden=${String(s.stripHidden).padEnd(5)} stripCards=[${s.stripCards}] emptyTplHidden=${String(s.emptyTplHidden).padEnd(5)} emptyTplCards=[${s.emptyTplCards}]  head="${(s.emptyTplHead || "").slice(0, 46)}"`);
}

console.log("\n=== 判据 ===");
let bad = 0;
for (const s of seq) {
  // 0 行且空状态里的卡片与当前词无关 → 残留嫌疑
  const headHasTerm = s.emptyTplHead.includes(s.q);
  if (s.rows === 0 && !s.emptyTplHidden && !headHasTerm) { bad++; console.log(`  ⚠ 残留：q=${s.q} 但 head 讲的是别的词：「${s.emptyTplHead.slice(0, 70)}」`); }
  if (s.stripHidden && s.stripCards.length) { bad++; console.log(`  ⚠ strip 隐藏但里面还有卡片 [${s.stripCards}]`); }
}
console.log(bad ? `可疑 ${bad} 处` : "无残留");

await p.close(); await b.close();
