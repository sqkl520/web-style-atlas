/* 按钮方案第 4 轮（决策轮）：S = 面板画在 .btn 上不动、接触阴影由 ::before 的 filter 落。
   为什么要这一步：直接把 filter 加在 .btn 上，滤镜作用于**整个元素渲染结果，含文字与 SVG 图标**，
   15px 汉字的笔画会带一层位移重影（3× 放大实测文字区 mean|Δ| 1.43 / 最大 76）。
   把影移到伪元素上，文字就完全不进滤镜。

   同时验证两件不能想当然的事：
     1) .btn 自己的 background 不透明，会不会把伪元素的影盖掉（不会——影落在盒子**外**，但必须量）；
     2) 按钮填充色仍在（探测按钮的判据是 bg alpha >= 0.5，若变透明按钮会被整批筛掉 =
        看着 FAIL 消失，实际是把测量对象弄没了）。
     3) is-loading 的 overflow:hidden 会不会把伪元素的影裁掉。

   node deliverables/66-exec/_s13btnS.mjs
*/
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const OUT = resolve("deliverables/66-exec/trials/zoom4");
mkdirSync(OUT, { recursive: true });

const BASE = `:root{
  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
  --lift-2: drop-shadow(2px 2px 3px rgba(36,31,23,0.08));
  --lift-2-hover: drop-shadow(2px 2px 4px rgba(36,31,23,0.18));
}`;

const S = `${BASE}
  .btn{box-shadow:none;position:relative;isolation:isolate;
       transition:transform var(--press-ms) steps(2)}
  .btn::before{content:"";position:absolute;inset:0;z-index:-1;
       background:var(--paper);filter:var(--lift-2)}
  .btn:hover::before,.btn--issue:hover::before{filter:var(--lift-2-hover)}
  .btn:active::before{filter:none}
  .btn:active{transform:translateY(0.8px)}
  .btn[disabled],.btn.is-error{box-shadow:none}
  .btn[disabled]::before{filter:none;outline:2px solid var(--shade);outline-offset:-2px;background:var(--paper)}
  .btn.is-error::before{filter:none;background:var(--ink)}`;

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const MEASURE = (tag) => {
  const out = {};
  const btns = [...document.querySelectorAll("button.btn")];
  out.buttons = btns.map((b) => {
    const cs = getComputedStyle(b);
    const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const a = m ? (m[1].split(/[,\s/]+/).filter(Boolean).map(Number)[3] ?? 1) : 0;
    return { id: b.id, bg: cs.backgroundColor, bgAlpha: a, boxShadow: cs.boxShadow, filter: cs.filter, h: Math.round(b.getBoundingClientRect().height) };
  });
  out.withShadowInset = out.buttons.filter((b) => b.boxShadow !== "none").length;
  out.visible = out.buttons.filter((b) => b.bgAlpha >= 0.5).length;
  return out;
};
try {
  for (const [name, css] of Object.entries({ base: "", S })) {
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
    const m = await page.eval(MEASURE, name);
    console.log(`\n=== ${name} ===  按钮数 ${m.buttons.length}  带 box-shadow ${m.withShadowInset}  填充可见 ${m.visible}`);
    for (const b of m.buttons) console.log(`   ${b.id.padEnd(11)} bg=${b.bg.padEnd(22)} alpha=${b.bgAlpha} shadow=${b.boxShadow === "none" ? "none" : b.boxShadow.slice(0, 30)} filter=${b.filter === "none" ? "none" : b.filter.slice(0, 46)} h=${b.h}`);

    for (const [tag, sel] of [["issue", "#issueBtn"], ["reject", "#rejectBtn"], ["archive", "#archiveBtn"]]) {
      await page.eval((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
      await sleep(250);
      const rect = await page.eval((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.left + window.scrollX - 6, y: r.top + window.scrollY - 6, width: r.width + 12, height: r.height + 12 };
      }, sel);
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), format: "png", clip: { ...rect, scale: 3 } });
    }
    // is-loading：量 overflow:hidden 是否裁掉伪元素的影
    await page.eval(() => { document.querySelector("#forwardBtn").classList.add("is-loading"); document.querySelector("#forwardBtn").scrollIntoView({ block: "center" }); });
    await sleep(700);
    const lr = await page.eval(() => {
      const r = document.querySelector("#forwardBtn").getBoundingClientRect();
      return { x: r.left + window.scrollX - 8, y: r.top + window.scrollY - 8, width: r.width + 16, height: r.height + 16 };
    });
    await page.screenshot({ path: join(OUT, `${name}-loading.png`), format: "png", clip: { ...lr, scale: 3 } });
    await page.eval(() => document.querySelector("#forwardBtn").classList.remove("is-loading"));
    console.log(`   ${name} 截图完成`);
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log("-> deliverables/66-exec/trials/zoom4/");
