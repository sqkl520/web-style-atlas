/* 改动后几何核对：我加了 .btn[disabled] 的 border-top: 3px，而 .btn 没有显式 height，
   border-box 管不到「由内容撑出来的高度」—— 3px 会实打实把按钮撑高、把下面的内容推下去。
   这条必须量，不能靠看。同时量「突变出现的新横条」是不是我引入的。
   node deliverables/66-exec/_s13geom.mjs before|after
 */
import { resolve } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const MEASURE = () => {
  const r = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      y: Math.round(b.top + window.scrollY), h: Math.round(b.height), w: Math.round(b.width),
      bt: cs.borderTopWidth, bs: cs.boxShadow === "none" ? "none" : cs.boxShadow.slice(0, 40),
      filter: cs.filter === "none" ? "none" : cs.filter.slice(0, 46),
    };
  };
  return {
    actions: r(".actions"),
    issue: r("#issueBtn"), reject: r("#rejectBtn"), forward: r("#forwardBtn"), archive: r("#archiveBtn"),
    // 是否有新的横条元素（宽 >= 300 且高 <= 4）
    thinRules: [...document.body.querySelectorAll("*")].map((el) => {
      const b = el.getBoundingClientRect();
      return { el: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""), w: Math.round(b.width), h: +b.height.toFixed(1), y: Math.round(b.top + window.scrollY) };
    }).filter((x) => x.w >= 300 && x.h > 0 && x.h <= 4),
    docH: document.documentElement.scrollHeight,
  };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1800 });
  await sleep(600);
  const m = await page.eval(MEASURE);
  console.log(JSON.stringify(m, null, 1));
  await page.close();
} finally { await browser.close(); await srv.close(); }
