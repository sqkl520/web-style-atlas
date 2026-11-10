/* --press-4 到底算不算进 shadow 闸门？—— 别按名字猜，按 probe.mjs 的 isOverlay() 量。
 * probe.mjs:307  isOverlay(el) = 元素自身或 4 层内祖先 position:fixed|sticky
 * probe.mjs:319  命中 overlay 的计入 shadowOverlay（**不产生 FAIL**），只有 shadowStatic 才 FAIL
 * .signature.is-pinned 是 position:fixed 本身 ⇒ 常驻 overlay 桶。
 * 这份脚本把页面滚到底让 is-pinned 生效，再分别按"含 overlay"与"只 static"两种口径数一遍。
 *   node deliverables/66-exec/_s13overlay.mjs
 */
import { resolve } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const SCAN = () => {
  const isOverlay = (el) => { for (let p = el, i = 0; p && i < 4; p = p.parentElement, i++) { const pos = getComputedStyle(p).position; if (pos === "fixed" || pos === "sticky") return true; } return false; };
  const split = (bs) => { const p = []; let d = 0, c = ""; for (const ch of bs) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { p.push(c.trim()); c = ""; } else c += ch; } if (c.trim()) p.push(c.trim()); return p; };
  let stat = 0, over = 0; const statList = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (r.width * r.height < 60 * 30) continue;
    const bs = cs.boxShadow;
    if (!bs || bs === "none") continue;
    if (/^rgba?\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(bs)) continue;
    const outer = split(bs).some((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p));
    if (!outer) continue;
    if (isOverlay(el)) over++;
    else { stat++; statList.push((el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "")) + " :: " + bs.slice(0, 50)); }
  }
  return { stat, over, statList, pinned: !!document.querySelector(".signature.is-pinned"), sigShadow: document.querySelector(".signature") ? getComputedStyle(document.querySelector(".signature")).boxShadow.slice(0, 60) : null };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1800 });
  await sleep(500);
  console.log("顶部（is-pinned 未生效）:", JSON.stringify(await page.eval(SCAN), null, 1));

  // 滚到底触发 is-pinned
  await page.eval("window.scrollTo({top: document.documentElement.scrollHeight, behavior:'instant'})");
  await sleep(900);
  const bottom = await page.eval(SCAN);
  console.log("\n底部（is-pinned 生效）:", JSON.stringify(bottom, null, 1));
  console.log(`\n结论：底部 static=${bottom.stat}  overlay=${bottom.over}  pinned=${bottom.pinned}`);
  await page.close();
} finally { await browser.close(); await srv.close(); }
