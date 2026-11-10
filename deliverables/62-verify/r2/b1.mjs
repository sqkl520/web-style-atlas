// 路线 B：真机复验 9 项声称里涉及 UI 的部分（CDP，自写断言）
import { writeFileSync, mkdirSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9583/prototypes/_selection/index.html";
const OUT = "D:/Web/style/deliverables/62-verify/r2";
mkdirSync(OUT, { recursive: true });
const result = {};
const log = (...a) => console.log(...a);

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1600 });

/* ── 基础：页面是否符合契约 ── */
const base = await p.eval(() => {
  const $ = (s) => document.querySelector(s);
  const rows = [...document.querySelectorAll("#ledger > li")];
  return {
    rowCount: rows.length,
    count: $("#count") ? $("#count").textContent.trim() : null,
    total: $("#f-total") ? $("#f-total").textContent.trim() : null,
    clean: $("#f-clean") ? $("#f-clean").textContent.trim() : null,
    built: $("#f-built") ? $("#f-built").textContent.trim() : null,
    shots: $("#f-shots") ? $("#f-shots").textContent.trim() : null,
    chipCount: document.querySelectorAll("#flt-scene button").length,
    moreChipCount: document.querySelectorAll(".scene-more button[data-scene]").length,
    sceneIndexKeys: Object.keys(window.STYLE_PROMPTS.sceneIndex).length,
    unsupported: (window.STYLE_PROMPTS.unsupported || []).length,
    jsErrors: [],
  };
});
result.base = base;
log("base:", JSON.stringify(base));

/* ── 声称 9：闸门达标/不达标 ── */
const gate = await p.eval(() => {
  const S = window.SCHEMES;
  const pass = S.filter((r) => r.gate && r.gate.fail === 0);
  const fail = S.filter((r) => r.gate && r.gate.fail > 0);
  const noGate = S.filter((r) => !r.gate);
  return {
    total: S.length,
    passCount: pass.length,
    failCount: fail.length,
    noGate: noGate.length,
    failDetail: fail.map((r) => ({ id: r.id, fail: r.gate.fail, warn: r.gate.warn })),
    passIds: pass.map((r) => r.id),
    failIds: fail.map((r) => r.id),
  };
});
result.gate = gate;
log("gate:", JSON.stringify(gate));

/* ── 声称 1：搜「餐厅」 ── */
async function search(term) {
  await p.eval((t) => {
    const q = document.getElementById("q");
    q.value = t;
    q.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, term);
  await new Promise((r) => setTimeout(r, 450));
  return p.eval(() => {
    const strip = document.getElementById("tpl-strip");
    const emptyTpl = document.getElementById("empty-tpl");
    const empty = document.getElementById("empty");
    return {
      rows: document.querySelectorAll("#ledger > li").length,
      count: document.getElementById("count").textContent.trim(),
      stripHidden: strip.hidden,
      stripLead: document.getElementById("tpl-strip-lead").textContent.trim(),
      stripCards: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.dataset.tpl),
      stripCardText: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.textContent.replace(/\s+/g, " ").trim().slice(0, 120)),
      emptyHidden: empty.hidden,
      emptyTplHidden: emptyTpl.hidden,
      emptyTplText: emptyTpl.textContent.replace(/\s+/g, " ").trim().slice(0, 400),
      hiddenTplCards: [...document.querySelectorAll("#empty-tpl .tpl-card")].map((c) => c.dataset.tpl),
    };
  });
}

result.searchRestaurant = await search("餐厅");
log("\n搜「餐厅」:", JSON.stringify(result.searchRestaurant, null, 1));

/* ── 声称 1：点「餐厅」芯片 4/30 ── */
async function clearAll() {
  await p.eval(() => {
    const q = document.getElementById("q");
    q.value = "";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("reset").click();
  });
  await new Promise((r) => setTimeout(r, 400));
}
await clearAll();

async function clickChip(term) {
  const ok = await p.eval((t) => {
    const all = [...document.querySelectorAll("#flt-scene button, .scene-more button")];
    const b = all.find((x) => x.getAttribute("data-scene") === t);
    if (!b) return false;
    // 若在折叠区，先展开
    const more = document.querySelector(".scene-more");
    if (more && more.contains(b)) {
      const tog = document.querySelector(".scene-toggle");
      if (tog && more.style.display === "none") tog.click();
    }
    b.click();
    return true;
  }, term);
  await new Promise((r) => setTimeout(r, 450));
  if (!ok) return { term, found: false };
  return p.eval((t) => {
    const strip = document.getElementById("tpl-strip");
    return {
      term: t,
      rows: document.querySelectorAll("#ledger > li").length,
      count: document.getElementById("count").textContent.trim(),
      pressed: (document.querySelector('#flt-scene button[aria-pressed="true"], .scene-more button[aria-pressed="true"]') || {}).dataset?.scene || null,
      stripHidden: strip.hidden,
      lead: document.getElementById("tpl-strip-lead").textContent.trim(),
      cards: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.dataset.tpl),
      ids: [...document.querySelectorAll("#ledger > li")].map((li) => li.dataset.id || li.querySelector("[data-id]")?.dataset?.id || li.id),
    };
  }, term);
}

result.chipRestaurant = await clickChip("餐厅");
log("点「餐厅」芯片:", JSON.stringify(result.chipRestaurant, null, 1));

await clearAll();
result.chipCoffee = await clickChip("咖啡店");
log("点「咖啡店」芯片:", JSON.stringify(result.chipCoffee, null, 1));

await clearAll();
result.chipDesign = await clickChip("设计工作室");
log("点「设计工作室」芯片:", JSON.stringify(result.chipDesign, null, 1));

writeFileSync(OUT + "/b-basic.json", JSON.stringify(result, null, 1), "utf8");
await p.close();
await b.close();
log("\nwrote b-basic.json");
