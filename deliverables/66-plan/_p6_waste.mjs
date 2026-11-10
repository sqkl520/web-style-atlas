/* 探针 6：把「内容长度」与「布局浪费」分开量。
 * 对 390×844 每案每个字段：
 *   实际高度 vs 理论最小高度 = ceil(字符显示宽度 / 每行容量) * lineHeight + 上下 padding
 * 字符显示宽度用 canvas measureText 逐字累加（CJK=1em，拉丁按实测），所以不是"字节当字数"。
 * 若 ratio(实际/理论) 接近 1 → 内容长度；若明显 >1 → 有布局浪费（标签独占行、padding、margin、折叠条留白等）。 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-plan/_out");
mkdirSync(OUT, { recursive: true });
const ids = Array.from({ length: 30 }, (_, i) => "S" + String(i + 1).padStart(2, "0"));

const FN = () => {
  const cv = document.createElement("canvas").getContext("2d");
  function textW(el, s) {
    const cs = getComputedStyle(el);
    cv.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " / " + cs.lineHeight + " " + cs.fontFamily;
    return cv.measureText(s).width;
  }
  const d = document.getElementById("detail");
  const out = [];
  for (const f of document.querySelectorAll("#d-body .field")) {
    const dt = f.querySelector("dt");
    const dd = f.querySelector("dd");
    const fcs = getComputedStyle(f);
    const fr = f.getBoundingClientRect();
    if (!dd) { out.push({ label: dt ? dt.textContent : "?", kind: "novalue", h: +fr.height.toFixed(1) }); continue; }
    const dcs = getComputedStyle(dd);
    const cs = getComputedStyle(f);
    const innerW = dd.clientWidth - parseFloat(dcs.paddingLeft) - parseFloat(dcs.paddingRight);
    const lh = parseFloat(dcs.lineHeight);
    const text = dd.textContent;
    // 贪心按词/字断行：CJK 逐字可断，拉丁按空格
    const tokens = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]|[^\s\u4e00-\u9fff]+|\s+/g) || [];
    let lines = 1, cur = 0;
    for (const t of tokens) {
      const w = textW(dd, t);
      if (cur + w > innerW + 0.5) {
        if (t.trim() === "" ) { continue; }
        lines++; cur = w;
      } else cur += w;
      // 超长 token 需要折行
      while (cur > innerW + 0.5) { lines++; cur -= innerW; }
    }
    const ddr = dd.getBoundingClientRect();
    const dtr = dt ? dt.getBoundingClientRect() : null;
    const theoretical = lines * lh;
    out.push({
      label: dt ? dt.textContent : "?",
      h: +fr.height.toFixed(1),
      ddH: +ddr.height.toFixed(1),
      dtH: dtr ? +dtr.height.toFixed(1) : 0,
      lines, lh: +lh.toFixed(1), theoretical: +theoretical.toFixed(1),
      padT: parseFloat(dcs.paddingTop), padB: parseFloat(dcs.paddingBottom),
      marginT: parseFloat(cs.marginTop), marginB: parseFloat(cs.marginBottom),
      borderT: parseFloat(cs.borderTopWidth),
      gap: +(parseFloat(fcs.rowGap) || 0).toFixed(1),
      display: fcs.display,
      chars: text.length,
    });
  }
  return { id: location.hash.slice(1), scrollH: d.scrollHeight, fields: out };
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
    console.log(`\n=== ${vp.k} ===`);
    let sumActual = 0, sumTheo = 0, sumFixed = 0, tot = 0;
    for (const r of rows) {
      for (const f of r.fields) {
        if (f.kind === "novalue") continue;
        sumActual += f.h; sumTheo += f.theoretical;
        sumFixed += f.dtH + f.padT + f.padB + f.marginT + f.marginB + f.borderT;
      }
      tot += r.scrollH;
    }
    console.log(`  字段实际高度合计 ${sumActual.toFixed(0)}px / 理论文本高度合计 ${sumTheo.toFixed(0)}px / 固定开销(dt+padding+margin) ${sumFixed.toFixed(0)}px`);
    console.log(`  ⇒ 文本占 ${(sumTheo / sumActual * 100).toFixed(1)}% ，固定开销占 ${(sumFixed / sumActual * 100).toFixed(1)}% ，其余(折行误差/未计) ${(100 - sumTheo / sumActual * 100 - sumFixed / sumActual * 100).toFixed(1)}%`);
    console.log(`  30 案 scrollH 合计 ${tot}，字段占 ${(sumActual / tot * 100).toFixed(1)}%`);
    const s13 = rows.find((r) => r.id === "S13");
    console.log(`  S13 逐字段: ${s13.fields.filter((f) => f.kind !== "novalue").map((f) => f.label + " " + f.h + "/" + f.theoretical + "(n" + f.lines + ",dt" + f.dtH + ")").join("  ")}`);
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, "layout-waste.json"), JSON.stringify(all, null, 2), "utf8");
console.log("\nwrote _out/layout-waste.json");
