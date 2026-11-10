/* 探针 31b：修正截图坐标（先滚、再等、再量、再截）。目标是看清 -webkit-line-clamp:2
 * 的末尾到底有没有省略号。 */
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
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  await sleep(800);
  for (const id of ["S12", "S10"]) {
    await page.eval((sid) => {
      const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === sid);
      row.scrollIntoView({ block: "center", behavior: "instant" });
    }, id);
    await sleep(500);            // 滚动落定
    const box = await page.eval((sid) => {
      const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === sid);
      const fam = row.querySelector(".row-family");
      const r = fam.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }, id);
    console.log(id, JSON.stringify(box));
    // 整块 family（不裁剪），2x 放大，看得到两行与末尾
    await page.screenshot({ path: join(SHOTS, `family-${id}.jpg`), type: "jpeg", quality: 95,
      clip: { x: Math.max(0, box.x), y: Math.max(0, box.y - 2), width: Math.min(box.w, 700), height: box.h + 4, scale: 2 } });
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
