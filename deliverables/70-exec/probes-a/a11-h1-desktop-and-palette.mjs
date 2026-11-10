/**
 * 探针 a11：两件小事，各出一份可复核的事实。
 *
 * ① **h1Size 取"桌面档"的实际效果**：把 clamp(a, b vw, c) 在 1440 视口下算成真实 px，
 *    并列出每一档（顶层 / 窄屏媒体）各自会得到多少 —— 这是"为什么取桌面档"的量化依据。
 *    重点看 S01（顶层 96 vs 窄屏 86）与 S12（顶层与 min-width:1440 档算完其实是同一个数）。
 *
 * ② **palette 两条链路是否互相影响**：`_build/collect-schemes.mjs` 有 `pal.length >= 4` 上限，
 *    但它写的是 `_selection/data.js`；`prompts.js` 的 palette 来自 `_prompts/` 链路。
 *    这里把两条链路的 palette 并列打印，直接看它们是不是同一个数据。
 *
 * 重跑：node deliverables/70-exec/probes-a/a11-h1-desktop-and-palette.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const P = join(ROOT, "prototypes");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();

/* ── ① clamp 在 1440 下的实际值 ─────────────────────────────────────── */
const evalClamp = (v, w = 1440) => {
  const m = v.match(/clamp\(\s*([0-9.]+)px\s*,\s*([0-9.]+)vw\s*,\s*([0-9.]+)px\s*\)/);
  if (!m) {
    const single = v.match(/^\s*([0-9.]+)px\s*$/);
    return single ? +single[1] : null;
  }
  const lo = +m[1], pref = (+m[2] / 100) * w, hi = +m[3];
  return Math.round(Math.min(Math.max(pref, lo), hi) * 100) / 100;
};

console.log("=== ① h1Size 各档在 1440 视口下的实际 px ===");
console.log("案    档位                              声明                              1440 实际px");
/* 顶层 :root 的变量表（只取不在任何媒体块里的 :root）—— 用来把 var(--fs-h1) 展开成 clamp。 */
function topVarTable(css) {
  const blocks = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let d = 1, i = m.index + m[0].length;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    blocks.push({ from: m.index, to: i });
  }
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    if (blocks.some((b) => m.index > b.from && m.index < b.to)) continue;
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return vars;
}
const expandV = (v, vars, n = 0) => (n > 6 || !v.includes("var(")) ? v
  : expandV(v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (a, k, fb) => vars[k] ?? fb ?? ""), vars, n + 1);
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const raw = readFileSync(join(P, dir, "style.css"), "utf8");
  const css = strip(raw);
  const vt = topVarTable(css);
  const html = readFileSync(join(P, dir, "index.html"), "utf8");
  const h1Tag = (html.match(/<h1\b[^>]*>/i) || [""])[0];
  const cls = (h1Tag.match(/\bclass\s*=\s*["']([^"']+)["']/i) || [, ""])[1].split(/\s+/).filter(Boolean);

  /* 独立扫：按 } 切块回溯选择器（与 clean-dna 不同的路径） */
  const blocks = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let d = 1, i = m.index + m[0].length;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    blocks.push({ cond: m[1].trim(), from: m.index, to: i });
  }
  const hits = [];
  for (const m of css.matchAll(/(?:^|[;{\s])([^{};]*?)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    if (!sel || /^@/.test(sel)) continue;
    const fm = m[2].match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/);
    if (!fm) continue;
    const groups = sel.split(",").map((s) => s.trim());
    const bare = groups.some((g) => /^h1(?![\w-])/i.test(g));
    const desc = groups.some((g) => /(^|[\s>+~])h1(?![\w-])/i.test(g));
    const clsHit = cls.some((c) => groups.some((g) => new RegExp("\\." + c + "(?![\\w-])").test(g)));
    if (!bare && !desc && !clsHit) continue;
    const at = m.index + m[0].indexOf(sel);
    const inside = blocks.filter((b) => at > b.from && at < b.to).pop();
    hits.push({ rank: bare ? 0 : desc ? 1 : 2, sel, value: fm[1].trim(), media: inside ? inside.cond : "(顶层)" });
  }
  hits.sort((a, b) => a.rank - b.rank);
  for (const h of hits) {
    const resolved = expandV(h.value, vt).trim();
    console.log(
      id.padEnd(4) + " " + h.media.padEnd(34).slice(0, 34) + " " +
      (h.value + (resolved !== h.value ? " →" + resolved : "")).padEnd(34) + String(evalClamp(resolved) ?? "—")
    );
  }
}

/* ── ② 两条 palette 链路的并列对照 ──────────────────────────────────── */
const load = (promptsPath) => {
  const win = {};
  const doc = { readyState: "complete", addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };
  const sb = { window: win, document: doc, navigator: { userAgent: "node" } };
  vm.createContext(sb); sb.window = win; win.document = doc;
  vm.runInContext(readFileSync(join(ROOT, "prototypes/_selection/data.js"), "utf8"), sb, { filename: "data.js" });
  vm.runInContext(readFileSync(promptsPath, "utf8"), sb, { filename: "prompts.js" });
  const dna = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/dna-clean.json"), "utf8"));
  return { SCHEMES: win.SCHEMES, P: win.STYLE_PROMPTS, dna };
};

const { SCHEMES, P: P2, dna } = load(join(ROOT, "prototypes/_selection/prompts.js"));
console.log("\n=== ② 两条 palette 链路对照 ===");
console.log("案    data.js(collect-schemes, 上限4)           prompts.js(clean-dna, 上限7)        同一份?");
let same = 0;
for (const s of SCHEMES) {
  const djs = (s.palette || []).length;
  const prec = dna.find((x) => x.id === s.id);
  const pjs = prec.palette.length;
  if (djs === pjs) same++;
  console.log(
    s.id.padEnd(4) + " " + String(djs + " 色").padEnd(34) + " " + String(pjs + " 色").padEnd(34) +
    (djs === pjs ? "是" : "否 ← 独立抽取")
  );
}
console.log("  → 色数相同 " + same + "/30（不同即证明两者是独立来源，不是同一条链）");
console.log("  → prompts.js 的 palette 来自 dna-clean.json 的 pickPalette(:root, MAX=7)，");
console.log("     build-prompts.mjs 只从 data.js 读 RISK 与 REUSE 两个字段（grep 实测：data.js 仅在 L40/L76 被打开）。");
void P2;
