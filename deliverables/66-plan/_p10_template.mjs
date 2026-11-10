/* 探针 10：事实 2 的真实后果 —— 用真实 UI 走一遍「搜餐厅 / 搜咖啡馆 / 点餐厅芯片」，
 * 记录 #tpl-strip 是否出现、几张卡、lead 原文、芯片角标、行数。
 * 同时验证：模板卡是否已经在 sceneIndex 之外被接进来了（提交 87a0235「模板进反查」）。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const PROBE = () => ({
  hash: location.hash,
  q: (document.getElementById("q") || {}).value,
  rows: document.querySelectorAll("#ledger .row").length,
  count: (document.getElementById("count") || {}).textContent,
  stripHidden: (document.getElementById("tpl-strip") || {}).hidden,
  stripLead: (document.getElementById("tpl-strip-lead") || {}).textContent,
  tplCards: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((x) => x.getAttribute("data-tpl")),
  emptyHidden: (document.getElementById("empty-tpl") || {}).hidden,
  emptyHead: (document.querySelector("#empty-tpl .tpl-empty-head") || {}).textContent,
  emptyCards: [...document.querySelectorAll("#empty-tpl .tpl-card")].map((x) => x.getAttribute("data-tpl")),
  chips: [...document.querySelectorAll("#flt-scene button[data-scene], .scene-more button[data-scene]")].map((b) => ({
    term: b.getAttribute("data-scene"), pressed: b.getAttribute("aria-pressed"),
    cls: b.className, badge: (b.querySelector(".scene-tpl") || {}).textContent || "",
  })).filter((x) => ["餐厅", "咖啡店", "烘焙", "书店", "设计工作室", "作品集"].includes(x.term)),
});

function typeAndSearch(q) {
  const inp = document.getElementById("q");
  inp.value = q;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const out = {};
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1800 });
  await sleep(500);
  console.log("=== 初始 ===");
  console.log(JSON.stringify(await page.eval(PROBE), null, 1).slice(0, 900));

  for (const q of ["餐厅", "咖啡店", "咖啡馆", "烘焙", "餐厅 咖啡馆"]) {
    await page.eval(typeAndSearch, q);
    await sleep(450);
    const r = await page.eval(PROBE);
    console.log(`\n=== 搜索「${q}」 ===`);
    console.log(`  行数 ${r.rows} / count「${r.count}」`);
    console.log(`  strip hidden=${r.stripHidden} cards=[${r.tplCards}]`);
    console.log(`  lead「${r.stripLead}」`);
    console.log(`  empty hidden=${r.emptyHidden} head「${r.emptyHead}」 cards=[${r.emptyCards}]`);
  }

  // 清空搜索，点「餐厅」芯片
  await page.eval(typeAndSearch, "");
  await sleep(300);
  await page.eval(() => {
    const b = [...document.querySelectorAll("#flt-scene button[data-scene], .scene-more button[data-scene]")]
      .find((x) => x.getAttribute("data-scene") === "餐厅");
    if (b) b.click();
    return !!b;
  });
  await sleep(500);
  const r2 = await page.eval(PROBE);
  console.log(`\n=== 点「餐厅」芯片 ===`);
  console.log(`  行数 ${r2.rows} / count「${r2.count}」`);
  console.log(`  strip hidden=${r2.stripHidden} cards=[${r2.tplCards}]`);
  console.log(`  lead「${r2.stripLead}」`);

  // 点「咖啡店」芯片（README 词是咖啡馆，别名表要反过来查）
  await page.eval(() => {
    const b = [...document.querySelectorAll("#flt-scene button[data-scene], .scene-more button[data-scene]")]
      .find((x) => x.getAttribute("data-scene") === "咖啡店");
    if (b) b.click();
    return !!b;
  });
  await sleep(500);
  const r3 = await page.eval(PROBE);
  console.log(`\n=== 点「咖啡店」芯片 ===`);
  console.log(`  行数 ${r3.rows} / count「${r3.count}」`);
  console.log(`  strip hidden=${r3.stripHidden} cards=[${r3.tplCards}]`);
  console.log(`  lead「${r3.stripLead}」`);
  console.log(`  chips: ${JSON.stringify(r3.chips)}`);
  out.chipCoffee = r3;
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "template-ui.json"), JSON.stringify(out, null, 2), "utf8");
