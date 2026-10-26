// 最终验收（放在所有改动之后跑一遍，数字进交付报告）。
// 覆盖：餐厅 / 甜品 / 酒吧 / 咖啡店芯片 / 清空 / 三档溢出 / 白名单回归 / 控制台异常。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1300 });

const snap = () => p.eval(() => {
  const strip = document.getElementById("tpl-strip");
  const et = document.getElementById("empty-tpl");
  return {
    count: document.getElementById("count").textContent,
    rows: document.querySelectorAll("#ledger .row").length,
    rowIds: [...document.querySelectorAll("#ledger .row")].map((r) => r.getAttribute("data-id")).join(" "),
    stripVisible: !strip.hidden,
    stripLead: strip.hidden ? "" : document.getElementById("tpl-strip-lead").textContent,
    stripTpls: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.getAttribute("data-tpl")),
    emptyTplVisible: !et.hidden,
    emptyHead: et.hidden ? "" : (et.querySelector(".tpl-empty-head") || {}).textContent || "",
    emptyTplCards: [...document.querySelectorAll("#empty-tpl .tpl-card")].map((c) => c.getAttribute("data-tpl")),
  };
});

async function search(q) {
  await p.eval((q) => {
    const el = document.getElementById("q");
    el.value = q;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, q);
  await new Promise((r) => setTimeout(r, 350));
  return snap();
}
async function chip(term) {
  await p.eval(() => {
    const q = document.getElementById("q");
    q.value = "";
    q.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 200));
  await p.eval((term) => {
    const c = [...document.querySelectorAll("#flt-scene button, .scene-more button")]
      .find((x) => x.getAttribute("data-scene") === term);
    if (c) c.click();
  }, term);
  await new Promise((r) => setTimeout(r, 350));
  return snap();
}

const R = {};
R["1_initial"] = await snap();
R["2_search_restaurant"] = await search("餐厅");
R["3_search_dessert"] = await search("甜品");
R["4_search_bar"] = await search("酒吧");
R["5_chip_coffee"] = await chip("咖啡店");
R["6_search_wedding_after_chip"] = await search("婚礼");

// 清空
await p.eval(() => document.getElementById("reset").click());
await new Promise((r) => setTimeout(r, 400));
R["7_reset"] = await snap();

// 白名单回归：模板仍然不能进 sceneIds（证明我们没有偷偷改那个契约）
R["8_whitelist"] = await p.eval(() => {
  window.benchSetSceneIds(["M02"]);
  const a = document.getElementById("count").textContent;
  window.benchSetSceneIds(["M02", "S06", "S19"]);
  const b2 = document.getElementById("count").textContent;
  window.benchSetSceneIds([]);
  return { m02_only: a, m02_and_two: b2 };
});
await new Promise((r) => setTimeout(r, 300));

// 三档溢出：分别在有模板带（餐厅芯片 / 咖啡店芯片）与空状态模板块（餐厅搜索 / 甜品）下测
const overflow = {};
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  await p.setViewport({ width: w, height: h, mobile: w < 500 });
  await new Promise((r) => setTimeout(r, 300));
  const rec = {};
  const m = () => p.eval(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
  await search("餐厅"); rec.empty_restaurant = await m();
  await search("甜品"); rec.empty_dessert = await m();
  await chip("咖啡店"); rec.strip_coffee = await m();
  await chip("设计工作室"); rec.strip_design = await m();
  await p.eval(() => document.getElementById("reset").click());
  await new Promise((r) => setTimeout(r, 300));
  rec.reset_30 = await m();
  overflow[w + "x" + h] = rec;
}
R["9_overflow"] = overflow;
R["10_errors"] = p.consoleErrors.slice(0, 6);

console.log(JSON.stringify(R, null, 1));
await b.close();
