/* 探针 13：咖啡馆 vs 咖啡店 的别名单向性；餐厅 chip 的行；以及「餐厅 咖啡馆」这种多词搜索 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const S = () => ({
  rows: [...document.querySelectorAll("#ledger .row")].map((x) => x.getAttribute("data-id")),
  count: (document.getElementById("count") || {}).textContent,
  stripHidden: (document.getElementById("tpl-strip") || {}).hidden,
  lead: (document.getElementById("tpl-strip-lead") || {}).textContent,
  emptyHead: (document.querySelector("#empty-tpl .tpl-empty-head") || {}).textContent,
  tplCards: [...document.querySelectorAll("#tpl-cards .tpl-card, #empty-tpl .tpl-card")].map((x) => x.getAttribute("data-tpl")),
});
const setQ = (q) => {
  const inp = document.getElementById("q");
  inp.value = q;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const out = [];
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1800 });
  for (const q of ["咖啡馆", "咖啡店", "餐厅", "茶饮", "民宿", "花店", "理发店", "甜品", "律师"]) {
    await page.eval(setQ, q);
    await sleep(400);
    const r = await page.eval(S);
    out.push({ q, ...r });
    console.log(`\n「${q}」 行 ${r.rows.length} [${r.rows.join(" ")}]  count「${r.count}」`);
    console.log(`   strip hidden=${r.stripHidden} cards=[${r.tplCards}]`);
    console.log(`   lead「${(r.lead || "").slice(0, 120)}」`);
    if (r.emptyHead) console.log(`   empty「${r.emptyHead.slice(0, 120)}」`);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "alias.json"), JSON.stringify(out, null, 2), "utf8");
