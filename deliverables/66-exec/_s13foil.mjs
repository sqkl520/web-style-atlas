/* 「凸」这一级到底该 inset 还是该换 filter？—— 用图说话，别用理念说话。
 * 二级凸起（--press-2）只有两个使用者：.specimen__foil（烫金击凸块）与 .btn（铅字块）。
 * 任务书第 1 步要求把它也改成 inset；但拷贝写的是「凸起」「击凸」，闸门的修法说明也写着
 * 「shadows are for things that really float」。所以两版都出图，6× 放大，肉眼判。
 *   node deliverables/66-exec/_s13foil.mjs
 */
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials/foil");
mkdirSync(OUT, { recursive: true });

const VARIANTS = {
  base: "",
  // 任务书第 1 步：--press-2 改 inset（凸起变成凹槽）
  inset: `:root{--press-2: inset 2px 2px 3px rgba(36,31,23,0.08)}
          .btn{box-shadow:none;filter:drop-shadow(2px 2px 3px rgba(36,31,23,0.08))}`,
  // 换成 filter 承载，保留「凸」的语义，数值不变
  filter: `:root{--press-2: 2px 2px 3px rgba(36,31,23,0.08)}
           .btn{box-shadow:none;filter:drop-shadow(2px 2px 3px rgba(36,31,23,0.08))}
           .specimen__foil{box-shadow:none;filter:drop-shadow(2px 2px 3px rgba(36,31,23,0.08))}`,
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const [name, css] of Object.entries(VARIANTS)) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
    await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1800 });
    await sleep(400);
    if (css) {
      await page.eval((c) => {
        let st = document.getElementById("__t");
        if (!st) { st = document.createElement("style"); st.id = "__t"; document.head.appendChild(st); }
        st.textContent = c;
      }, css);
      await sleep(250);
    }
    // 烫金块 + 骑缝章方框 + 一句题注，一起看（判断「凸」与「凹」在同一屏里是否还分得清）
    await page.eval(() => document.querySelector(".specimen").scrollIntoView({ block: "center" }));
    await sleep(300);
    const rect = await page.eval(() => {
      const r = document.querySelector(".specimen").getBoundingClientRect();
      return { x: Math.max(0, r.left + window.scrollX - 8), y: Math.max(0, r.top + window.scrollY - 8), width: Math.min(1440, r.width + 16), height: r.height + 16 };
    });
    await page.screenshot({ path: join(OUT, `${name}-specimen-2x.png`), format: "png", clip: { ...rect, scale: 2 } });
    // 烫金块左下角 6×：影落在哪一侧，是「凸」还是「凹」的唯一判据
    const f = await page.eval(() => {
      const r = document.querySelector(".specimen__foil").getBoundingClientRect();
      return { x: r.left + window.scrollX - 10, y: r.top + window.scrollY - 10, width: 64, height: 64 };
    });
    await page.screenshot({ path: join(OUT, `${name}-foil-corner-6x.png`), format: "png", clip: { ...f, scale: 6 } });
    console.log(`${name} done`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/foil/");
