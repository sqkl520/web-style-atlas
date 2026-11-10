/* 最终四态出图（用磁盘上真实的 style.css，不注入任何补丁）：
   可用 / 悬停 / 按下 / 停用 / 错误 / 载入。用于交付说明里的视觉判断与「我可能弄坏的地方」核对。
   node deliverables/66-exec/_s13states.mjs
 */
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/shots-s13/button-states");
mkdirSync(OUT, { recursive: true });

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1800 });
  await sleep(600);

  const shot = async (name, sel) => {
    const r = await page.eval((s) => {
      const el = document.querySelector(s);
      el.scrollIntoView({ block: "center" });
      const b = el.getBoundingClientRect();
      return { x: b.left + window.scrollX - 8, y: b.top + window.scrollY - 8, width: b.width + 16, height: b.height + 16 };
    }, sel);
    await sleep(220);
    const r2 = await page.eval((s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return { x: b.left + window.scrollX - 8, y: b.top + window.scrollY - 8, width: b.width + 16, height: b.height + 16 };
    }, sel);
    await page.screenshot({ path: join(OUT, name + ".png"), format: "png", clip: { ...r2, scale: 3 } });
    console.log("  " + name);
  };

  await page.eval(() => document.querySelector("#rejectBtn").scrollIntoView({ block: "center" }));
  await sleep(300);
  await shot("1-rest", "#rejectBtn");

  const c = await page.eval(() => {
    const b = document.querySelector("#rejectBtn").getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
  });
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y });
  await sleep(300);
  await shot("2-hover", "#rejectBtn");

  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(320);
  await shot("3-active", "#rejectBtn");
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 }).catch(() => {});
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 }).catch(() => {});
  await sleep(200);

  await shot("4-disabled", "#archiveBtn");

  await page.eval(() => document.querySelector("#forwardBtn").classList.add("is-loading"));
  await sleep(700);
  await shot("5-loading", "#forwardBtn");
  await page.eval(() => document.querySelector("#forwardBtn").classList.remove("is-loading"));

  await page.eval(() => document.querySelector("#forwardBtn").classList.add("is-error"));
  await sleep(400);
  await shot("6-error", "#forwardBtn");
  await page.eval(() => document.querySelector("#forwardBtn").classList.remove("is-error"));

  await page.close();
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/shots-s13/button-states/");
