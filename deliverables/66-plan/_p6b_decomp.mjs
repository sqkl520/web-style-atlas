/* 探针 6b：精确行数（Range 实测）而不是贪心估算，把 390 档的字段高度拆成
 *   行数×行高 + dt 标签 + padding + margin + border
 * 这样「内容长度 vs 布局浪费」才是可判的：只有最后三项算布局。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const ids = Array.from({ length: 30 }, (_, i) => "S" + String(i + 1).padStart(2, "0"));

const FN = () => {
  const d = document.getElementById("detail");
  const out = [];
  let chrome = [];
  for (const child of document.getElementById("d-body").children) {
    const r = child.getBoundingClientRect();
    if (child.tagName !== "DL") chrome.push({ tag: child.className, h: +r.height.toFixed(1) });
  }
  for (const f of document.querySelectorAll("#d-body .field")) {
    const dt = f.querySelector("dt"), dd = f.querySelector("dd");
    if (!dd) continue;
    const fcs = getComputedStyle(f), dcs = getComputedStyle(dd);
    const fr = f.getBoundingClientRect(), ddr = dd.getBoundingClientRect();
    // 精确行数：对每个 Range 收集 client rect，按 top 去重
    const node = dd.firstChild;
    let lines = 0, lh = parseFloat(dcs.lineHeight);
    if (node) {
      const r = document.createRange();
      r.selectNodeContents(dd);
      const rects = [...r.getClientRects()];
      const tops = new Set(rects.map((x) => Math.round(x.top)));
      lines = tops.size;
      // 行高用相邻 rect top 差的中位数
      const arr = [...tops].sort((a, b) => a - b);
      if (arr.length > 1) {
        const diffs = arr.slice(1).map((v, i) => v - arr[i]).filter((x) => x > 1);
        if (diffs.length) lh = diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)];
      }
    }
    const padT = parseFloat(dcs.paddingTop), padB = parseFloat(dcs.paddingBottom);
    const marT = parseFloat(fcs.marginTop), marB = parseFloat(fcs.marginBottom);
    const bdT = parseFloat(fcs.borderTopWidth), bdB = parseFloat(fcs.borderBottomWidth);
    const dtH = dt ? +dt.getBoundingClientRect().height.toFixed(1) : 0;
    const textH = lines * lh;
    out.push({
      label: dt ? dt.textContent : "?",
      fieldH: +fr.height.toFixed(1), textH: +textH.toFixed(1), lines, lh: +lh.toFixed(1),
      dtH, padT, padB, marT, marB, bdT, bdB,
      overhead: +(dtH + padT + padB + marT + marB + bdT + bdB).toFixed(1),
      resid: +(fr.height - textH - dtH - padT - padB - marT - marB - bdT - bdB).toFixed(1),
    });
  }
  return { id: location.hash.slice(1), scrollH: d.scrollHeight, clientH: d.clientHeight, chrome, fields: out };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const all = {};
try {
  for (const vp of [{ k: "390", w: 390, h: 844, mobile: true }, { k: "1440", w: 1440, h: 900, mobile: false }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1800 });
    await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
    await sleep(300);
    const rows = [];
    for (const id of ids) {
      await page.eval((sid) => { location.hash = "#" + sid; }, id);
      await sleep(340);
      rows.push(await page.eval(FN));
    }
    all[vp.k] = rows;
    const T = rows.reduce((a, r) => a + r.scrollH, 0);
    const text = rows.reduce((a, r) => a + r.fields.reduce((b, f) => b + f.textH, 0), 0);
    const dt = rows.reduce((a, r) => a + r.fields.reduce((b, f) => b + f.dtH, 0), 0);
    const ovh = rows.reduce((a, r) => a + r.fields.reduce((b, f) => b + f.overhead, 0), 0);
    const res = rows.reduce((a, r) => a + r.fields.reduce((b, f) => b + f.resid, 0), 0);
    const chrom = rows.reduce((a, r) => a + r.chrome.reduce((b, c) => b + c.h, 0), 0);
    console.log(`\n=== ${vp.k} ===`);
    console.log(`  scrollH 合计 ${T}  ( avg ${Math.round(T / 30)} )`);
    console.log(`  ├ 正文行×行高      ${text}  ${(text / T * 100).toFixed(1)}%`);
    console.log(`  ├ 字段标签 dt      ${dt}  ${(dt / T * 100).toFixed(1)}%   (每字段 21px × ${rows.length * 11} = ${21 * rows.length * 11})`);
    console.log(`  ├ padding+margin   ${ovh - dt}  ${((ovh - dt) / T * 100).toFixed(1)}%`);
    console.log(`  ├ 残差(未知)       ${res}  ${(res / T * 100).toFixed(1)}%   每字段 ${(res / (rows.length * 11)).toFixed(1)}px`);
    console.log(`  └ 非字段 chrome    ${chrom}  ${(chrom / T * 100).toFixed(1)}%`);
    const s13 = rows.find((r) => r.id === "S13");
    console.log(`  S13 scrollH ${s13.scrollH} chrome ${s13.chrome.map((c) => c.tag + "=" + c.h).join(" ")}`);
    console.log(`  S13 字段: ${s13.fields.map((f) => f.label + " " + f.fieldH + "(t" + f.textH + "/n" + f.lines + "/ov" + f.overhead + "/r" + f.resid + ")").join("  ")}`);
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "decomp.json"), JSON.stringify(all, null, 2), "utf8");
console.log("\nwrote _out/decomp.json");
