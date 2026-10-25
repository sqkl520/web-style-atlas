/**
 * 从 30 个原型的 style.css / index.html 里抽取「可移植风格 DNA」。
 *
 * 为什么不用 _specs 的现成文字：
 *  - 取证实测：:root 只覆盖 41-54% 的身份事实，但它**是配色的唯一可信来源**
 *    （面积比只写在文件头注释里）；字族/圆角/阴影哲学必须从 CSS 正文抽。
 *  - 机制句只有 10/30 有，且被 collect-schemes.mjs 的 replace 剥成空串后丢弃
 *    —— 这里直接自己解析，不依赖那条链路。
 *
 * 输出：prototypes/_prompts/dna-raw.json（中间产物，供人工核随后落成 prompts-dna.js）
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/* 仓库根：从脚本自身位置推导，不再硬编码。
 * 原实现写死 "D:/Web/style"（本机绝对路径），克隆到任何别的路径都会立刻失败；
 * 而 prompts.js 是 tracked 的构建产物，读它的人有权复算它。 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const P = join(ROOT, "prototypes");
const SPECS = join(P, "_specs");

const schemes = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();

// 取 :root { ... } 块内的声明
function parseRoot(css) {
  const m = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!m) return [];
  const out = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let x;
  while ((x = re.exec(m[1]))) {
    out.push({ name: x[1], value: x[2].trim() });
  }
  return out;
}

function analyze(scheme) {
  const dir = join(P, scheme);
  const cssPath = join(dir, "style.css");
  const htmlPath = join(dir, "index.html");
  const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";

  // ---- 颜色：:root 里的 hex ----
  const vars = parseRoot(css);
  const colors = [];
  for (const v of vars) {
    const h = v.value.match(/#[0-9A-Fa-f]{3,8}\b/);
    if (h) colors.push({ name: v.name, hex: h[0] });
  }

  // ---- 字族 ----
  const families = new Set();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const first = m[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (first && !/^(serif|sans-serif|monospace|system-ui|ui-|cursive|fantasy|inherit|initial)$/i.test(first)) {
      families.add(first);
    }
  }
  const fontFaces = new Set();
  for (const m of css.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*["']([^"']+)["']/g)) {
    fontFaces.add(m[1]);
  }

  // ---- 圆角 ----
  const radii = new Set();
  for (const m of css.matchAll(/border-radius\s*:\s*([^;}]+)/g)) {
    radii.add(m[1].trim());
  }

  // ---- 阴影哲学 ----
  const shadows = [];
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)) shadows.push(m[1].trim());
  const drops = [];
  for (const m of css.matchAll(/drop-shadow\s*\(([^)]*)\)/g)) drops.push(m[1].trim());

  let shadowKind = "none";
  if (shadows.length) {
    const outer = shadows.filter((s) => !s.includes("inset") && s !== "none");
    shadowKind = outer.length ? "has-outer" : "inset-only";
  } else if (drops.length) {
    shadowKind = "drop-shadow-only";
  }

  // ---- 线宽分级 ----
  const widths = new Set();
  for (const m of css.matchAll(/(?:border(?:-(?:top|right|bottom|left))?|outline)\s*:\s*([0-9.]+)px/g)) {
    widths.add(m[1]);
  }

  // ---- 机制句（直接从 specs 抓，绕开 collect-schemes 的 bug）----
  const id = scheme.slice(0, 3);
  const specPath = join(SPECS, id + ".md");
  let mechanism = "";
  let structType = "";
  let threshold = "";
  let tone = "";
  if (existsSync(specPath)) {
    const spec = readFileSync(specPath, "utf8");
    const mm = spec.match(/1-附（去掉名字之后的机制）[：:]\s*([^\n]+)/);
    if (mm) mechanism = mm[1].trim();
    const h = spec.match(/结构类型\*\*[：:]\s*([^｜|]+)[｜|]\s*认知门槛\*\*[：:]\s*([^｜|]+)[｜|]\s*调性\*\*[：:]\s*([^\n]+)/);
    if (h) {
      structType = h[1].trim();
      threshold = h[2].trim();
      tone = h[3].trim();
    }
  }

  // ---- h1 字号 ----
  let h1Size = "";
  const h1 = css.match(/h1\s*\{[^}]*font-size\s*:\s*([^;}]+)/);
  if (h1) h1Size = h1[1].trim();

  return {
    id: id,
    dir: scheme,
    structType: structType,
    threshold: threshold,
    tone: tone,
    colors: colors,
    families: [...families],
    fontFaces: [...fontFaces],
    radii: [...radii],
    shadowKind: shadowKind,
    shadowSample: shadows.slice(0, 2),
    dropSample: drops.slice(0, 2),
    lineWidths: [...widths].sort((a, b) => parseFloat(a) - parseFloat(b)),
    h1Size: h1Size,
    mechanism: mechanism,
    mechanismChars: mechanism.length,
  };
}

const rows = schemes.map(analyze);

const stats = {
  total: rows.length,
  withMechanism: rows.filter((r) => r.mechanism).length,
  zeroRadius: rows.filter((r) => r.radii.length === 1 && r.radii[0] === "0").length,
  insetOnly: rows.filter((r) => r.shadowKind === "inset-only").length,
  hasOuter: rows.filter((r) => r.shadowKind === "has-outer").length,
  dropOnly: rows.filter((r) => r.shadowKind === "drop-shadow-only").length,
  shadowNone: rows.filter((r) => r.shadowKind === "none").length,
  noRoot: rows.filter((r) => r.colors.length === 0).map((r) => r.id),
  fontCoverage: rows.filter((r) => r.families.length > 0).length,
};

writeFileSync(
  join(ROOT, "prototypes/_prompts/dna-raw.json"),
  JSON.stringify({ stats: stats, rows: rows }, null, 2),
  "utf8"
);

console.log("=== 汇总 ===");
console.log("  机制句 " + stats.withMechanism + "/30 · 全直角 " + stats.zeroRadius + "/30 · 只 inset " + stats.insetOnly + "/30");
console.log("  外投影 " + stats.hasOuter + " · 只 drop-shadow " + stats.dropOnly + " · 无阴影 " + stats.shadowNone);
console.log("  无 :root 色的案：" + (stats.noRoot.join(",") || "无"));
console.log("  有字族的案：" + stats.fontCoverage + "/30");
console.log("");
console.log("案  直角 inset 线宽         字族(前2)                              机制句");
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const zr = r.radii.length === 1 && r.radii[0] === "0" ? "Y" : " ";
  const io = r.shadowKind === "inset-only" ? "Y" : (r.shadowKind === "none" ? "-" : " ");
  const w = r.lineWidths.slice(0, 4).join("/").padEnd(12);
  const f = r.families.slice(0, 2).join(", ").slice(0, 38).padEnd(38);
  const mech = r.mechanism ? r.mechanismChars + "字" : "—";
  console.log(r.id + "  " + zr + "    " + io + "    " + w + " " + f + " " + mech);
}
console.log("");
console.log("  中间产物：prototypes/_prompts/dna-raw.json");
