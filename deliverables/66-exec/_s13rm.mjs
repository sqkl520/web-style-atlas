/* prefers-reduced-motion 下按钮按下态到底是什么？—— 我新加的 `.btn:active{filter:none}`
   和降级块里的 `.btn:active{filter:brightness(0.96)}` 争同一个属性，且降级块在源序更后、
   特异性相同（都是 0,2,0），所以降级块赢。这不是猜的，量出来。
   node deliverables/66-exec/_s13rm.mjs
 */
import { resolve } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const rm of [false, true]) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, reducedMotion: rm });
    await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1600 });
    await sleep(400);
    await page.eval(() => document.querySelector("#rejectBtn").scrollIntoView({ block: "center" }));
    await sleep(250);
    const rest = await page.eval(() => {
      const b = document.querySelector("#rejectBtn");
      const cs = getComputedStyle(b);
      return { filter: cs.filter, shadow: cs.boxShadow, transform: cs.transform, transition: cs.transitionProperty + " " + cs.transitionDuration };
    });
    const c = await page.eval(() => {
      const b = document.querySelector("#rejectBtn").getBoundingClientRect();
      return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
    });
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 });
    await sleep(350);
    const act = await page.eval(() => {
      const b = document.querySelector("#rejectBtn");
      const cs = getComputedStyle(b);
      return { filter: cs.filter, shadow: cs.boxShadow, transform: cs.transform };
    });
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 }).catch(() => {});
    const gate = await page.eval(() => [...document.querySelectorAll("button.btn")].filter((b) => getComputedStyle(b).boxShadow !== "none").length);
    console.log(`\n=== prefers-reduced-motion: ${rm ? "reduce" : "no-preference"} ===`);
    console.log(`  静息 filter: ${rest.filter.slice(0, 60)}`);
    console.log(`  静息 shadow: ${rest.shadow}`);
    console.log(`  按下 filter: ${act.filter.slice(0, 60)}  transform: ${act.transform}`);
    console.log(`  带 box-shadow 的按钮（闸门口径）: ${gate}`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
