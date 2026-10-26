// 空状态文案逐词核对：把 #empty-tpl 的正文与 #empty 的正文原文打出来，
// 人读一遍有没有"说反了/说过头了"。tpl 列同时读 #tpl-cards（有行）与 #empty-tpl（无行）。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9560/prototypes/_selection/index.html";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1300 });

const terms = ["餐厅", "咖啡店", "甜品", "酒吧", "美甲", "律师", "作品集", "摄影", "设计工作室", "潮牌", "修鞋理发", "小吃店", "电商", "民宿", "花店", "烘焙", "婚礼", "会计"];
for (const t of terms) {
  await p.eval((q) => {
    const el = document.getElementById("q");
    el.value = q;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, t);
  await new Promise((r) => setTimeout(r, 130));
  const s = await p.eval(() => {
    const strip = document.getElementById("tpl-strip");
    const et = document.getElementById("empty-tpl");
    const cards = strip.hidden
      ? [...document.querySelectorAll("#empty-tpl .tpl-card")]
      : [...document.querySelectorAll("#tpl-cards .tpl-card")];
    return {
      rows: document.querySelectorAll("#ledger .row").length,
      strip: strip.hidden ? "" : document.getElementById("tpl-strip-lead").textContent.replace(/\s+/g, " ").trim(),
      head: et.hidden ? "" : (et.querySelector(".tpl-empty-head") || {}).textContent || "",
      cards: cards.map((c) => c.getAttribute("data-tpl")),
      why: (et.querySelector(".tpl-why") || {}).textContent || "",
    };
  });
  console.log("\n─── " + t + "  rows=" + s.rows + "  卡片=[" + s.cards.join(",") + "]");
  if (s.strip) console.log("STRIP: " + s.strip);
  if (s.head) console.log("HEAD : " + s.head);
  if (s.why) console.log("WHY  : " + s.why.slice(0, 200) + "…");
}
console.log("\npageErrors:", p.consoleErrors.slice(0, 5));
await b.close();
