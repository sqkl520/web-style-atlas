/* 探针 37：把 17 个元素的实际 computed box-shadow 打出来，
 * 确认 h3.clause__head 为什么被判成纯 inset（它与 --press-1 的第二段是否被覆盖）。
 * 这决定 report.json 的 17 与当前 tools/ 的 10 到底差在哪。 */
import { resolve } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const FN = () => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 60 * 30) continue;
    const sh = getComputedStyle(el).boxShadow;
    if (sh === "none") continue;
    out.push({
      el: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""),
      sh: sh.slice(0, 160),
    });
  }
  return out;
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1600 });
  await sleep(500);
  const rows = await page.eval(FN);
  for (const r of rows) console.log(`${r.el.padEnd(26)} | ${r.sh}`);
  await page.close();
} finally { await browser.close(); await srv.close(); }
