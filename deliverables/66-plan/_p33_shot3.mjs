/* 探针 31c：CDP 的 clip 用的是**页面坐标**，不是视口坐标 —— 前两次截到空白就是这个原因。
 * 这次加上 scrollX/scrollY。目标：看清 -webkit-line-clamp:2 末尾有没有省略号。 */
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
  // 关掉详情面板，让列表铺开
  await page.eval(() => { const d = document.getElementById("detail"); if (d) d.hidden = true; document.body.classList.remove("detail-open"); });
  await sleep(400);
  for (const id of ["S12", "S10"]) {
    await page.eval((sid) => {
      const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === sid);
      row.scrollIntoView({ block: "center", behavior: "instant" });
    }, id);
    await sleep(450);
    const box = await page.eval((sid) => {
      const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === sid);
      const fam = row.querySelector(".row-family");
      const r = fam.getBoundingClientRect();
      return {
        x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width), h: Math.round(r.height),
        scrollY: window.scrollY, text: fam.textContent.length,
      };
    }, id);
    console.log(id, JSON.stringify(box));
    await page.screenshot({ path: join(SHOTS, `fam2-${id}.jpg`), type: "jpeg", quality: 96,
      clip: { x: box.x, y: box.y - 2, width: Math.min(box.w, 720), height: box.h + 4, scale: 2 } });
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
