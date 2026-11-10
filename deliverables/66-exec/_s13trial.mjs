/* S13 修法的视觉对照实验：先把候选 CSS 注入真页面，出 2× 放大图，再决定落盘写什么。
 *
 * 目的：`filter: drop-shadow()` 在 .btn 上不只作用到按钮盒，**也作用到盒里的文字与图标**
 * （filter 作用于元素渲染结果，含子内容）。15px 汉字笔画约 1.5px，1.5px 偏移的浅色重影
 * 可能让字变脏。所以不能只信"闸门不报"，必须看图。
 *
 *   node deliverables/66-exec/_s13trial.mjs
 *
 * 输出 deliverables/66-exec/trials/{variant}-{area}.png
 */
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials");
mkdirSync(OUT, { recursive: true });

// 第 1+2 步（变量全 inset）是共同底座，各变体只在按钮做法上分叉
const ROOT_INSET = `:root{
  --press-2: inset 2px 2px 3px rgba(36,31,23,0.08);
  --press-4: inset 0 -2px 3px rgba(36,31,23,0.06);
  --press-2-hover: inset 2px 2px 4px rgba(36,31,23,0.18);
  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
  --press-1-off: inset 2px 2px 3px rgba(36,31,23,0), inset 2px 2px 2px rgba(36,31,23,0);
}`;
const BTN_CLEAR = `.btn:hover,.btn--issue:hover{box-shadow:none}
  .btn:active,[data-azimuth="315"] .log__empty{box-shadow:var(--press-1-rev)}
  .btn:active{box-shadow:none}
  .btn[disabled],.btn.is-error{box-shadow:none}`;

const VARIANTS = {
  // 0 现状（只截基线）
  base: ``,
  // A 任务书给的配方：filter + shade，硬边 0 模糊
  A_filterShade: `${ROOT_INSET}${BTN_CLEAR}
    .btn{filter:drop-shadow(1.5px 1.5px 0 var(--shade))}
    .btn:hover{filter:drop-shadow(2px 2px 0 var(--shade))}
    .btn:active,.btn[disabled]{filter:none;outline:2px solid var(--shade);outline-offset:-2px}`,
  // B filter 换成弱墨色，减少字上重影的对比
  B_filterInk: `${ROOT_INSET}${BTN_CLEAR}
    .btn{filter:drop-shadow(2px 2px 0 rgba(36,31,23,0.16))}
    .btn:hover{filter:drop-shadow(2.5px 2.5px 0 rgba(36,31,23,0.22))}
    .btn:active,.btn[disabled]{filter:none;outline:2px solid var(--shade);outline-offset:-2px}`,
  // C 不走 filter：用 border-bottom/right 的硬边当接触阴影（box-sizing:border-box，不引起重排）
  C_borderEdge: `${ROOT_INSET}${BTN_CLEAR}
    .btn{border-bottom:2px solid var(--shade);border-right:2px solid var(--shade)}
    .btn:hover{border-bottom-color:rgba(36,31,23,0.22);border-right-color:rgba(36,31,23,0.22)}
    .btn:active,.btn[disabled]{border-bottom-color:var(--paper);border-right-color:var(--paper);outline:2px solid var(--shade);outline-offset:-4px}`,
  // D 只 1 组：整页 2 张图，用来判断"全 inset 之后槽还看得见吗"
  D_noBtnChange: `${ROOT_INSET}`,
};

const AREAS = {
  actions: () => document.querySelector(".actions"),
  clause: () => document.querySelectorAll(".clause__head")[1],
  foil: () => document.querySelector(".specimen__foil"),
  signchain: () => document.querySelector(".signchain"),
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const [name, css] of Object.entries(VARIANTS)) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 2 });
    await page.goto(srv.origin + "/prototypes/S13-blind-debossed-dispatch/index.html", { settleMs: 1800 });
    await sleep(400);
    if (css) {
      await page.eval((c) => {
        let st = document.getElementById("__t");
        if (!st) { st = document.createElement("style"); st.id = "__t"; document.head.appendChild(st); }
        st.textContent = c;
      }, css);
      await sleep(200);
    }
    for (const [area, sel] of Object.entries(AREAS)) {
      // ⚠️ CDP 的 clip 用**页面坐标**，不是视口坐标。scrollIntoView 之后必须加 scrollY（+scrollX），
      //    否则裁出来是页面顶部的一块纯纸色 —— 第一版就是这样，得到两排全白图。
      await page.eval((s) => {
        const fn = eval("(" + s + ")");
        const el = fn(); if (el) el.scrollIntoView({ block: "center" });
      }, sel.toString()).catch(() => null);
      await sleep(250);
      const rect = await page.eval((s) => {
        const fn = eval("(" + s + ")");
        const el = fn(); if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.max(0, r.left + window.scrollX - 10),
          y: Math.max(0, r.top + window.scrollY - 10),
          width: r.width + 20, height: r.height + 20,
        };
      }, sel.toString()).catch(() => null);
      if (!rect) { console.log(`  ${name}/${area}: 找不到`); continue; }
      await page.screenshot({ path: join(OUT, `${name}-${area}.png`), format: "png", clip: { ...rect, scale: 1 } });
      console.log(`  ${name}/${area}  ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/");
