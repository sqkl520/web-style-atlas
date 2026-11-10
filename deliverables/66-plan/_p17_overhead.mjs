/* 探针 17：字段的高度构成 —— 这次把 .field 自己的 padding/border 也算进 "布局开销"。
 * p6b 的 padT/padB 取的是 dd 的，而 CSS 里 padding 在 .field 上（12px 0 + 1px border），
 * 所以那 27.1px/字段的"残差"其实就是布局开销。这里重算清楚，别把两把刀算成一把。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const FN = () => {
  const d = document.getElementById("detail");
  const rows = [];
  let chrome = 0;
  for (const child of document.getElementById("d-body").children) {
    if (child.tagName !== "DL") chrome += child.getBoundingClientRect().height;
  }
  for (const f of document.querySelectorAll("#d-body .field")) {
    const dt = f.querySelector("dt"), dd = f.querySelector("dd");
    if (!dd) continue;
    const fcs = getComputedStyle(f), dcs = getComputedStyle(dd);
    const r = document.createRange(); r.selectNodeContents(dd);
    const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
    const lines = tops.size || 1;
    const lh = parseFloat(dcs.lineHeight);
    rows.push({
      label: dt ? dt.textContent : "?",
      fieldH: f.getBoundingClientRect().height,
      text: lines * lh,
      dt: dt ? dt.getBoundingClientRect().height : 0,
      dtGap: parseFloat(dcs.marginTop) || 0,   // dt margin-bottom 在 dt 上
      dtMb: parseFloat(getComputedStyle(dt).marginBottom) || 0,
      padField: parseFloat(fcs.paddingTop) + parseFloat(fcs.paddingBottom),
      bdField: parseFloat(fcs.borderTopWidth) + parseFloat(fcs.borderBottomWidth),
      padDd: parseFloat(dcs.paddingTop) + parseFloat(dcs.paddingBottom),
      marField: parseFloat(fcs.marginTop) + parseFloat(fcs.marginBottom),
      lines, lh,
    });
  }
  return { id: location.hash.slice(1), scrollH: d.scrollHeight, clientH: d.clientHeight, chrome, rows };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const vp of [{ k: "390", w: 390, h: 844, mobile: true }, { k: "1440", w: 1440, h: 900, mobile: false }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1800 });
    await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
    await sleep(300);
    const all = [];
    for (let i = 1; i <= 30; i++) {
      const id = "S" + String(i).padStart(2, "0");
      await page.eval((sid) => { location.hash = "#" + sid; }, id);
      await sleep(330);
      all.push(await page.eval(FN));
    }
    const T = all.reduce((a, r) => a + r.scrollH, 0);
    const sum = (k) => all.reduce((a, r) => a + r.rows.reduce((b, f) => b + f[k], 0), 0);
    const text = sum("text"), dtH = sum("dt"), padF = sum("padField"), bdF = sum("bdField"), padD = sum("padDd"), dtMb = sum("dtMb"), marF = sum("marField");
    const chrom = all.reduce((a, r) => a + r.chrome, 0);
    const nFields = all.reduce((a, r) => a + r.rows.length, 0);
    console.log(`\n=== ${vp.k} ===  scrollH 合计 ${T} (avg ${Math.round(T / 30)})，字段数 ${nFields}`);
    console.log(`  正文 行×行高          ${text.toFixed(0).padStart(7)}  ${(text / T * 100).toFixed(1)}%  ← 这才是「内容长度」`);
    console.log(`  dt 标签高度           ${dtH.toFixed(0).padStart(7)}  ${(dtH / T * 100).toFixed(1)}%  每字段 ${(dtH / nFields).toFixed(1)}px`);
    console.log(`  dt margin-bottom      ${dtMb.toFixed(0).padStart(7)}  ${(dtMb / T * 100).toFixed(1)}%  每字段 ${(dtMb / nFields).toFixed(1)}px`);
    console.log(`  .field padding        ${padF.toFixed(0).padStart(7)}  ${(padF / T * 100).toFixed(1)}%  每字段 ${(padF / nFields).toFixed(1)}px`);
    console.log(`  .field border         ${bdF.toFixed(0).padStart(7)}  ${(bdF / T * 100).toFixed(1)}%  每字段 ${(bdF / nFields).toFixed(1)}px`);
    console.log(`  .field margin         ${marF.toFixed(0).padStart(7)}  ${(marF / T * 100).toFixed(1)}%`);
    console.log(`  非字段 chrome         ${chrom.toFixed(0).padStart(7)}  ${(chrom / T * 100).toFixed(1)}%`);
    const layout = dtH + dtMb + padF + bdF + marF + chrom;
    console.log(`  ─────────────────────────────────`);
    console.log(`  布局开销合计          ${layout.toFixed(0).padStart(7)}  ${(layout / T * 100).toFixed(1)}%`);
    console.log(`  校验: text+layout = ${(text + layout).toFixed(0)} vs scrollH ${T} → 残差 ${(T - text - layout).toFixed(0)} (${((T - text - layout) / T * 100).toFixed(1)}%)`);
  }
} finally { await browser.close(); await srv.close(); }
