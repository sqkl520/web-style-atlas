/* 探针 20：390 档真正能压下来的杠杆是什么？
 * 布局杠杆已证伪（dt 左列反而 +8~20%，因为 390 宽下正文列只剩 294px，行数暴涨）。
 * 这里测三个**非删内容**的杠杆：
 *   F1 只折「最长的 3 个字段」（保留标题可见，点击展开）
 *   F2 折 4 个长字段（视觉/布局/可落地/动效）
 *   F3 折 6 个
 * 折法用 <details> 语义等价物：把 dd 包进 details，summary 显示首行。
 * 为不破坏 DOM，用 CSS max-height + 展开按钮模拟最低成本：这里只算「折叠后高度」上限，
 * 即 summary 行高 24px + dt 21px + padding 24px + border。
 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { Browser, sleep } from "../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
import { startServer } from "../65-audit/lab/serve.mjs";

const MEASURE = () => {
  const d = document.getElementById("detail");
  const fields = [...document.querySelectorAll("#d-body .field")];
  const hs = fields.map((f) => ({
    label: (f.querySelector("dt") || {}).textContent || "?",
    h: f.getBoundingClientRect().height,
  }));
  return { scrollH: d.scrollHeight, fields: hs };
};

const srv = await startServer(resolve("."));
const browser = await Browser.launch();
const SUM = (fieldH, labelH) => Math.min(fieldH, 24 + labelH + 24 + 1); // summary 24 + dt 21 + padding 24 + border
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + "/prototypes/_selection/index.html", { settleMs: 1600 });
  await page.eval("document.fonts.ready.then(() => true)").catch(() => {});
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    const id = "S" + String(i).padStart(2, "0");
    await page.eval((sid) => { location.hash = "#" + sid; }, id);
    await sleep(320);
    rows.push({ id, ...(await page.eval(MEASURE)) });
  }
  const sim = (k) => rows.map((r) => {
    const sorted = r.fields.slice().sort((a, b) => b.h - a.h).slice(0, k);
    const saved = sorted.reduce((a, f) => a + f.h - SUM(f.h, 21), 0);
    return Math.max(0, Math.round(r.scrollH - saved));
  });
  const base = rows.map((r) => r.scrollH);
  console.log(`base   min ${Math.min(...base)} max ${Math.max(...base)} avg ${Math.round(base.reduce((a, b) => a + b) / 30)} >3800 ${base.filter((x) => x > 3800).length}/30`);
  for (const k of [1, 2, 3, 4, 6, 8]) {
    const s = sim(k);
    console.log(`折${String(k).padStart(2)}个 min ${Math.min(...s)} max ${Math.max(...s)} avg ${Math.round(s.reduce((a, b) => a + b) / 30)} >3800 ${s.filter((x) => x > 3800).length}/30`);
  }
  // 也测「只折 image 相关 max-height 3 行」的通用做法：每字段最多 3 行
  const clamp3 = rows.map((r) => {
    let saved = 0;
    for (const f of r.fields) { const maxH = 21 + 24 + 3 * 28; if (f.h > maxH) saved += f.h - maxH - 24; }
    return Math.max(0, Math.round(r.scrollH - saved));
  });
  console.log(`每字段 3 行上限 min ${Math.min(...clamp3)} max ${Math.max(...clamp3)} avg ${Math.round(clamp3.reduce((a, b) => a + b) / 30)} >3800 ${clamp3.filter((x) => x > 3800).length}/30`);
  console.log("\n字段高度排序示例（S29 最差案）:");
  const worst = rows.find((r) => r.scrollH === Math.max(...base));
  console.log(" ", worst.id, worst.scrollH, worst.fields.map((f) => f.label + "=" + Math.round(f.h)).join(" "));
  await page.close();
  writeFileSync(join(resolve("deliverables/66-plan/_out"), "fold-sim.json"), JSON.stringify({ rows, base }, null, 2));
} finally { await browser.close(); await srv.close(); }
