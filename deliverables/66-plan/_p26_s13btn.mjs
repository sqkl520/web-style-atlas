/* 探针 26：S13 的 button-fx 能不能清？闸门判据是 buttons 的 computed boxShadow !== none（inset 也算）。
 * CONTRACT §9.3 明写 filter: drop-shadow() 不算 shadow。所以测试：
 *   A 按钮 box-shadow: none（裸平），保留其它元素的 inset 压痕
 *   B 按钮 box-shadow: none + filter: drop-shadow(1px 1px 0 ...)（合同认可的手段）
 * 量：外投影元素数 / 带阴影按钮数，并截图看按钮是否还有压痕感。 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const SCAN = () => {
  const split = (bs) => { const p = []; let d = 0, c = ""; for (const ch of bs) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { p.push(c.trim()); c = ""; } else c += ch; } if (c.trim()) p.push(c.trim()); return p; };
  let elems = 0;
  for (const el of document.querySelectorAll("*")) {
    const bs = getComputedStyle(el).boxShadow;
    if (!bs || bs === "none") continue;
    if (split(bs).some((x) => !/inset/.test(x) && !/ 0px 0px 0px 0px/.test(x) && !/rgba\(\d+, \d+, \d+, 0\)/.test(x))) elems++;
  }
  const btns = [...document.querySelectorAll("button, a.btn, .btn")];
  const withShadow = btns.filter((b) => { const bs = getComputedStyle(b).boxShadow; return bs && bs !== "none"; }).length;
  const withFilter = btns.filter((b) => /drop-shadow/.test(getComputedStyle(b).filter)).length;
  return { outerElems: elems, buttons: btns.length, withShadow, withFilter };
};

const ALL_INSET = `:root{
  --press-2:inset 2px 2px 3px rgba(36,31,23,0.08);
  --press-4:inset 0 -2px 3px rgba(36,31,23,0.06);
  --press-2-hover:inset 2px 2px 4px rgba(36,31,23,0.18);
  --press-1:inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
  --press-3:inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
  --press-1-rev:inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
}`;

const CASES = {
  A_allInset: ALL_INSET,
  B_btnsNoShadow: ALL_INSET + `
    button.btn{box-shadow:none !important}`,
  C_btnsDropShadow: ALL_INSET + `
    button.btn{box-shadow:none !important;filter:drop-shadow(1.5px 1.5px 0 var(--shade))}`,
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const SHOTS = resolve("deliverables/66-plan/_out/shots");
mkdirSync(SHOTS, { recursive: true });
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1600 });
  await sleep(400);
  const out = {};
  for (const [k, css] of Object.entries(CASES)) {
    await page.eval((c) => {
      let st = document.getElementById("__fix");
      if (!st) { st = document.createElement("style"); st.id = "__fix"; document.head.appendChild(st); }
      st.textContent = c;
    }, css);
    await sleep(150);
    const r = await page.eval(SCAN);
    out[k] = r;
    console.log(`${k.padEnd(16)} 外投影元素 ${String(r.outerElems).padStart(2)} ｜ 按钮 ${r.buttons} 带 box-shadow ${r.withShadow} 带 drop-shadow ${r.withFilter}`);
    await page.eval(() => {
      const b = [...document.querySelectorAll("button.btn")].find((x) => x.getBoundingClientRect().width > 0);
      if (b) b.scrollIntoView({ block: "center" });
    });
    await sleep(250);
    await page.screenshot({ path: join(SHOTS, "s13-" + k + ".jpg"), quality: 82 });
  }
  writeFileSync(join(resolve("deliverables/66-plan/_out"), "s13-buttonfix.json"), JSON.stringify(out, null, 2));
  await page.close();
} finally { await browser.close(); await srv.close(); }
