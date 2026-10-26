// 窄屏定位：0 命中时模板块在 390 档位于 rail 之下（既有布局顺序，不是本次引入），
// 这里量出它的位置并滚过去截图，确认渲染正常、无横向溢出。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const SHOT = "deliverables/62-exec/tpl-integration";

const b = await Browser.launch({ width: 390, height: 844 });
const p = await b.newPage({ width: 390, height: 844, mobile: true });
await p.goto(URL, { settleMs: 1300 });

await p.eval(() => {
  const el = document.getElementById("q");
  el.value = "餐厅";
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));

const geo = await p.eval(() => {
  const et = document.getElementById("empty-tpl");
  const r = et.getBoundingClientRect();
  const de = document.documentElement;
  return {
    emptyTpl: { top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) },
    overflow: de.scrollWidth - de.clientWidth,
    scrollH: de.scrollHeight,
    cards: document.querySelectorAll("#empty-tpl .tpl-card").length,
    head: (et.querySelector(".tpl-empty-head") || {}).textContent,
  };
});
console.log("390 restaurant:", JSON.stringify(geo, null, 1));

await p.eval(() => document.getElementById("empty-tpl").scrollIntoView({ block: "start" }));
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({ path: `${SHOT}/final-390-restaurant-tpl.jpg`, format: "jpeg", quality: 84 });

// 768 档同样处理
await p.setViewport({ width: 768, height: 1024, mobile: false });
await new Promise((r) => setTimeout(r, 300));
await p.eval(() => {
  const el = document.getElementById("q");
  el.value = "甜品";
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));
const geo2 = await p.eval(() => {
  const et = document.getElementById("empty-tpl");
  const de = document.documentElement;
  return {
    overflow: de.scrollWidth - de.clientWidth,
    cards: document.querySelectorAll("#empty-tpl .tpl-card").length,
    why: ((et.querySelector(".tpl-why") || {}).textContent || "").slice(0, 90),
  };
});
console.log("768 dessert:", JSON.stringify(geo2, null, 1));
await p.eval(() => document.getElementById("empty-tpl").scrollIntoView({ block: "start" }));
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({ path: `${SHOT}/final-768-dessert-tpl.jpg`, format: "jpeg", quality: 84 });

await b.close();
