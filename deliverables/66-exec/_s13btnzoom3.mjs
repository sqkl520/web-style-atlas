/* 按钮方案第 3 轮：R 用**与现状完全相同的数值**（2px 2px 3px rgba(.08)）走 filter，
   目的不是"做个近似"，而是让像素几乎不变 —— 只把承载阴影的属性从 box-shadow 换成 filter。
   同时测 R 的按下/停用两态，并做 base↔R 的像素差，判断"文字重影"是否真的看得出来。
   node deliverables/66-exec/_s13btnzoom3.mjs
*/
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials/zoom3");
mkdirSync(OUT, { recursive: true });

const BASE = `:root{
  --press-2: inset 2px 2px 3px rgba(36,31,23,0.08);
  --press-4: inset 0 -2px 3px rgba(36,31,23,0.06);
  --press-2-hover: inset 2px 2px 4px rgba(36,31,23,0.18);
  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
  --press-1-off: inset 2px 2px 3px rgba(36,31,23,0), inset 2px 2px 2px rgba(36,31,23,0);
}`;

// 与 --press-2 / --press-2-hover / --press-1-rev 逐字对应的 filter 形式
const R = `${BASE}
  .btn{box-shadow:none;filter:drop-shadow(2px 2px 3px rgba(36,31,23,0.08))}
  .btn:hover,.btn--issue:hover{box-shadow:none;filter:drop-shadow(2px 2px 4px rgba(36,31,23,0.18))}
  .btn:active{box-shadow:none;filter:drop-shadow(-2px -2px 2px rgba(36,31,23,0.10))}
  .btn[disabled]{box-shadow:none;filter:none;border-top:2px solid var(--shade)}
  .btn.is-error{box-shadow:none;filter:none}`;

const CASES = { base: ``, R };

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const [name, css] of Object.entries(CASES)) {
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
    // 静态四态：正常 / 悬停 / 按下 / 停用
    for (const [tag, sel] of [["issue", "#issueBtn"], ["reject", "#rejectBtn"], ["archive", "#archiveBtn"]]) {
      await page.eval((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
      await sleep(250);
      const rect = await page.eval((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.left + window.scrollX - 6, y: r.top + window.scrollY - 6, width: r.width + 12, height: r.height + 12 };
      }, sel);
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), format: "png", clip: { ...rect, scale: 3 } });
    }
    // 按下态：加一个强制类，用真实的 :active 规则（通过 CDP 发鼠标 down）
    await page.eval(() => document.querySelector("#rejectBtn").scrollIntoView({ block: "center" }));
    await sleep(200);
    const rc = await page.eval(() => {
      const r = document.querySelector("#rejectBtn").getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: r.left + window.scrollX - 6, y: r.top + window.scrollY - 6, width: r.width + 12, height: r.height + 12 };
    });
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(rc.cx), y: Math.round(rc.cy) });
    await sleep(200);
    await page.screenshot({ path: join(OUT, `${name}-hover.png`), format: "png", clip: { x: rc.x, y: rc.y, width: rc.width, height: rc.height, scale: 3 } });
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(rc.cx), y: Math.round(rc.cy), button: "left", clickCount: 1 });
    await sleep(300);
    await page.screenshot({ path: join(OUT, `${name}-active.png`), format: "png", clip: { x: rc.x, y: rc.y, width: rc.width, height: rc.height, scale: 3 } });
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(rc.cx), y: Math.round(rc.cy), button: "left", clickCount: 1 }).catch(() => {});
    console.log(`${name} done`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/zoom3/");
