/**
 * 探针 a10：在真实 Chrome（CDP）里打开选型台，调 window.buildStylePrompt('S01'/'S25')。
 *
 * 为什么不能只用 a09 的 vm：vm 里 document 是桩。prompt-copy.js 会在某些分支
 * 读 window.SCHEMES、document.createElement 等；桩对不上就会静默走另一条分支，
 * 于是"vm 里通过"不等于"页面上通过"。这里跑的是真正的 1440×1000 视口 + 真 DOM。
 *
 * 断言：
 *   1. 页面上 window.buildStylePrompt 是函数（说明 prompts.js + prompt-copy.js 都装上了）
 *   2. S01/S25 输出非空、长度合理、无 var(-- / undefined / NaN
 *   3. 页面输出的第 5 条线宽行与 dna-clean.json 一致
 *   4. 与 vm 版（a09）逐字相同 —— 证明两条装载路径给出同一答案
 *
 * 重跑：node deliverables/70-exec/probes-a/a10-cdp-build-prompt.mjs
 * 前置：无需手动起服务，脚本自带静态服务器；需要本机 Chrome。
 */
import http from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const ROOT = process.cwd();
const PORT = 9681;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2", ".woff": "font/woff", ".webp": "image/webp",
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/prototypes/_selection/index.html";
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end("no"); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const URL_SEL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;
const b = await Browser.launch({ width: 1440, height: 1000 });
const out = { url: URL_SEL, cases: {}, ok: true, problems: [] };
try {
  const p = await b.newPage({ width: 1440, height: 1000 });
  await p.goto(URL_SEL, { settleMs: 2500 });

  const env = await p.eval(`(() => ({
    hasBuild: typeof window.buildStylePrompt,
    hasPrompts: !!(window.STYLE_PROMPTS && window.STYLE_PROMPTS.schemes),
    nSchemes: (window.SCHEMES || []).length,
    nPrompts: window.STYLE_PROMPTS ? window.STYLE_PROMPTS.schemes.length : 0,
  }))()`);
  out.env = env;
  console.log("=== 页面环境 ===");
  console.log("  " + JSON.stringify(env));
  if (env.hasBuild !== "function") out.problems.push("window.buildStylePrompt 不是函数");
  if (env.nSchemes !== 30) out.problems.push("window.SCHEMES 不是 30 案（" + env.nSchemes + "）");

  for (const id of ["S01", "S09", "S25", "S20", "S27"]) {
    const t = await p.eval(`window.buildStylePrompt(${JSON.stringify(id)})`);
    const rec = { len: t ? t.length : 0, text: t };
    const d = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/dna-clean.json"), "utf8")).find((x) => x.id === id);
    rec.h1Size = d.h1Size; rec.lineWidths = d.lineWidths;
    rec.hasVar = /var\(--/.test(t || "");
    rec.hasUndef = /undefined/.test(t || "");
    rec.hasNaN = /\bNaN\b/.test(t || "");
    const lw = (t.match(/^5\. 线宽只用这几级：(.+?)，/m) || [])[1];
    rec.lineWidthsInPrompt = lw || null;
    rec.lineWidthsMatch = (lw || "") === d.lineWidths;
    rec.h1InPrompt = /首屏主标题取/.test(t) ? (t.match(/首屏主标题取 (.+?) 这一档/) || [])[1] : null;
    out.cases[id] = rec;
    if (!t || t.length < 1500 || t.length > 2100) out.problems.push(id + " 长度异常 " + rec.len);
    if (rec.hasVar) out.problems.push(id + " 含 var(--");
    if (rec.hasUndef) out.problems.push(id + " 含 undefined");
    if (rec.hasNaN) out.problems.push(id + " 含 NaN");
    if (!rec.lineWidthsMatch) out.problems.push(id + " 线宽行不符：" + lw + " vs " + d.lineWidths);
    console.log("\n=== " + id + " ===");
    console.log("  长度          : " + rec.len);
    console.log("  第 5 条线宽   : " + rec.lineWidthsInPrompt + (rec.lineWidthsMatch ? "  ✓ 与 dna 一致" : "  ✗"));
    console.log("  h1Size(dna)   : " + rec.h1Size);
    console.log("  含 var(--/und : " + rec.hasVar + " / " + rec.hasUndef + " / NaN:" + rec.hasNaN);
  }

  /* 逐字对照 vm 版（a09）：证明"vm 装载"与"浏览器装载"给出同一段文字。
   * 做法是直接再起一个 vm 上下文跑同样的三个文件 —— 不读 a09 的日志文本
   * （那里面混了中文标题行，按 JSON 解析必炸，第一版就踩了这个坑）。 */
  const vmMod = await import("node:vm");
  const vwin = {};
  const vdoc = {
    readyState: "complete", addEventListener() {}, querySelector: () => null,
    querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  const vsb = { window: vwin, document: vdoc, navigator: { userAgent: "node" } };
  vmMod.createContext(vsb);
  vsb.window = vwin; vwin.document = vdoc;
  for (const f of ["data.js", "prompts.js", "prompt-copy.js"]) {
    vmMod.runInContext(readFileSync(join(ROOT, "prototypes/_selection", f), "utf8"), vsb, { filename: f });
  }
  out.vmVsBrowser = {};
  for (const id of ["S01", "S25"]) {
    const vtext = vwin.buildStylePrompt(id);
    const same = vtext === out.cases[id].text;
    out.vmVsBrowser[id] = { vmLen: vtext.length, browserLen: out.cases[id].len, identical: same };
    if (!same) out.problems.push(id + " vm 版与浏览器版不一致（vm " + vtext.length + " 字 / 浏览器 " + out.cases[id].len + " 字）");
    console.log("  vm vs 浏览器 " + id + "：VM " + vtext.length + " 字 / 浏览器 " + out.cases[id].len + " 字 → " + (same ? "逐字相同 ✓" : "不同 ✗"));
  }

  console.log("\n=== S01 全文（页面真跑） ===");
  console.log(out.cases.S01.text);
  console.log("\n=== S25 全文（页面真跑） ===");
  console.log(out.cases.S25.text);
} finally {
  await b.close?.();
  server.close();
}

out.ok = out.problems.length === 0;
writeFileSync(join(ROOT, "deliverables/70-exec/logs/cdp-result.json"), JSON.stringify(out, null, 1), "utf8");
console.log("\n=== 汇总 ===");
console.log(out.ok ? "✓ 全部断言通过" : "✗ 问题 " + out.problems.length + " 条：\n  " + out.problems.join("\n  "));
process.exit(out.ok ? 0 : 1);
