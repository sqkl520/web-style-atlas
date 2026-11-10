/* 探针 9：行卡 .row-family 的 clamp:2 视觉截断 —— 逐案量「可见字符」，并检查
 *   (a) 是否发生截断
 *   (b) 截断点是否落在括号内部（可见前缀括号不配平）
 *   (c) 全文括号本身是否配平（排除源数据问题）
 * 两种口径都给：宽松（可见前缀里 open != close）与严格（最后一个未闭合括号在可见段内）。
 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const VIS = () => {
  const rows = [...document.querySelectorAll(".row")];
  return rows.map((elx) => {
    const fam = elx.querySelector(".row-family");
    if (!fam) return { id: elx.getAttribute("data-id"), missing: true };
    const text = fam.textContent;
    const box = fam.getBoundingClientRect();
    const node = fam.firstChild;
    let best = 0;
    if (node && node.nodeType === 3) {
      const r = document.createRange();
      let lo = 0, hi = node.length;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        r.setStart(node, 0); r.setEnd(node, mid);
        const rects = [...r.getClientRects()];
        const ok = rects.length > 0 && rects.every((x) => x.bottom <= box.bottom + 1.5);
        if (ok) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
    }
    return {
      id: elx.getAttribute("data-id"),
      total: text.length, visible: best,
      truncated: best < text.length,
      visText: text.slice(0, best),
      restText: text.slice(best, best + 6),
      rowH: +elx.getBoundingClientRect().height.toFixed(1),
      overflowY: fam.scrollHeight > fam.clientHeight + 1,
    };
  });
};

function brackets(s) {
  const pairs = { "（": "）", "(": ")", "【": "】", "《": "》", "「": "」", "〔": "〕" };
  const stack = [];
  for (const ch of s) {
    if (pairs[ch]) stack.push(ch);
    else if (Object.values(pairs).includes(ch)) {
      const want = Object.keys(pairs).find((k) => pairs[k] === ch);
      if (stack.length && stack[stack.length - 1] === want) stack.pop();
      else return { balanced: false, unclosed: stack.slice(), strayClose: ch };
    }
  }
  return { balanced: stack.length === 0, unclosed: stack.slice(), strayClose: null };
}

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const all = {};
try {
  for (const vp of [{ k: "1440", w: 1440, h: 900, mobile: false }, { k: "390", w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 2000 });
    await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
    // 需要全部行都在 DOM 里 —— 默认就是 30 行
    await sleep(600);
    const rows = await page.eval(VIS);
    all[vp.k] = rows.map((r) => ({ ...r, full: brackets(r.visText), cutInside: brackets(r.visText).unclosed.length > 0 }));
    console.log(`\n=== ${vp.k} ===  行数 ${rows.length}`);
    const trunc = all[vp.k].filter((r) => r.truncated);
    console.log(`  发生截断 = ${trunc.length}/30`);
    const mis = all[vp.k].filter((r) => r.cutInside);
    console.log(`  可见前缀括号不配平(严格: 有未闭合) = ${mis.length}/30  → ${mis.map((r) => r.id).join(" ")}`);
    const loose = all[vp.k].filter((r) => {
      const o = (r.visText.match(/[（(【《「〔]/g) || []).length;
      const c = (r.visText.match(/[）)】》」〕]/g) || []).length;
      return o !== c;
    });
    console.log(`  可见前缀括号计数不等(宽松) = ${loose.length}/30  → ${loose.map((r) => r.id).join(" ")}`);
    console.log(`  可见字符中位 = ${all[vp.k].map((r) => r.visible).sort((a, b) => a - b)[15]}`);
    for (const r of all[vp.k]) {
      if (r.truncated || r.cutInside) {
        console.log(`    ${r.id} 可见 ${r.visible}/${r.total} 未闭合=${JSON.stringify(r.full.unclosed)} 末20「${r.visText.slice(-20)}」 下一段「${r.restText}」`);
      }
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "clamp.json"), JSON.stringify(all, null, 2), "utf8");
console.log("\nwrote _out/clamp.json");
