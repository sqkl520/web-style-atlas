// 第二轮验收：补齐芯片路径（餐厅 / 咖啡店 / 甜品 无芯片）与文案真实性断言。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const SHOT = "deliverables/62-exec/tpl-integration";
const out = {};

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1300 });

const snap = () => p.eval(() => {
  const strip = document.getElementById("tpl-strip");
  const emptyTpl = document.getElementById("empty-tpl");
  return {
    count: document.getElementById("count").textContent,
    rows: document.querySelectorAll("#ledger .row").length,
    rowIds: [...document.querySelectorAll("#ledger .row")].map((r) => r.getAttribute("data-id")),
    stripVisible: !strip.hidden,
    stripLead: strip.hidden ? "" : document.getElementById("tpl-strip-lead").textContent.replace(/\s+/g, " ").trim(),
    stripTpls: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.getAttribute("data-tpl")),
    stripLinks: [...document.querySelectorAll("#tpl-cards .tpl-open")].map((a) => a.getAttribute("href")),
    emptyTplVisible: !emptyTpl.hidden,
    emptyTplHead: emptyTpl.hidden ? "" : (emptyTpl.querySelector(".tpl-empty-head") || {}).textContent || "",
    emptyTplLinks: [...document.querySelectorAll("#empty-tpl a")].map((a) => a.getAttribute("href")),
  };
});

async function chip(term) {
  await p.eval(() => {
    const q = document.getElementById("q");
    q.value = "";
    q.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 200));
  // 目标词可能收在「还有 N 个只有近似的」里，先展开再点。
  await p.eval(() => {
    const t = document.querySelector(".scene-toggle");
    if (t && t.textContent.indexOf("还有") === 0) t.click();
  });
  await new Promise((r) => setTimeout(r, 150));
  const clicked = await p.eval((term) => {
    const chips = [...document.querySelectorAll("#flt-scene button, .scene-more button")];
    const c = chips.find((x) => x.getAttribute("data-scene") === term);
    if (!c) return { found: false, all: chips.map((x) => x.getAttribute("data-scene")) };
    c.click();
    return { found: true, badge: (c.querySelector(".scene-tpl") || {}).textContent || "" };
  }, term);
  await new Promise((r) => setTimeout(r, 320));
  return { clicked, state: await snap() };
}

out.chip_restaurant = await chip("餐厅");
await p.screenshot({ path: `${SHOT}/shot-1440-chip-restaurant.jpg`, format: "jpeg", quality: 84 });

out.chip_coffee = await chip("咖啡店");
await p.screenshot({ path: `${SHOT}/shot-1440-chip-coffee.jpg`, format: "jpeg", quality: 84 });

out.chip_florist = await chip("花店");
out.chip_design = await chip("设计工作室");

// 清空后回到 30/30
await p.eval(() => document.getElementById("reset").click());
await new Promise((r) => setTimeout(r, 350));
out.after_reset = await snap();

// 搜索路径（直接打词）
async function search(q) {
  await p.eval((q) => {
    const el = document.getElementById("q");
    el.value = q;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, q);
  await new Promise((r) => setTimeout(r, 320));
  return snap();
}
out.q_restaurant = await search("餐厅");
out.q_cafe = await search("咖啡店");
out.q_dessert = await search("甜品");
out.q_lawyer = await search("律师");

out.pageErrors = p.consoleErrors.slice(0, 6);
console.log(JSON.stringify(out, null, 1));
await b.close();
