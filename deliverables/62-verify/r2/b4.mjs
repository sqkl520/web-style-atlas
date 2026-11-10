// 路线 B-4：卡片警告 vs 详情提示语是否互相否定；「不适合」是否真在「适用场景」段末
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9583/prototypes/_selection/index.html";
const OUT = "D:/Web/style/deliverables/62-verify/r2";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1600 });

/* 1) 每行卡片上的警告文本 */
const cards = await p.eval(() => {
  return [...document.querySelectorAll("#ledger > li")].map((li) => ({
    id: li.dataset.id,
    text: li.textContent.replace(/\s+/g, " ").trim(),
    warnEls: [...li.querySelectorAll("*")].filter((e) => e.children.length === 0 && /⚠|留空|留洞|撑不住|少于/.test(e.textContent)).map((e) => e.textContent.trim()),
  }));
});

/* 2) 逐案打开详情，取提示语 + 「适用场景」字段块 + 「不适合」位置 */
const details = [];
for (let i = 0; i < 30; i++) {
  await p.eval((idx) => {
    const rows = [...document.querySelectorAll("#ledger > li")];
    rows[idx].click();
  }, i);
  await new Promise((r) => setTimeout(r, 220));
  const d = await p.eval(() => {
    const host = document.getElementById("d-body");
    const btn = host.querySelector(".prompt-copy");
    const hint = host.querySelector(".prompt-cta span");
    // 找字段块：详情是 dl/dt/dd 还是 div 结构？
    const labels = [...host.querySelectorAll("dt, .k, .field-k, h4")].map((e) => e.textContent.trim());
    // 「不适合」文本所在的最小元素
    const leaf = [...host.querySelectorAll("*")].filter((e) => e.children.length === 0 && /不适合/.test(e.textContent.trim()));
    let where = null;
    if (leaf.length) {
      const el = leaf[0];
      // 向上找带字段名的容器
      let n = el, chain = [];
      for (let k = 0; k < 4 && n; k++) { chain.push(n.tagName + (n.className ? "." + String(n.className).split(" ")[0] : "")); n = n.parentElement; }
      // 该元素在页面中的 y 位置（相对详情顶部）
      const hostRect = host.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      where = {
        snippet: el.textContent.trim().slice(0, 130),
        relY: Math.round(r.top - hostRect.top),
        chain: chain.join(" < "),
        prevLabelText: (() => {
          // 往前找最近的 dt/字段名
          let prev = el;
          while (prev && !/适用场景|不适合/.test(prev.textContent)) prev = prev.previousElementSibling || prev.parentElement;
          return prev ? prev.textContent.replace(/\s+/g, " ").trim().slice(0, 120) : null;
        })(),
      };
    }
    return {
      id: document.getElementById("d-no").textContent.trim(),
      copyBtn: btn ? btn.textContent.trim() : null,
      hint: hint ? hint.textContent.trim() : null,
      labels: labels.slice(0, 20),
      buhe: where,
      // 该字段块的完整文本（用于判断"段末"）
      sceneField: (() => {
        const idx = labels.findIndex((x) => /适用场景/.test(x));
        if (idx < 0) return null;
        const dts = [...host.querySelectorAll("dt")];
        const dt = dts.find((x) => /适用场景/.test(x.textContent));
        if (!dt) return null;
        const dd = dt.nextElementSibling;
        return { label: dt.textContent.trim(), value: dd ? dd.textContent.replace(/\s+/g, " ").trim() : null, valueTail: dd ? dd.textContent.trim().slice(-160) : null };
      })(),
    };
  });
  details.push(d);
  await p.eval(() => document.getElementById("d-close").click());
  await new Promise((r) => setTimeout(r, 120));
}

writeFileSync(OUT + "/b4-hints.json", JSON.stringify({ cards, details }, null, 1), "utf8");

/* 3) 交叉判定：卡片警告 vs 提示语 */
console.log("=== 卡片有警告，但详情提示语说「都行」 ===");
const conflict = [];
for (const c of cards) {
  const d = details.find((x) => x.id === c.id);
  const cardWarn = /⚠|留空位|留洞|撑不住/.test(c.text);
  const hintOk = d && /都行/.test(d.hint || "");
  if (cardWarn && hintOk) conflict.push({ id: c.id, cardWarn: c.warnEls, hint: d.hint });
}
console.log(conflict.length ? JSON.stringify(conflict, null, 1) : "无");

console.log("\n=== 「适用场景」字段是否存在 + 不适合是否在其段末 ===");
for (const d of details) {
  const has = d.sceneField ? "有" : "无";
  const inScene = d.buhe && d.sceneField && d.sceneField.value && d.sceneField.value.includes("不适合") ? "在" : "不在";
  console.log(`${d.id} 字段=${has} 不适合=${d.buhe ? "有" : "无"}/${inScene} 段末=「${d.sceneField ? String(d.sceneField.valueTail).slice(-60) : "-"}」`);
}
console.log("\n=== 详情字段名（第一案） ===");
console.log(JSON.stringify(details[0].labels, null, 0));

await p.close();
await b.close();
