/* 探针 35：复算 report.json 里 shadowStatic=17 的来源。
 * probe.mjs 只扫 `big`（area >= 60*30 = 1800px²）的元素，且判据是
 *   sh !== 'none' && !/^rgba?\(0, 0, 0, 0\) 0px 0px 0px 0px$/
 *   outer = 任一段 !inset && != ' 0px 0px 0px 0px' && !rgba(...,0)
 * 我 p25 的 13 用的是同一个 outer 判据但扫**全元素**。差 4 个说明我的扫描更严（更少）。
 * 这里按 probe.mjs 的 big 过滤复算一遍，看能不能得到 17。 */
import { resolve } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const FN = () => {
  const W = innerWidth, H = innerHeight;
  const big = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area >= 60 * 30) big.push(el);
  }
  const isOverlay = (el) => { for (let p = el, i = 0; p && i < 4; p = p.parentElement, i++) { const pos = getComputedStyle(p).position; if (pos === "fixed" || pos === "sticky") return true; if (p.matches('dialog, [role="dialog"], [role="menu"], [role="tooltip"], [popover]')) return true; } return false; };
  let shadowStatic = 0, shadowOverlay = 0, nonNone = 0, insetOnly = 0;
  const samples = [];
  for (const el of big) {
    const cs = getComputedStyle(el);
    const sh = cs.boxShadow;
    if (sh === "none") continue;
    nonNone++;
    if (/^rgba?\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(sh)) continue;
    const parts = sh.split(/,(?![^(]*\))/);
    const outer = parts.some((part) => !/inset/.test(part) && !/ 0px 0px 0px 0px/.test(part) && !/rgba\(\d+, \d+, \d+, 0\)/.test(part));
    if (outer) {
      if (isOverlay(el) || el.closest("[data-ui]")) shadowOverlay++;
      else { shadowStatic++; if (samples.length < 6) samples.push((el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""))); }
    } else insetOnly++;
  }
  let allNonNone = 0, allStatic = 0;
  for (const el of document.querySelectorAll("*")) {
    const sh = getComputedStyle(el).boxShadow;
    if (sh === "none") continue;
    allNonNone++;
    const parts = sh.split(/,(?![^(]*\))/);
    if (parts.some((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p))) allStatic++;
  }
  return { bigCount: big.length, shadowStatic, shadowOverlay, nonNone, insetOnly, samples, allNonNone, allStatic };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const vp of [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1 });
    await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1600 });
    await sleep(500);
    const r = await page.eval(FN);
    console.log(`${vp.w}x${vp.h}  big=${r.bigCount}  shadowStatic=${r.shadowStatic}  overlay=${r.shadowOverlay}  非none=${r.nonNone}  纯inset=${r.insetOnly}  ｜ 全元素非none=${r.allNonNone} 全元素外投影=${r.allStatic}`);
    console.log(`   静态样本: ${r.samples.join(" ")}`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
