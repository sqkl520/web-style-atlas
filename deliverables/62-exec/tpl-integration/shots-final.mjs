// 最终截图：三个验收场景各一张，另加 768 / 390 两档看模板带是否挤坏版式。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const SHOT = "deliverables/62-exec/tpl-integration";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1300 });

async function search(q) {
  await p.eval((q) => {
    const el = document.getElementById("q");
    el.value = q;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, q);
  await new Promise((r) => setTimeout(r, 350));
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
}

const results = {};
async function shot(name) {
  await p.screenshot({ path: `${SHOT}/${name}.jpg`, format: "jpeg", quality: 84 });
  results[name] = await p.eval(() => {
    const s = document.getElementById("tpl-strip");
    const r = s.hidden ? null : s.getBoundingClientRect();
    return {
      count: document.getElementById("count").textContent,
      stripTop: r ? Math.round(r.top) : null,
      stripInViewport: r ? (r.top < window.innerHeight && r.bottom > 0) : false,
      tpls: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.getAttribute("data-tpl")),
    };
  });
}

await search("餐厅");
await shot("final-1440-restaurant");

await search("甜品");
await shot("final-1440-dessert");

await search("酒吧");
await shot("final-1440-bar");

await chip("咖啡店");
await shot("final-1440-chip-coffee");

await chip("设计工作室");
await shot("final-1440-chip-design");

// 清空
await p.eval(() => document.getElementById("reset").click());
await new Promise((r) => setTimeout(r, 400));
await shot("final-1440-reset");

// 768 档
await p.setViewport({ width: 768, height: 1024, mobile: false });
await new Promise((r) => setTimeout(r, 300));
await search("餐厅");
await shot("final-768-restaurant");
await search("甜品");
await shot("final-768-dessert");

// 390 档
await p.setViewport({ width: 390, height: 844, mobile: true });
await new Promise((r) => setTimeout(r, 300));
await search("餐厅");
await shot("final-390-restaurant");
await search("甜品");
await shot("final-390-dessert");

console.log(JSON.stringify(results, null, 1));
await b.close();
