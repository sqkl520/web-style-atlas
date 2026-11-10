/* 按钮方案第 2 轮：比较 Q（面由 ::before 画、影由 ::before 的 filter: drop-shadow 落）
   与 P（伪元素硬边块）、A（直接 filter 在 .btn 上）。
   关键判据：**画面上不要有重影，但要有接触阴影**。3× 放大。
   node deliverables/66-exec/_s13btnzoom2.mjs
*/
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials/zoom2");
mkdirSync(OUT, { recursive: true });

const BASE = `:root{
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
  A: `${BASE} .btn,.btn:hover{box-shadow:none} .btn{filter:drop-shadow(1.5px 1.5px 0 var(--shade))}`,
  P: `${BASE}
    .btn,.btn:hover,.btn[disabled],.btn.is-error{box-shadow:none}
    .btn{position:relative;isolation:isolate}
    .btn::before{content:"";position:absolute;inset:0;background:var(--shade);transform:translate(2px,2px);z-index:-1}
    .btn:active::before{transform:none}
    .btn[disabled]::before{display:none}`,
  // Q：面在 ::before 上，影是该面的 filter: drop-shadow —— 文字完全不进滤镜
  Q: `${BASE}
    .btn,.btn:hover,.btn:active,.btn[disabled],.btn.is-error{box-shadow:none}
    .btn{position:relative;isolation:isolate;background:transparent;transition:transform var(--press-ms) steps(2)}
    .btn::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--paper);
      filter:drop-shadow(2px 2px 2px rgba(36,31,23,0.10))}
    .btn--issue::before{background:var(--gold)}
    .btn.is-error::before{background:var(--ink)}
    .btn:active::before{filter:drop-shadow(1px 1px 1px rgba(36,31,23,0.14));transform:translate(1px,1px)}
    .btn[disabled]::before{filter:none;outline:2px solid var(--shade);outline-offset:-2px}`,
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
    for (const [tag, sel] of [["issue", "#issueBtn"], ["reject", "#rejectBtn"], ["archive", "#archiveBtn"]]) {
      await page.eval((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
      await sleep(250);
      const rect = await page.eval((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.left + window.scrollX - 6, y: r.top + window.scrollY - 6, width: r.width + 12, height: r.height + 12 };
      }, sel);
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), format: "png", clip: { ...rect, scale: 3 } });
    }
    console.log(`${name} done`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/zoom2/");
