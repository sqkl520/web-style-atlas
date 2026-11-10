// 路线 B-2：44 个芯片逐个点 + 非行业词搜索时模板带/lead 是否清空
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9583/prototypes/_selection/index.html";
const OUT = "D:/Web/style/deliverables/62-verify/r2";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1600 });

const state = () => p.eval(() => {
  const q = document.getElementById("q");
  const strip = document.getElementById("tpl-strip");
  const empty = document.getElementById("empty");
  const et = document.getElementById("empty-tpl");
  const pressed = document.querySelector('#flt-scene button[aria-pressed="true"], .scene-more button[aria-pressed="true"]');
  return {
    q: q.value,
    rows: document.querySelectorAll("#ledger > li").length,
    count: document.getElementById("count").textContent.trim(),
    pressed: pressed ? pressed.dataset.scene : null,
    stripHidden: strip.hidden,
    lead: document.getElementById("tpl-strip-lead").textContent.trim(),
    stripCards: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.dataset.tpl),
    emptyHidden: empty.hidden,
    emptyTplHidden: et.hidden,
    emptyTplHead: (et.querySelector(".tpl-empty-head") || {}).textContent ? et.querySelector(".tpl-empty-head").textContent.trim() : "",
    emptyTplCards: [...et.querySelectorAll(".tpl-card")].map((c) => c.dataset.tpl),
  };
});

const clearAll = async () => {
  await p.eval(() => {
    const q = document.getElementById("q");
    q.value = "";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("reset").click();
  });
  await new Promise((r) => setTimeout(r, 260));
};

/* 全部芯片词（含折叠区） */
const terms = await p.eval(() => {
  const vis = [...document.querySelectorAll("#flt-scene button[data-scene]")].map((x) => x.dataset.scene);
  const more = [...document.querySelectorAll(".scene-more button[data-scene]")].map((x) => x.dataset.scene);
  return { vis, more, total: vis.length + more.length };
});

const sweep = [];
for (const t of [...terms.vis, ...terms.more]) {
  await clearAll();
  await p.eval((term) => {
    const all = [...document.querySelectorAll("#flt-scene button, .scene-more button")];
    const btn = all.find((x) => x.getAttribute("data-scene") === term);
    if (!btn) return false;
    const more = document.querySelector(".scene-more");
    const tog = document.querySelector(".scene-toggle");
    if (more && more.contains(btn) && more.style.display === "none" && tog) tog.click();
    btn.click();
    return true;
  }, t);
  await new Promise((r) => setTimeout(r, 300));
  const s = await state();
  const meta = await p.eval((term) => {
    const v = window.STYLE_PROMPTS.sceneIndex[term] || {};
    const hit = window.benchTemplateHits(term);
    return { direct: v.direct || [], near: v.near || [], exact: hit.exact, adjacent: hit.adjacent };
  }, t);
  sweep.push({ term: t, ...s, ...meta });
}

/* 非行业词搜索：模板带与 lead 是否清空 */
const nonIndustry = ["酒吧", "电商", "金融", "政务", "医疗", "zzzz", "S07", "报纸"];
const nonInd = [];
for (const t of nonIndustry) {
  await clearAll();
  await p.eval((term) => {
    const q = document.getElementById("q");
    q.value = term;
    q.dispatchEvent(new Event("input", { bubbles: true }));
  }, t);
  await new Promise((r) => setTimeout(r, 350));
  nonInd.push({ term: t, ...(await state()) });
}

/* 「先点芯片再打字」：最容易触发 lead 残留的顺序 */
await clearAll();
await p.eval(() => {
  const btn = [...document.querySelectorAll("#flt-scene button")].find((x) => x.dataset.scene === "设计工作室");
  btn.click();
});
await new Promise((r) => setTimeout(r, 350));
const beforeType = await state();
await p.eval(() => {
  const q = document.getElementById("q");
  q.value = "zzz";
  q.dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 350));
const afterType = await state();

writeFileSync(OUT + "/b2-chips.json", JSON.stringify({ terms, sweep, nonInd, beforeType, afterType }, null, 1), "utf8");

/* 汇总可疑项 */
console.log("芯片总数:", terms.total, "(可见", terms.vis.length, "+ 折叠", terms.more.length, ")");
console.log("\n=== 芯片点下后 0 行（芯片存在但筛不出东西） ===");
const zero = sweep.filter((s) => s.rows === 0);
console.log(zero.length ? zero.map((s) => `${s.term}(direct=${s.direct.join(",")} near=${s.near.join(",")})`).join("\n") : "无");

console.log("\n=== 芯片说有方案，但模板带/空状态口径打架 ===");
for (const s of sweep) {
  const claimsHas = s.direct.length + s.near.length > 0;
  if (s.rows === 0 && claimsHas) console.log(`  ${s.term}: rows=0 但 sceneIndex 有 ${[...s.direct, ...s.near].join(",")}`);
  // 有行但 strip 隐藏、也没有模板卡 → 模板层信息丢失
  if (s.rows > 0 && s.stripHidden) console.log(`  ${s.term}: rows=${s.rows} 但 strip 隐藏`);
  // 0 行时 lead 泄漏
  if (s.rows === 0 && s.lead) console.log(`  ${s.term}: 0 行但 lead 有残留：「${s.lead.slice(0, 80)}」`);
  // 空状态里说"搜索框找不到"但其实是芯片点的（q 为空）
  if (s.rows === 0 && s.emptyTplHead && s.emptyTplHead.includes("搜索框")) console.log(`  ${s.term}: 芯片点击却出现「搜索框找不到」文案`);
}

console.log("\n=== 非行业词搜索 ===");
for (const n of nonInd) console.log(`  ${n.term}: rows=${n.rows} stripHidden=${n.stripHidden} lead="${n.lead.slice(0, 70)}" emptyTplHead="${(n.emptyTplHead || "").slice(0, 90)}"`);

console.log("\n=== 先点芯片再打字（lead 残留测试） ===");
console.log("  打字前:", JSON.stringify({ rows: beforeType.rows, lead: beforeType.lead.slice(0, 90), stripHidden: beforeType.stripHidden }));
console.log("  打字后:", JSON.stringify({ q: afterType.q, rows: afterType.rows, lead: afterType.lead.slice(0, 90), stripHidden: afterType.stripHidden, cards: afterType.stripCards, emptyTplCards: afterType.emptyTplCards }));

await p.close();
await b.close();
