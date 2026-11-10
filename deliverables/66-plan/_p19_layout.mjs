/* 探针 19：决定性实验 —— 「390 档压不下去只能删内容」这个判断对不对？
 * 不动一个字，只改布局，量 scrollHeight 变化。三种 progressively 激进的布局：
 *   V1 dt 与 dd 同行（label 左列 88px，dd 右列）
 *   V2 在此基础上 .field padding 12px→8px
 *   V3 再收 dt 字号与 margin
 * 如果 V1 就能把 30/30 压到 3800 以下，那"内容长度不是布局浪费"就是错的。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const V = {
  base: "",
  v1: `.fields .field{display:grid;grid-template-columns:96px minmax(0,1fr);column-gap:8px;align-items:start}
       .fields .field>dt{margin:0}
       .fields .field>dd{grid-column:2}`,
  v2: `.fields .field{display:grid;grid-template-columns:96px minmax(0,1fr);column-gap:8px;align-items:start;padding:8px 0}
       .fields .field>dt{margin:0}
       .fields .field>dd{grid-column:2}`,
  v3: `.fields .field{display:grid;grid-template-columns:84px minmax(0,1fr);column-gap:6px;align-items:start;padding:6px 0}
       .fields .field>dt{margin:0;font-size:12px;line-height:1.35}
       .fields .field>dd{grid-column:2}`,
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const res = {};
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  for (const [k, css] of Object.entries(V)) {
    const hs = [];
    for (let i = 1; i <= 30; i++) {
      const id = "S" + String(i).padStart(2, "0");
      await page.eval((sid) => { location.hash = "#" + sid; }, id);
      await sleep(300);
      await page.eval((c) => {
        let st = document.getElementById("__exp");
        if (!st) { st = document.createElement("style"); st.id = "__exp"; document.head.appendChild(st); }
        st.textContent = c;
      }, css);
      await sleep(60);
      hs.push(await page.eval("document.getElementById('detail').scrollHeight"));
    }
    const over = hs.filter((x) => x > 3800).length;
    res[k] = hs;
    console.log(`${k.padEnd(5)} min ${Math.min(...hs)}  max ${Math.max(...hs)}  avg ${Math.round(hs.reduce((a, b) => a + b, 0) / 30)}  >3800: ${over}/30`);
  }
  // 逐案对比 base vs v3
  console.log("\n逐案（base → v3，Δ）：");
  for (let i = 0; i < 30; i++) {
    const id = "S" + String(i + 1).padStart(2, "0");
    console.log(`  ${id} ${String(res.base[i]).padStart(5)} → ${String(res.v3[i]).padStart(5)}  ${res.base[i] - res.v3[i] >= 0 ? "-" : "+"}${Math.abs(res.base[i] - res.v3[i])}`);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "candidate-layouts.json"), JSON.stringify(res, null, 2));
