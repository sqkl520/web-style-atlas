/* 探针 5：详情面板 390×844 实测 —— 30 案 scrollHeight + 逐段高度分解
 * 目的：复核「25/30 超 3800px，最差 4668」以及「字段本体占 81–84%，不是布局浪费」。 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-plan/_out");
mkdirSync(OUT, { recursive: true });
const ids = Array.from({ length: 30 }, (_, i) => "S" + String(i + 1).padStart(2, "0"));

const MEASURE = () => {
  const d = document.getElementById("detail");
  const body = document.getElementById("d-body");
  const dr = d.getBoundingClientRect();
  const st = d.scrollTop;
  const parts = [];
  for (const child of body.children) {
    const r = child.getBoundingClientRect();
    const h = +r.height.toFixed(1);
    let tag = child.className || child.tagName.toLowerCase();
    if (child.tagName === "DL") {
      // 逐字段
      const fs = [];
      for (const f of child.querySelectorAll(".field")) {
        const fr = f.getBoundingClientRect();
        const dt = f.querySelector("dt");
        fs.push({ label: dt ? dt.textContent : "?", h: +fr.height.toFixed(1) });
      }
      parts.push({ tag: "DL(fields)", h, children: fs });
      continue;
    }
    parts.push({ tag, h });
  }
  // 首字段位置
  const firstField = body.querySelector(".field");
  const ffTop = firstField ? +(firstField.getBoundingClientRect().top - dr.top + st).toFixed(1) : null;
  // 提示词按钮/输入框块
  const cta = body.querySelector(".prompt-cta");
  const ctaH = cta ? +cta.getBoundingClientRect().height.toFixed(1) : 0;
  // 字体是否已就绪
  return {
    id: null,
    scrollH: d.scrollHeight,
    clientH: d.clientHeight,
    bodyH: +body.getBoundingClientRect().height.toFixed(1),
    firstFieldTop: ffTop,
    ctaH,
    hOv: d.scrollWidth - d.clientWidth,
    parts,
  };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), byVp: {} };
try {
  for (const vp of [{ k: "390", w: 390, h: 844, mobile: true }, { k: "1440", w: 1440, h: 900, mobile: false }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1800 });
    await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
    await sleep(400);
    const rows = [];
    for (const id of ids) {
      await page.eval((sid) => { location.hash = "#" + sid; }, id);
      await sleep(380);
      await page.eval(() => { document.getElementById("detail").scrollTop = 0; });
      await sleep(60);
      const m = await page.eval(MEASURE);
      rows.push({ ...m, id });
    }
    out.byVp[vp.k] = rows;
    const hs = rows.map((r) => r.scrollH);
    const over = hs.filter((x) => x > 3800);
    console.log(`\n=== ${vp.k} ===`);
    console.log(`  scrollHeight: min ${Math.min(...hs)} / max ${Math.max(...hs)} / avg ${Math.round(hs.reduce((a, b) => a + b, 0) / 30)} / >3800 = ${over.length}/30`);
    console.log(`  最差 3 案: ${rows.slice().sort((a, b) => b.scrollH - a.scrollH).slice(0, 3).map((r) => r.id + "=" + r.scrollH).join("  ")}`);
    console.log(`  首字段 top: min ${Math.min(...rows.map((r) => r.firstFieldTop))} / max ${Math.max(...rows.map((r) => r.firstFieldTop))}`);
    console.log(`  横向溢出: max ${Math.max(...rows.map((r) => r.hOv))}`);
    if (vp.k === "390") {
      // 逐段平均占比
      const acc = {};
      for (const r of rows) for (const p of r.parts) { acc[p.tag] = acc[p.tag] || { sum: 0, n: 0 }; acc[p.tag].sum += p.h; acc[p.tag].n++; }
      console.log("  逐段平均高度（占 scrollH 的比例按 S13 算）：");
      const s13 = rows.find((r) => r.id === "S13");
      for (const p of s13.parts) console.log(`    ${String(p.tag).padEnd(14)} ${String(p.h).padStart(7)} px  ${(p.h / s13.scrollH * 100).toFixed(1)}%`);
      console.log("  S13 字段明细:");
      const dl = s13.parts.find((p) => p.tag === "DL(fields)");
      for (const f of dl.children) console.log(`    ${String(f.label).padEnd(16)} ${String(f.h).padStart(7)} px  ${(f.h / s13.scrollH * 100).toFixed(1)}%`);
      // 30 案平均：fields 占 scrollH
      const ratio = rows.map((r) => { const dl2 = r.parts.find((p) => p.tag === "DL(fields)"); return dl2 ? dl2.h / r.scrollH : 0; });
      console.log(`  fields 占 scrollH: min ${(Math.min(...ratio) * 100).toFixed(1)}% / max ${(Math.max(...ratio) * 100).toFixed(1)}% / avg ${(ratio.reduce((a, b) => a + b, 0) / 30 * 100).toFixed(1)}%`);
      const ctaR = rows.map((r) => r.ctaH / r.scrollH);
      console.log(`  prompt-cta 占 scrollH: avg ${(ctaR.reduce((a, b) => a + b, 0) / 30 * 100).toFixed(1)}%  (avg px ${Math.round(rows.reduce((a, b) => a + b.ctaH, 0) / 30)})`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, "panel-measure.json"), JSON.stringify(out, null, 2), "utf8");
console.log("\nwrote _out/panel-measure.json");
