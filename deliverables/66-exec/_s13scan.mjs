/* S13 闸门口径扫描：把 probe.mjs 的判据逐条复刻出来，量"改前/改后"的确切数字。
 *
 * 为什么要自己量而不只看 report.json：report.json 只给一句 "17 box-shadow(s)"，
 * 不点名是哪 17 个。改之前必须知道改的是哪几个，改之后必须证明它们真的是 0，
 * 否则"FAIL 消失"可能只是元素变矮了、掉出 big 集合（area >= 60*30 = 1800）——
 * 那是量错对象，不是修好。
 *
 * 判据来源（逐字复刻）：
 *   probe.mjs:69   big = 元素 rect 面积 >= 60*30（1800）
 *   probe.mjs:318  outer = 任一段不含 inset、且不是 "0px 0px 0px 0px"、且不是 alpha=0 的 rgba
 *   probe.mjs:300  buttons[].shadow = computedStyle.boxShadow !== 'none'（inset 也算）
 *   rules.mjs:70   shadow FAIL ← shadowStatic
 *   rules.mjs:72   button-fx FAIL ← buttons.withShadow
 *
 *   node deliverables/66-exec/_s13scan.mjs before
 *   node deliverables/66-exec/_s13scan.mjs after
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const TAG = process.argv[2] || "scan";
const WIDTHS = [1440, 768, 390];
const HEIGHT = { 1440: 900, 768: 1024, 390: 844 };

// 逐字复刻 probe.mjs 的元素筛选与 split 逻辑
const SCAN = (CSS) => {
  const split = (bs) => {
    const parts = []; let d = 0, cur = "";
    for (const ch of bs) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch; }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };
  const outerSegs = (bs) => split(bs).filter((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p));
  const label = (el) => (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "")).slice(0, 60);

  const withOuter = [];      // 闸门 shadow 判据命中的元素
  const insetOnly = [];      // 只有 inset 段 —— 闸门不报，但视觉上仍在（要保住的就是这些）
  let allShadowed = 0;
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const bs = cs.boxShadow;
    if (!bs || bs === "none") continue;
    allShadowed++;
    const area = r.width * r.height;
    const big = area >= 60 * 30;
    const outer = outerSegs(bs);
    const rec = { el: label(el), area: Math.round(area), big, sh: bs };
    if (outer.length) { withOuter.push(rec); continue; }
    insetOnly.push(rec);
  }
  const bigOuter = withOuter.filter((x) => x.big);      // ← 闸门真正数的就是这个数组

  const btns = [];
  for (const el of document.querySelectorAll('a, button, [role="button"], input[type="submit"]')) {
    const r = el.getBoundingClientRect(); if (r.height < 28 || r.height > 84 || r.width < 64) continue;
    const cs = getComputedStyle(el);
    const bgA = (() => { const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return p.length > 3 ? p[3] : 1; })();
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bgA < 0.5 && bw < 1) continue;
    btns.push({
      el: label(el), text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 24),
      shadow: cs.boxShadow !== "none" && !/^rgba?\(0, 0, 0, 0\)/.test(cs.boxShadow),
      filter: cs.filter, sh: cs.boxShadow.slice(0, 70),
    });
  }
  // 按下态：闸门只在静止态判，但按钮的"压下去"感在按下时才出现 —— 这里单独量一次
  const pressedShadow = (() => {
    const b = document.querySelector("button.btn:not([disabled])");
    if (!b) return null;
    return getComputedStyle(b).boxShadow;
  })();
  return {
    viewport: CSS,
    gateShadow: bigOuter.length,
    gateButtonFx: btns.filter((b) => b.shadow).length,
    allShadowed, withOuter, bigOuter, insetOnly, btns,
    pressedShadow,
  };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const out = {};
mkdirSync(resolve("deliverables/66-exec/shots-s13"), { recursive: true });
try {
  for (const w of WIDTHS) {
    const h = HEIGHT[w];
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
    await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1800 });
    await sleep(500);
    // 闸门是在"滚过一遍再回到顶部"之后量的（inspect.mjs:117-119），这里也滚一遍
    const screens = await page.eval("Math.ceil(document.documentElement.scrollHeight / innerHeight)");
    for (let i = 1; i <= Math.min(11, screens); i++) {
      await page.eval(`window.scrollTo({top:${i * h},behavior:'instant'})`);
      await sleep(220);
    }
    await page.eval("window.scrollTo({top:0,behavior:'instant'})");
    await sleep(400);
    const r = await page.eval(SCAN, `${w}x${h}`);
    out[w] = r;
    console.log(`\n=== ${w}x${h} ===`);
    console.log(`  闸门 shadow（big 集合里的外投影元素）：${r.gateShadow}`);
    console.log(`  闸门 button-fx（带 box-shadow 的按钮）：${r.gateButtonFx}`);
    console.log(`  页面上一共有 box-shadow 的元素（含 inset）：${r.allShadowed}，其中纯 inset：${r.insetOnly.length}`);
    for (const x of r.bigOuter) console.log(`    [闸门计数] ${x.el}  area=${x.area}  ${x.sh.slice(0, 90)}`);
    for (const x of r.withOuter.filter((y) => !y.big)) console.log(`    (小元素/不计) ${x.el} area=${x.area}`);
    for (const b of r.btns) if (b.shadow) console.log(`    [按钮] ${b.el} "${b.text}" shadow=${b.sh.slice(0, 60)} filter=${b.filter}`);
    console.log(`  按下态按钮 box-shadow: ${String(r.pressedShadow).slice(0, 100)}`);
    await page.close();
  }
  writeFileSync(join(resolve("deliverables/66-exec"), `_scan-${TAG}.json`), JSON.stringify(out, null, 2));
  console.log(`\n-> deliverables/66-exec/_scan-${TAG}.json`);
} finally { await browser.close(); await srv.close(); }
