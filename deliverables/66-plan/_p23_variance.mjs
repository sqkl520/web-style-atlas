/* 探针 23：24/30 与 25/30 的口径差在哪？
 * 三个变量各测一遍，看哪一个能把 S03/S09 顶过 3800：
 *   a) 字体未就绪（不等 document.fonts.ready）
 *   b) 详情面板刚打开、入场动画未结束（animation: rise 320ms + delay）
 *   c) 首屏滚动位置 / #detail 的 scrollTop 非 0
 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 0 });
  // a) 立刻量（不等字体、不等动画）
  const fast = [];
  for (let i = 1; i <= 30; i++) {
    const id = "S" + String(i).padStart(2, "0");
    await page.eval((sid) => { location.hash = "#" + sid; }, id);
    fast.push([id, await page.eval("document.getElementById('detail').scrollHeight")]);
  }
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  await sleep(1500);
  const slow = [];
  for (let i = 1; i <= 30; i++) {
    const id = "S" + String(i).padStart(2, "0");
    await page.eval((sid) => { location.hash = "#" + sid; }, id);
    await sleep(400);
    slow.push([id, await page.eval("document.getElementById('detail').scrollHeight")]);
  }
  await sleep(1000);
  const slow2 = [];
  for (let i = 1; i <= 30; i++) {
    const id = "S" + String(i).padStart(2, "0");
    await page.eval((sid) => { location.hash = "#" + sid; }, id);
    await sleep(400);
    slow2.push([id, await page.eval("document.getElementById('detail').scrollHeight")]);
  }
  const cnt = (a) => a.filter(([, h]) => h > 3800).length;
  console.log("a) 立刻量（字体可能未就绪）  >3800 =", cnt(fast), "/30");
  console.log("b) 字体 ready + 400ms        >3800 =", cnt(slow), "/30");
  console.log("c) 再等 1s 后同法            >3800 =", cnt(slow2), "/30");
  console.log("\n逐案 a / b / c：");
  for (let i = 0; i < 30; i++) {
    const mark = (fast[i][1] > 3800) !== (slow[i][1] > 3800) ? "  ← 口径差" : "";
    console.log(`  ${fast[i][0]} ${String(fast[i][1]).padStart(5)} ${String(slow[i][1]).padStart(5)} ${String(slow2[i][1]).padStart(5)}${mark}`);
  }
  await page.close();
  writeFileSync(join(resolve("deliverables/66-plan/_out"), "threshold-variance.json"), JSON.stringify({ fast, slow, slow2 }, null, 2));
} finally { await browser.close(); await srv.close(); }
