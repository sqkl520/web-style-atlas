#!/usr/bin/env node
/* EXEC-B：在 Node 里加载**真实的** prompt-copy.js + prompts.js，产出 30 条提示词全文。
 *
 * 为什么不自己拼字符串：提示词是这两个文件在浏览器里运行出来的最终结果，
 * 任何"读源码猜输出"的做法都会漏掉条件分支、拼接顺序、去重逻辑。
 * 做法：伪造一个最小 window，按 index.html 的顺序 eval 两个文件，再调 window.buildStylePrompt。
 * data.js 也一并加载，因为 tone/mood 走的是 window.SCHEMES。
 *
 * 用法：
 *   node B-dump-prompts.mjs                 → 全部 30 条，输出到 json + 逐条 txt
 *   node B-dump-prompts.mjs S19 S25 S13     → 只打印这几条全文
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');

/* 最小 DOM/浏览器桩。prompt-copy.js 只在**构建字符串**时会跑这些：
 * 它读 window.STYLE_PROMPTS / window.SCHEMES，写 window.buildStylePrompt。
 * 只要不触发 UI 渲染路径，这些桩就够。 */
function makeContext() {
  const noop = function () {};
  const el = new Proxy({}, {
    get(t, k) {
      if (k === "style") return new Proxy({}, { get: () => "", set: () => true });
      if (k === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (k === "appendChild" || k === "addEventListener" || k === "setAttribute" ||
          k === "removeAttribute" || k === "insertAdjacentHTML" || k === "remove") return noop;
      if (k === "querySelector" || k === "querySelectorAll" || k === "closest") {
        return () => (k === "querySelectorAll" ? [] : null);
      }
      if (k === "textContent" || k === "innerHTML" || k === "value") return "";
      if (k === "children" || k === "childNodes") return [];
      if (k === "dataset") return {};
      if (k === "parentElement" || k === "parentNode") return null;
      return undefined;
    },
    set() { return true; },
  });
  const doc = {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => el,
    createElementNS: () => el,
    addEventListener: noop,
    documentElement: { classList: { add: noop, remove: noop, contains: () => false }, style: { setProperty: noop } },
    body: el,
    head: el,
    readyState: "complete",
  };
  const ctx = {
    console, document: doc, navigator: { clipboard: { writeText: () => Promise.resolve() }, userAgent: "node" },
    location: { href: "http://localhost/", search: "", hash: "" },
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
    requestAnimationFrame: noop, cancelAnimationFrame: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop }),
    alert: noop, fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
    URLSearchParams, encodeURIComponent, decodeURIComponent, JSON, Math, Date, RegExp,
    parseInt, parseFloat, isNaN, String, Number, Array, Object, Boolean, Error, Map, Set, Promise,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.self = ctx;
  return vm.createContext(ctx);
}

const ctx = makeContext();
const load = (file) => {
  const src = readFileSync(join(SEL, file), "utf8");
  vm.runInContext(src, ctx, { filename: file });
};
/* 加载顺序必须与 index.html 一致：data.js → prompts.js → prompt-copy.js */
for (const f of ["data.js", "prompts.js", "prompt-copy.js"]) load(f);

const build = ctx.window.buildStylePrompt;
if (typeof build !== "function") {
  console.error("buildStylePrompt 没有挂到 window 上，检查 prompt-copy.js 末尾的 window.buildStylePrompt = buildPrompt");
  process.exit(2);
}

const P = ctx.window.STYLE_PROMPTS;
/* prompts.js 的形状：window.STYLE_PROMPTS = { sceneIndex, unsupported, hardIds, schemes: [...] }
 * schemes 是**数组**（不是 byId 字典），每项有 id/dir/plain/scenes/dna。 */
const list = [...new Set(((P && P.schemes) || []).map((s) => s.id))].sort();
if (!list.length) { console.error("STYLE_PROMPTS.schemes 为空或形状变了"); process.exit(2); }

const out = {};
for (const id of list) {
  let text = "";
  let err = null;
  try { text = build(id); } catch (e) { err = String(e && e.message || e); }
  out[id] = { text: String(text || ""), len: [...String(text || "")].length, err };
}

const targets = process.argv.slice(2).filter((a) => /^S\d\d$/.test(a));
if (targets.length) {
  for (const id of targets) {
    console.log("\n" + "=".repeat(78));
    console.log("### " + id + "   长度 " + out[id].len + " 字" + (out[id].err ? "   ERROR: " + out[id].err : ""));
    console.log("=".repeat(78));
    console.log(out[id].text);
  }
} else {
  mkdirSync(join(ROOT, "deliverables/70-exec/probes-b/prompts"), { recursive: true });
  const lens = [];
  for (const id of list) {
    writeFileSync(join(ROOT, `deliverables/70-exec/probes-b/prompts/${id}.txt`), out[id].text, "utf8");
    lens.push(out[id].len);
  }
  writeFileSync(join(ROOT, "deliverables/70-exec/probes-b/prompts-all.json"), JSON.stringify(out, null, 1), "utf8");
  const sorted = [...lens].sort((a, b) => a - b);
  console.log("30 条提示词已导出 → deliverables/70-exec/probes-b/prompts/");
  console.log("长度：min " + sorted[0] + " / 中位 " + sorted[Math.floor(sorted.length / 2)] +
    " / max " + sorted[sorted.length - 1]);
  const bad = list.filter((id) => out[id].err);
  if (bad.length) console.log("构建失败：" + bad.join(" "));
  for (const id of list) {
    const t = out[id].text;
    const flags = [];
    if (/undefined/.test(t)) flags.push("undefined");
    if (/var\(--/.test(t)) flags.push("var(--");
    if (/NaN/.test(t)) flags.push("NaN");
    if (!t.length) flags.push("EMPTY");
    if (flags.length) console.log("  " + id + "  ⚠ " + flags.join(" ") + "  (len " + out[id].len + ")");
  }
  console.log("异常扫描完成。");
}
