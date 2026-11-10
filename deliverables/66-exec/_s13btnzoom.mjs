/* 按钮 3× 放大对照：filter: drop-shadow 会连文字与图标的笔画一起投影（filter 作用于整个渲染结果），
   15px 汉字笔画约 1.5px，重影可能把字弄脏。这一轮把单个按钮放大 3 倍看清楚，再决定按钮怎么做。
   node deliverables/66-exec/_s13btnzoom.mjs
*/
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials/zoom");
mkdirSync(OUT, { recursive: true });

const ROOT_INSET = `:root{
  --press-2: inset 2px 2px 3px rgba(36,31,23,0.08);
  --press-4: inset 0 -2px 3px rgba(36,31,23,0.06);
  --press-2-hover: inset 2px 2px 4px rgba(36,31,23,0.18);
  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
  --press-1-off: inset 2px 2px 3px rgba(36,31,23,0), inset 2px 2px 2px rgba(36,31,23,0);
}`;

const VARIANTS = {
  base: ``,
  // 任务书配方：filter + --shade，1.5px 硬边
  A: `${ROOT_INSET}
    .btn,.btn:hover{box-shadow:none}
    .btn{filter:drop-shadow(1.5px 1.5px 0 var(--shade))}
    .btn:active{filter:none}`,
  // filter 但只 1px，且用半透明墨，重影更弱
  B: `${ROOT_INSET}
    .btn,.btn:hover{box-shadow:none}
    .btn{filter:drop-shadow(1px 1px 0 rgba(36,31,23,0.20))}
    .btn:active{filter:none}`,
  // 不用 filter：伪元素画一条偏移的接触阴影（不碰 box-shadow，也不碰文字）
  P: `${ROOT_INSET}
    .btn,.btn:hover,.btn[disabled],.btn.is-error{box-shadow:none}
    .btn{position:relative;z-index:0}
    .btn::before{content:"";position:absolute;inset:0;background:var(--shade);transform:translate(2px,2px);z-index:-1}
    .btn:active::before{transform:none}
    .btn[disabled]::before{display:none}`,
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
try {
  for (const [name, css] of Object.entries(VARIANTS)) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
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
    // 三个有代表性的按钮：金色击凸（签发）、纸色凸起（驳回）、停用槽（归档）
    for (const [tag, sel] of [["issue", "#issueBtn"], ["reject", "#rejectBtn"], ["archive", "#archiveBtn"]]) {
      await page.eval((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
      await sleep(250);
      const rect = await page.eval((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.left + window.scrollX - 6, y: r.top + window.scrollY - 6, width: r.width + 12, height: r.height + 12 };
      }, sel);
      // clip 支持 scale：用 3 倍输出，得到真正的放大像素而不是浏览器缩放
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), format: "png", clip: { ...rect, scale: 3 } });
    }
    console.log(`${name} done`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/zoom/");
