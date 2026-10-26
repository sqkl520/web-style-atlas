// 几何复核：点「咖啡店」芯片后，模板带到底在不在视口里、坐标多少。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1300 });

const chips = await p.eval(() => [...document.querySelectorAll("#flt-scene button, .scene-more button")]
  .map((c) => c.getAttribute("data-scene") + (c.querySelector(".scene-tpl") ? " [tpl]" : "")));
console.log("chips:", chips.join(", "));

await p.eval(() => {
  const c = [...document.querySelectorAll("#flt-scene button, .scene-more button")]
    .find((x) => x.getAttribute("data-scene") === "咖啡店");
  c.click();
});
await new Promise((r) => setTimeout(r, 400));

const geo = await p.eval(() => {
  const s = document.getElementById("tpl-strip");
  const r = s.getBoundingClientRect();
  const cs = getComputedStyle(s);
  return {
    hidden: s.hidden,
    display: cs.display,
    rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width) },
    scrollY: window.scrollY,
    count: document.getElementById("count").textContent,
    lead: document.getElementById("tpl-strip-lead").textContent.slice(0, 80),
    parent: s.parentElement.className,
    prevSib: s.previousElementSibling ? s.previousElementSibling.className : null,
    nextSib: s.nextElementSibling ? s.nextElementSibling.className : null,
    cards: document.querySelectorAll("#tpl-cards .tpl-card").length,
  };
});
console.log("geo:", JSON.stringify(geo, null, 1));

// 强制滚到模板带再截一张
await p.eval(() => document.getElementById("tpl-strip").scrollIntoView({ block: "center" }));
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({ path: "deliverables/62-exec/tpl-integration/shot-1440-chip-coffee-strip.jpg", format: "jpeg", quality: 84 });
await b.close();
