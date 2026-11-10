/* 探针 31：两件事
 * a) 390 宽但 mobile=false（桌面 UA / 无 meta viewport 影响）会不会得到 25/30？
 *    —— 排除"24 vs 25"是视口模拟参数差异
 * b) -webkit-line-clamp 到底画不画省略号？截图存成真 JPEG，肉眼可查。
 */
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const SHOTS = resolve("deliverables/66-plan/_out/shots");
mkdirSync(SHOTS, { recursive: true });
const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const m of [true, false]) {
    const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: m });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
    await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
    await sleep(400);
    const hs = [];
    for (let i = 1; i <= 30; i++) {
      const id = "S" + String(i).padStart(2, "0");
      await page.eval((sid) => { location.hash = "#" + sid; }, id);
      await sleep(300);
      hs.push(await page.eval("document.getElementById('detail').scrollHeight"));
    }
    console.log(`mobile=${m}  min ${Math.min(...hs)} max ${Math.max(...hs)} avg ${Math.round(hs.reduce((a, b) => a + b) / 30)} >3800 ${hs.filter((x) => x > 3800).length}/30`);
    await page.close();
  }
  // b) 截 -webkit-line-clamp 的尾巴
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 3 });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  await sleep(600);
  const box = await page.eval(() => {
    const row = [...document.querySelectorAll(".row")].find((r) => r.getAttribute("data-id") === "S12");
    row.scrollIntoView({ block: "center" });
    const fam = row.querySelector(".row-family");
    const r = fam.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  await sleep(300);
  await page.screenshot({ path: join(SHOTS, "clamp-ellipsis-check.jpg"), type: "jpeg", quality: 95,
    clip: { x: box.x + box.w - 220, y: box.y - 2, width: 220, height: box.h + 4, scale: 3 } });
  console.log("截图 → _out/shots/clamp-ellipsis-check.jpg（S12 family 末尾 220px，3× 放大）");
  await page.close();
} finally { await browser.close(); await srv.close(); }
