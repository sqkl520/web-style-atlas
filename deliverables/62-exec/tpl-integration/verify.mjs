// 验收探测：模板层接进行业反查之后，三件事必须同时成立
//   1) 搜「餐厅」→ 列表上方出现 M02 入口（不是混进 30 行、也不改 #count）
//   2) 搜「甜品」→ 0 行 → 空状态给相邻候选 M02 并说清"README 没有甜品"
//   3) 点「咖啡店」芯片 → 仍然只筛 S\d{2}，行数 4/30，模板不污染计数
//   4) 清空筛选 → 30/30
//   5) 三档视口横向溢出 0
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
    emptyHidden: document.getElementById("empty").hidden,
    emptyText: document.getElementById("empty").hidden ? "" : document.getElementById("empty").textContent.replace(/\s+/g, " ").trim(),
    stripVisible: !strip.hidden,
    stripLead: strip.hidden ? "" : document.getElementById("tpl-strip-lead").textContent.replace(/\s+/g, " ").trim(),
    stripTpls: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.getAttribute("data-tpl")),
    stripLinks: [...document.querySelectorAll("#tpl-cards .tpl-open")].map((a) => a.getAttribute("href")),
    emptyTplVisible: !emptyTpl.hidden,
    emptyTplText: emptyTpl.hidden ? "" : emptyTpl.textContent.replace(/\s+/g, " ").trim().slice(0, 700),
    emptyTplLinks: [...document.querySelectorAll("#empty-tpl a")].map((a) => a.getAttribute("href")),
  };
});

async function search(q) {
  await p.eval((q) => {
    const el = document.getElementById("q");
    el.value = q;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, q);
  await new Promise((r) => setTimeout(r, 300));
  return snap();
}

out.initial = await snap();

// —— 1 搜「餐厅」
out.q_restaurant = await search("餐厅");
await p.screenshot({ path: `${SHOT}/shot-1440-restaurant.jpg`, format: "jpeg", quality: 82 });

// —— 2 搜「甜品」（0 行）
out.q_dessert = await search("甜品");
await p.screenshot({ path: `${SHOT}/shot-1440-dessert.jpg`, format: "jpeg", quality: 82 });

// —— 2b 搜「酒吧」「美甲」「电商」（模板层也没有）
out.q_bar = await search("酒吧");
await p.screenshot({ path: `${SHOT}/shot-1440-bar.jpg`, format: "jpeg", quality: 82 });
out.q_nail = await search("美甲");

// —— 3 点「咖啡店」芯片（清空搜索框回到 30 行再点）
await p.eval(() => {
  document.getElementById("q").value = "";
  document.getElementById("q").dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 250));
out.chip_coffee = await p.eval(() => {
  const chips = [...document.querySelectorAll("#flt-scene button, .scene-more button")];
  const chip = chips.find((c) => c.getAttribute("data-scene") === "咖啡店");
  if (!chip) return { error: "chip not found" };
  chip.click();
  return { clicked: true, badge: (chip.querySelector(".scene-tpl") || {}).textContent || "" };
});
await new Promise((r) => setTimeout(r, 300));
out.chip_coffee_after = await snap();
await p.screenshot({ path: `${SHOT}/shot-1440-chip-coffee.jpg`, format: "jpeg", quality: 82 });

// —— 4 清空筛选
await p.eval(() => document.getElementById("reset").click());
await new Promise((r) => setTimeout(r, 350));
out.after_reset = await snap();

// —— 5 白名单仍然吞模板（回归：证明我们没去动 sceneIds）
out.whitelist_guard = await p.eval(() => {
  window.benchSetSceneIds(["M02"]);
  const a = document.getElementById("count").textContent;
  window.benchSetSceneIds(["M02", "S06", "S19"]);
  const bb = document.getElementById("count").textContent;
  window.benchClearSceneIds();
  return { m02_only: a, m02_mix: bb };
});
await new Promise((r) => setTimeout(r, 300));

// —— 6 模板反查纯函数（数据层断言）
out.tpl_hits = await p.eval(() => {
  const terms = ["餐厅", "咖啡店", "甜品", "酒吧", "美甲", "律师", "律所", "作品集", "摄影", "设计工作室", "电商", "民宿", "花店", "烘焙"];
  const o = {};
  for (const t of terms) o[t] = window.benchTemplateHits(t);
  return o;
});

// —— 7 三档视口溢出（每个视口都重新 30 行 + 有模板带的状态）
const overflow = {};
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  await p.setViewport({ width: w, height: h, mobile: w < 500 });
  await new Promise((r) => setTimeout(r, 250));
  // 先测"餐厅"（有模板带），再测"甜品"（空状态模板块）
  await p.eval(() => {
    const el = document.getElementById("q");
    el.value = "餐厅";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 250));
  const withStrip = await p.eval(() => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflow: de.scrollWidth - de.clientWidth };
  });
  await p.eval(() => {
    const el = document.getElementById("q");
    el.value = "甜品";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 250));
  const withEmpty = await p.eval(() => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflow: de.scrollWidth - de.clientWidth };
  });
  overflow[w + "x" + h] = { strip: withStrip, empty: withEmpty };
  await p.screenshot({ path: `${SHOT}/shot-${w}x${h}-dessert.jpg`, format: "jpeg", quality: 80 });
}
out.overflow = overflow;

// —— 8 控制台异常
out.pageErrors = p.consoleErrors.slice(0, 6);

console.log(JSON.stringify(out, null, 1));
await b.close();
