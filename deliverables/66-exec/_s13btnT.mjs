/* 按钮方案第 5 轮（决策轮）：T = 伪元素 background-color: inherit，影由伪元素的 filter 落。
 * 与 S 的区别只有一处：S 把纸色写死在伪元素上，于是盖掉了 .btn--issue 的烫金（实测 issueBtn
 * 整块变成纸色，等于把唯一的色面弄没了）；T 继承父级底色，画两遍同色，肉眼不可见。
 *
 * 同时出 6× 文字区放大图 —— 直接加 filter 在 .btn 上时，filter 作用于整个渲染结果，**含文字**，
 * 15px 汉字的笔画会带一层位移重影。这一轮就是为了看清它到底看不看得见。
 *   node deliverables/66-exec/_s13btnT.mjs
 */
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials/zoom5");
mkdirSync(OUT, { recursive: true });

const ROOT = `:root{
  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
  --lift-2: drop-shadow(2px 2px 3px rgba(36,31,23,0.08));
  --lift-2-hover: drop-shadow(2px 2px 4px rgba(36,31,23,0.18));
}`;

const VARIANTS = {
  base: "",
  // 任务书原配方：硬边 1.5px，直接落在 .btn 上（文字进滤镜）
  A: `${ROOT} .btn{box-shadow:none;filter:drop-shadow(1.5px 1.5px 0 var(--shade))}`,
  // 同数值漂移到 filter，直接落在 .btn 上（文字进滤镜）
  R: `${ROOT} .btn{box-shadow:none;filter:var(--lift-2)}`,
  // T：影落在继承底色的伪元素上，文字不进滤镜
  T: `${ROOT}
    .btn{box-shadow:none;position:relative;isolation:isolate}
    .btn::before{content:"";position:absolute;inset:0;z-index:-1;
      background-color:inherit;filter:var(--lift-2)}
    .btn:hover::before,.btn--issue:hover::before{filter:var(--lift-2-hover)}
    .btn:active::before{filter:none}
    .btn[disabled]::before,.btn.is-error::before{filter:none}
    .btn[disabled]::before{outline:2px solid var(--shade);outline-offset:-2px}`,
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
      await sleep(250);
    }
    // 整块按钮 3×
    for (const [tag, sel] of [["issue", "#issueBtn"], ["reject", "#rejectBtn"], ["archive", "#archiveBtn"]]) {
      await page.eval((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
      await sleep(250);
      const rect = await page.eval((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.left + window.scrollX - 6, y: r.top + window.scrollY - 6, width: r.width + 12, height: r.height + 12 };
      }, sel);
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), format: "png", clip: { ...rect, scale: 3 } });
    }
    // 文字区 6×：「驳」字附近
    await page.eval(() => document.querySelector("#rejectBtn").scrollIntoView({ block: "center" }));
    await sleep(250);
    const tr = await page.eval(() => {
      const b = document.querySelector("#rejectBtn").getBoundingClientRect();
      // 4 个汉字宽的一段文字，避开盒子边缘
      return { x: b.left + window.scrollX + 50, y: b.top + window.scrollY + 8, width: 96, height: 30 };
    });
    await page.screenshot({ path: join(OUT, `${name}-glyph6x.png`), format: "png", clip: { ...tr, scale: 6 } });
    console.log(`${name} done`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/zoom5/");
