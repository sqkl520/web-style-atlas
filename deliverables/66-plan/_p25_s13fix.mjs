/* 探针 25：S13 的 shadow 到底「能不能修」—— 用实验而不是判断。
 * 把三个**纯外投影**变量（--press-2 / --press-4 / --press-2-hover）改成 none，
 * 再数一次闸门口径：还剩几个元素带外投影、还有几个按钮带阴影。
 * 如果剩 0，说明「17 处是设计意图不可修」这个说法是错的：可修的正是这几条。
 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const SCAN = () => {
  const split = (bs) => {
    const parts = []; let d = 0, cur = "";
    for (const ch of bs) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch; }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };
  let elems = 0, outerSeg = 0, insetSeg = 0;
  const byVar = {};
  for (const el of document.querySelectorAll("*")) {
    const bs = getComputedStyle(el).boxShadow;
    if (!bs || bs === "none") continue;
    const parts = split(bs);
    const outer = parts.filter((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p));
    if (!outer.length) { insetSeg += parts.length; continue; }
    elems++; outerSeg += outer.length; insetSeg += parts.length - outer.length;
    const key = el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
    byVar[key] = (byVar[key] || 0) + 1;
  }
  const btns = [...document.querySelectorAll("button, a.btn, .btn")].filter((b) => {
    const bs = getComputedStyle(b).boxShadow;
    return bs && bs !== "none";
  }).length;
  return { elems, outerSeg, insetSeg, byVar, btns };
};

const FIX = {
  base: "",
  // 只把三个纯外投影变量改掉：这是最小、最保守的修法
  fixPureOuter: `:root{--press-2:none;--press-4:none;--press-2-hover:none}`,
  // 全部外投影段改成 inset（压痕的真做法）
  fixAllInset: `:root{
    --press-2:inset 2px 2px 3px rgba(36,31,23,0.08);
    --press-4:inset 0 -2px 3px rgba(36,31,23,0.06);
    --press-2-hover:inset 2px 2px 4px rgba(36,31,23,0.18);
    --press-1:inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
    --press-3:inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
    --press-1-rev:inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
  }`,
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1600 });
  await sleep(400);
  const out = {};
  for (const [k, css] of Object.entries(FIX)) {
    await page.eval((c) => {
      let st = document.getElementById("__fix");
      if (!st) { st = document.createElement("style"); st.id = "__fix"; document.head.appendChild(st); }
      st.textContent = c;
    }, css);
    await sleep(120);
    const r = await page.eval(SCAN);
    out[k] = r;
    console.log(`\n=== ${k} ===`);
    console.log(`  闸门口径：带外投影的元素 ${r.elems}，外投影段 ${r.outerSeg}，纯 inset 段 ${r.insetSeg}，带阴影按钮 ${r.btns}`);
    console.log(`  元素明细: ${JSON.stringify(r.byVar)}`);
  }
  writeFileSync(join(resolve("deliverables/66-plan/_out"), "s13-fixability.json"), JSON.stringify(out, null, 2));
  await page.close();
} finally { await browser.close(); await srv.close(); }
