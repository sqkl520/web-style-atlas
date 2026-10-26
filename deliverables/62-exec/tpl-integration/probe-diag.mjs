// 诊断：为什么 window.benchSetSceneIds 不存在 —— 抓 app.js 执行期的异常。
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
const errs = [];
b.on(p.sessionId, "Runtime.exceptionThrown", (x) => errs.push(JSON.stringify(x).slice(0, 500)));
b.on(p.sessionId, "Runtime.consoleAPICalled", (x) => errs.push("console:" + JSON.stringify(x.args).slice(0, 300)));
await p.goto("http://127.0.0.1:9560/", { settleMs: 1500 });
const r = await p.eval(() => ({
  schemes: (window.SCHEMES || []).length,
  prompts: !!window.STYLE_PROMPTS,
  fn: typeof window.benchSetSceneIds,
  rows: document.querySelectorAll("#ledger .row").length,
  count: (document.getElementById("count") || {}).textContent,
}));
console.log(JSON.stringify(r, null, 1));
console.log("errs:", errs.slice(0, 10));
console.log("pageErrors:", p.consoleErrors);
await b.close();
