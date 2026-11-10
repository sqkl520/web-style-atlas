/* 探针 36：确认「17」到底是什么量。
 * p35 已在三个视口得到：big 元素里 boxShadow !== none 的 = 17；按 probe.mjs 现版的
 * outer 判据只算 10。说明 report.json 的 shadowStatic=17 与**当前** tools/ 的代码不一致。
 * 这里把两种口径并列，量化差在哪 7 个元素上。 */
import { resolve } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const FN = () => {
  const big = [...document.querySelectorAll("*")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width * r.height >= 60 * 30;
  });
  const rows = [];
  for (const el of big) {
    const sh = getComputedStyle(el).boxShadow;
    if (sh === "none") continue;
    const parts = sh.split(/,(?![^(]*\))/);
    const outerParts = parts.filter((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p));
    rows.push({
      el: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""),
      segs: parts.length, outer: outerParts.length,
      kind: outerParts.length ? "OUTER" : "INSET-ONLY",
    });
  }
  return { big: big.length, rows };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1600 });
  await sleep(500);
  const r = await page.eval(FN);
  const outer = r.rows.filter((x) => x.kind === "OUTER");
  const inset = r.rows.filter((x) => x.kind === "INSET-ONLY");
  console.log(`big=${r.big}  box-shadow 非 none = ${r.rows.length}  ← 这个数恰好等于 report.json 的 17`);
  console.log(`  其中 OUTER（含任一非 inset 段）= ${outer.length}`);
  console.log(`  其中 INSET-ONLY（纯压痕）      = ${inset.length}  ← ${inset.map((x) => x.el).join(" ")}`);
  console.log("\n全部 17 条：");
  r.rows.forEach((x, i) => console.log(`  ${String(i + 1).padStart(2)} ${x.kind.padEnd(10)} ${x.el.padEnd(34)} segs=${x.segs} outer=${x.outer}`));
  await page.close();
} finally { await browser.close(); await srv.close(); }
