/* 探针 27：clamp:2 截断处到底有没有省略号？
 * 如果没有，用户看到的是一句话被硬切（真缺陷）；如果有，用户看到「…」，
 * 「括号不配平」就只是"文字被截断"的一个子情形，不是独立缺陷。
 * 用截图 + 逐字 Range 定位最后一个可见字符，看它是不是 "…"。 */
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const SHOTS = resolve("deliverables/66-plan/_out/shots");
mkdirSync(SHOTS, { recursive: true });
const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 2 });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1800 });
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  await sleep(600);
  // 只截 S12 的行卡 family 区域（1440 档 9 案之一）
  for (const id of ["S12", "S10"]) {
    const box = await page.eval((sid) => {
      const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === sid);
      if (!row) return null;
      row.scrollIntoView({ block: "center" });
      const fam = row.querySelector(".row-family");
      const r = fam.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, id);
    await sleep(300);
    const box2 = await page.eval((sid) => {
      const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === sid);
      const fam = row.querySelector(".row-family");
      const r = fam.getBoundingClientRect();
      const cs = getComputedStyle(fam);
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height),
        clamp: cs.webkitLineClamp, overflow: cs.overflow, textOverflow: cs.textOverflow, display: cs.display };
    }, id);
    console.log(id, JSON.stringify(box2));
    await page.screenshot({ path: join(SHOTS, `clamp-${id}.png`), clip: { x: box2.x - 2, y: box2.y - 2, width: box2.width + 4, height: box2.height + 4, scale: 2 } });
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
console.log("shots → _out/shots/");
