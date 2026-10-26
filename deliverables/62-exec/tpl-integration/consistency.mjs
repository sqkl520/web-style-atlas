// 一致性扫描：对 44 个 sceneIndex 词各跑一遍「直接搜索」，把
//   搜索命中行数 / strip 文案 / 空状态文案 / sceneIndex.direct
// 摆在一起，专门找"界面说的"和"索引事实"互相矛盾的地方。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1300 });

const terms = await p.eval(() => Object.keys(window.STYLE_PROMPTS.sceneIndex));
const rows = [];
for (const t of terms) {
  await p.eval((q) => {
    const el = document.getElementById("q");
    el.value = q;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, t);
  await new Promise((r) => setTimeout(r, 90));
  const s = await p.eval((t) => {
    const strip = document.getElementById("tpl-strip");
    const et = document.getElementById("empty-tpl");
    const idx = window.STYLE_PROMPTS.sceneIndex[t] || {};
    const hit = window.benchTemplateHits(t);
    return {
      t,
      direct: (idx.direct || []).length,
      rows: document.querySelectorAll("#ledger .row").length,
      stripLead: strip.hidden ? "" : document.getElementById("tpl-strip-lead").textContent,
      stripTpls: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.getAttribute("data-tpl")),
      emptyHead: et.hidden ? "" : (et.querySelector(".tpl-empty-head") || {}).textContent || "",
      exact: hit.exact,
      adjacent: hit.adjacent,
    };
  }, t);
  rows.push(s);
}

// 断言：空状态里说"没有专案"的，不能是该词有 direct 方案的情况
const bad = [];
for (const r of rows) {
  if (r.emptyHead && r.direct > 0 && /没有「/.test(r.emptyHead) && /专案/.test(r.emptyHead)) {
    bad.push({ term: r.t, direct: r.direct, rows: r.rows, head: r.emptyHead.slice(0, 120) });
  }
  if (r.stripTpls.length && /有别的一个/.test(r.stripLead)) bad.push({ term: r.t, issue: "数量词错误" });
}
console.log("=== 所有 44 个索引词 ===");
console.log(rows.map((r) =>
  `${r.t.padEnd(6)} direct=${String(r.direct).padEnd(2)} rows=${String(r.rows).padEnd(2)} tpl=[${r.stripTpls.join(",")}] empty=${r.emptyHead ? "Y" : "-"}`
).join("\n"));
console.log("\n=== 矛盾项 ===");
console.log(bad.length ? JSON.stringify(bad, null, 1) : "（无）");
console.log("\npageErrors:", p.consoleErrors.slice(0, 5));
await b.close();
