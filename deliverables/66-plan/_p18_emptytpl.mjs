/* 探针 18：模板层在「搜餐厅」时到底看不看得见。
 * 量 #empty-tpl 的 y 坐标与首屏（390×844 / 1440×900），以及它是否在 #ledger 之后。
 * 这是判「事实 2 的后果」的关键：如果模板卡落在首屏内，那"界面在给他看方案"就不成立。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const FN = () => {
  const box = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { top: +r.top.toFixed(1), h: +r.height.toFixed(1), hidden: !!e.hidden };
  };
  return {
    scrollY: window.scrollY,
    docH: document.documentElement.scrollHeight,
    mast: box("header.mast") || box(".mast"),
    rail: box("aside.rail") || box(".rail"),
    ledger: box("#ledger"),
    empty: box("#empty-tpl"),
    strip: box("#tpl-strip"),
    emptyHead: (document.querySelector("#empty-tpl .tpl-empty-head") || {}).textContent || "",
    emptyCards: [...document.querySelectorAll("#empty-tpl .tpl-card")].map((x) => x.getAttribute("data-tpl")),
    viewportH: window.innerHeight,
  };
};

const setQ = (q) => {
  const inp = document.getElementById("q");
  inp.value = q;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const out = {};
try {
  for (const vp of [{ k: "1440", w: 1440, h: 900, mobile: false }, { k: "390", w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
    await page.eval(setQ, "餐厅");
    await sleep(600);
    const r = await page.eval(FN);
    out[vp.k] = r;
    console.log(`\n=== ${vp.k} viewportH=${r.viewportH} docH=${r.docH} ===`);
    console.log(`  mast ${JSON.stringify(r.mast)}`);
    console.log(`  rail ${JSON.stringify(r.rail)}`);
    console.log(`  ledger ${JSON.stringify(r.ledger)}`);
    console.log(`  empty-tpl ${JSON.stringify(r.empty)}  cards=[${r.emptyCards}]`);
    console.log(`  strip ${JSON.stringify(r.strip)}`);
    console.log(`  模板卡顶边 = ${r.empty ? r.empty.top : "n/a"} px  → ${r.empty && r.empty.top < r.viewportH ? "✓ 首屏内" : "✗ 首屏外，需滚 " + (r.empty ? Math.round(r.empty.top - r.viewportH) : "?") + "px"}`);
    console.log(`  文案: ${r.emptyHead.slice(0, 100)}`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "empty-tpl-pos.json"), JSON.stringify(out, null, 2));
