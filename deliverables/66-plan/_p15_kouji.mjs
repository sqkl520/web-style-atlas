/* 探针 15：把「括号不配平」的两种口径分开算，解释 2 案 vs 9 案从哪来。
 *   口径 A（窄）：只算圆括号 （）
 *   口径 B（宽）：圆括号 + 方/花/角括号 【】「」《》〔〕
 * 另外统计：截断是否发生在括号内部（下一字符仍在括号里才算"截断处括号不配平"）。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const VIS = () => {
  const out = [];
  for (const elx of document.querySelectorAll(".row")) {
    const fam = elx.querySelector(".row-family");
    if (!fam) continue;
    const text = fam.textContent, box = fam.getBoundingClientRect(), node = fam.firstChild;
    let best = 0;
    if (node && node.nodeType === 3) {
      const r = document.createRange();
      let lo = 0, hi = node.length;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        r.setStart(node, 0); r.setEnd(node, mid);
        const rects = [...r.getClientRects()];
        if (rects.length && rects.every((x) => x.bottom <= box.bottom + 1.5)) { best = mid; lo = mid + 1; } else hi = mid - 1;
      }
    }
    out.push({ id: elx.getAttribute("data-id"), text, vis: best, total: text.length });
  }
  return out;
};

const OPEN = { "（": "）", "(": ")" }, WIDE = { "（": "）", "(": ")", "【": "】", "「": "」", "《": "》", "〔": "〕" };
function unclosed(s, table) {
  const stack = [];
  for (const ch of s) {
    if (table[ch]) stack.push(ch);
    else if (Object.values(table).includes(ch)) {
      const want = Object.keys(table).find((k) => table[k] === ch);
      if (stack.length && stack[stack.length - 1] === want) stack.pop();
    }
  }
  return stack;
}

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const res = {};
try {
  for (const vp of [{ k: "1440", w: 1440, h: 900, mobile: false }, { k: "390", w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 2000 });
    await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
    await sleep(600);
    const rows = await page.eval(VIS);
    const A = [], B = [], fullBad = [];
    for (const r of rows) {
      const vis = r.text.slice(0, r.vis);
      const ua = unclosed(vis, OPEN), ub = unclosed(vis, WIDE);
      const uf = unclosed(r.text, WIDE);
      if (ua.length) A.push(r.id);
      if (ub.length) B.push(r.id);
      if (uf.length) fullBad.push(r.id);
    }
    res[vp.k] = { A, B, fullBad, truncated: rows.filter((r) => r.vis < r.total).length };
    console.log(`\n=== ${vp.k} ===`);
    console.log(`  截断发生 = ${res[vp.k].truncated}/30`);
    console.log(`  口径A 只看圆括号 （）        → ${A.length} 案  ${A.join(" ")}`);
    console.log(`  口径B 含 「」《》【】〔〕     → ${B.length} 案  ${B.join(" ")}`);
    console.log(`  原数据全文括号本身不配平     → ${fullBad.length} 案  ${fullBad.join(" ")}`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "clamp-kouji.json"), JSON.stringify(res, null, 2), "utf8");
