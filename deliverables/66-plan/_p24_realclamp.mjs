/* 探针 24：把「折叠长字段」做成真实 DOM 改动，而不是模拟。
 * 做法：给每个 .field dd 加 -webkit-line-clamp:3 + overflow:hidden（真折，不是估算），
 * 量 390 档 scrollHeight。这验证「非删内容也能进 3800」这条路真的存在。 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const CSS = {
  base: "",
  clamp3: `.fields .field>dd{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}`,
  clamp4: `.fields .field>dd{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}`,
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const res = {};
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  for (const [k, css] of Object.entries(CSS)) {
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
    res[k] = hs;
    console.log(`${k.padEnd(7)} min ${Math.min(...hs)}  max ${Math.max(...hs)}  avg ${Math.round(hs.reduce((a, b) => a + b, 0) / 30)}  >3800: ${hs.filter((x) => x > 3800).length}/30`);
  }
  // 视觉可读性代价：3 行 clamp 后，30 案共有多少字段被截（截=内容看不见）
  const cut = await page.eval(() => {
    let n = 0, total = 0;
    for (const dd of document.querySelectorAll("#d-body .field>dd")) {
      total++;
      if (dd.scrollHeight > dd.clientHeight + 1) n++;
    }
    return { cut: n, total };
  });
  console.log(`\nclamp4 状态下被截字段 = ${cut.cut}/${cut.total}`);
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(resolve("deliverables/66-plan/_out"), "real-clamp.json"), JSON.stringify(res, null, 2));
