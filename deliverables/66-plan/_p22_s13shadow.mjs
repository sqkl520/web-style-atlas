/* 探针 22：S13 的 shadow —— 「17 处」到底是什么。
 * 把 report.json 里 17 个静止阴影按「纯 inset（压痕设计意图）」与「含外投影（真违规）」拆开。
 * 用 CDP 逐元素读 computed box-shadow，不要靠数声明。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const SCAN = () => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const bs = cs.boxShadow;
    if (!bs || bs === "none") continue;
    // 拆成单个 shadow：逗号分隔但不要拆 rgb() 内的逗号
    const parts = [];
    let depth = 0, cur = "";
    for (const ch of bs) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    const inset = parts.filter((p) => /inset/.test(p)).length;
    const outer = parts.length - inset;
    out.push({
      tag: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""),
      n: parts.length, inset, outer, raw: bs.slice(0, 120),
      visible: el.getBoundingClientRect().width > 0,
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
  const all = await page.eval(SCAN);
  const vis = all.filter((x) => x.visible);
  console.log(`S13 计算样式里 box-shadow 非 none 的元素 = ${all.length}（其中可见 ${vis.length}）`);
  console.log(`  阴影段总数 = ${all.reduce((a, x) => a + x.n, 0)}；纯 inset 段 = ${all.reduce((a, x) => a + x.inset, 0)}；外投影段 = ${all.reduce((a, x) => a + x.outer, 0)}`);
  const pureInset = vis.filter((x) => x.outer === 0);
  const hasOuter = vis.filter((x) => x.outer > 0);
  console.log(`  纯 inset（压痕，设计意图）= ${pureInset.length} 个元素`);
  console.log(`  含外投影（真"浮起卡片"类）= ${hasOuter.length} 个元素 → ${hasOuter.map((x) => x.tag + "(" + x.outer + ")").join(" ")}`);
  // 按钮
  const btns = await page.eval(() => [...document.querySelectorAll("button, a.btn, .btn")].map((b) => ({
    t: (b.textContent || "").trim().slice(0, 14),
    bs: getComputedStyle(b).boxShadow,
  })).filter((x) => x.bs && x.bs !== "none"));
  console.log(`  带阴影的按钮 = ${btns.length}`);
  for (const b of btns) console.log(`    「${b.t}」 ${b.bs.slice(0, 100)}`);
  writeFileSync(join(resolve("deliverables/66-plan/_out"), "s13-shadow.json"), JSON.stringify({ all, btns }, null, 2));
  await page.close();
} finally { await browser.close(); await srv.close(); }
