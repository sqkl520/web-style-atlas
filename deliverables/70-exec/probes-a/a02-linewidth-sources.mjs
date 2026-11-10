/**
 * 探针 a02：30 案线宽来源全盘点（只读）。
 *
 * 输出每个案子的：
 *   CSS 顶层 / CSS 窄屏媒体 / HTML 属性 / HTML 内联 style / HTML <style> 里的线宽值；
 * 以及当前 clean-dna.mjs lineWidthVerdict() 实际抽出的结果（复刻其算法）。
 *
 * 重跑：node deliverables/70-exec/probes-a/a02-linewidth-sources.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const P = join(ROOT, "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const round2 = (n) => Math.round(n * 100) / 100;

function walkRules(css, media, cb) {
  let i = 0, selStart = 0, depth = 0;
  const stack = [];
  while (i < css.length) {
    const ch = css[i];
    if (ch === "{") {
      stack.push({ sel: css.slice(selStart, i).trim(), start: i + 1, media });
      depth++;
      selStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (top) {
        const body = css.slice(top.start, i);
        if (/^@(media|supports|layer|container)\b/i.test(top.sel)) walkRules(body, top.sel, cb);
        /* 只在不在任何条件组里时上报；否则 @media 内的规则会被同时算成顶层值
         * （首版探针的真 bug，会让「仅窄屏」的值冒充桌面值）。 */
        else if (!stack.some((s) => /^@/.test(s.sel))) cb(top.sel, body, top.media);
      }
      depth--;
      selStart = i + 1;
    } else if (ch === ";" && depth === 0) selStart = i + 1;
    i++;
  }
}

const rootVars = (css) => {
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g))
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  return vars;
};
const resolveVars = (v, vars, d = 0) =>
  d > 6 || !v.includes("var(") ? v
    : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (a, n, fb) => (vars[n] ? resolveVars(vars[n], vars, d + 1) : fb || ""));

const numFrom = (v, allowBare) => {
  let s = v;
  s = s.replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (a, x, y) => round2(parseFloat(x) * parseFloat(y)) + "px");
  s = s.replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (a, x, y) => round2(parseFloat(x) * parseFloat(y)) + "px");
  const out = [];
  for (const m of s.matchAll(/([0-9.]+)px/g)) { const n = parseFloat(m[1]); if (n > 0) out.push(round2(n)); }
  if (allowBare) {
    const bare = s.match(/^\s*([0-9.]+)\s*$/);
    if (bare) { const n = parseFloat(bare[1]); if (n > 0) out.push(round2(n)); }
  }
  return out;
};

const WIDTH_PROP = /^(border|border-width|border-(top|right|bottom|left|block|inline)(-(width|start|end))?|outline|outline-width|column-rule|column-rule-width|stroke-width)$/i;

/* 旧算法复刻（clean-dna.mjs:452-501，改前） */
function legacyVerdict(css, vars) {
  const widths = new Set();
  const re = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(css))) {
    const v = resolveVars(m[1], vars, 0);
    let s = v.replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (a, x, y) => round2(parseFloat(x) * parseFloat(y)) + "px");
    s = s.replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (a, x, y) => round2(parseFloat(x) * parseFloat(y)) + "px");
    for (const q of s.matchAll(/([0-9.]+)px/g)) { const n = parseFloat(q[1]); if (n > 0) widths.add(round2(n)); }
    if (/stroke-width/i.test(m[0])) {
      const bare = s.match(/^\s*([0-9.]+)\s*$/);
      if (bare) { const n = parseFloat(bare[1]); if (n > 0) widths.add(round2(n)); }
    }
  }
  const list = [...widths].sort((a, b) => a - b);
  if (!list.length) return { text: "无边框线条", list, raw: [] };
  const fine = list.filter((w) => w < 1);
  const coarse = [];
  for (const w of list.filter((w) => w >= 1)) if (!coarse.some((c) => Math.abs(c - w) < 0.5)) coarse.push(w);
  const finalList = fine.concat(coarse).sort((a, b) => a - b);
  return { text: finalList.map((n) => n + "px").join("、"), list: finalList, raw: list };
}

const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const rawCss = readFileSync(join(P, dir, "style.css"), "utf8");
  const css = stripComments(rawCss);
  const vars = rootVars(css);
  const html = stripComments(readFileSync(join(P, dir, "index.html"), "utf8"));

  const top = new Map();      // value -> props
  const mediaAll = new Map();
  walkRules(css, null, (sel, body, media) => {
    for (const decl of body.split(";")) {
      const k = decl.indexOf(":");
      if (k < 0) continue;
      const prop = decl.slice(0, k).trim().toLowerCase();
      if (!WIDTH_PROP.test(prop)) continue;
      const value = decl.slice(k + 1).trim();
      if (/^(0|none|initial|unset|inherit|auto)$/i.test(value)) continue;
      const nums = numFrom(resolveVars(value, vars, 0), /stroke-width/.test(prop));
      for (const n of nums) {
        const bag = media ? mediaAll : top;
        if (!bag.has(n)) bag.set(n, []);
        bag.get(n).push(prop + "{" + value + "}" + (media ? "@" + media : ""));
      }
    }
  });

  /* HTML：属性 + 内联 style + <style> 块 */
  const htmlAttr = new Map();
  for (const m of html.matchAll(/\bstroke-width\s*=\s*["']([^"']+)["']/gi)) {
    const n = parseFloat(m[1]);
    if (n > 0) {
      const curt = html.slice(0, m.index).split("\n").length;
      htmlAttr.set(round2(n), (htmlAttr.get(round2(n)) || 0) + 1);
    }
  }
  const inlineStyle = new Map();
  for (const m of html.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) {
    for (const d of m[1].split(";")) {
      const k = d.indexOf(":");
      if (k < 0) continue;
      const prop = d.slice(0, k).trim().toLowerCase();
      if (!WIDTH_PROP.test(prop)) continue;
      for (const n of numFrom(d.slice(k + 1), /stroke-width/.test(prop))) inlineStyle.set(n, (inlineStyle.get(n) || 0) + 1);
    }
  }
  const styleBlocks = new Map();
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const d of stripComments(m[1]).split(";")) {
      const k = d.indexOf(":");
      if (k < 0) continue;
      const prop = d.slice(0, k).trim().toLowerCase();
      if (!WIDTH_PROP.test(prop)) continue;
      for (const n of numFrom(d.slice(k + 1), /stroke-width/.test(prop))) styleBlocks.set(n, (styleBlocks.get(n) || 0) + 1);
    }
  }

  const legacy = legacyVerdict(css, vars);
  rows.push({ id, top, mediaAll, htmlAttr, inlineStyle, styleBlocks, legacy });
}

const fmt = (m) => [...m.keys()].sort((a, b) => a - b).map((n) => n).join(",") || "—";

console.log("=== 每案线宽来源（数值，px 或 SVG 用户单位）===");
console.log("案   CSS顶层        CSS窄屏媒体     HTML属性      HTML内联     HTML<style>   旧抽取(收窄后) → 旧原始");
for (const r of rows) {
  console.log(
    r.id.padEnd(4) + " " + fmt(r.top).padEnd(14) + " " + fmt(r.mediaAll).padEnd(14) + " " +
    fmt(r.htmlAttr).padEnd(13) + " " + fmt(r.inlineStyle).padEnd(12) + " " + fmt(r.styleBlocks).padEnd(13) +
    r.legacy.text + " → " + r.legacy.raw.join(",")
  );
}

console.log("\n=== 详情：每个值来自哪条声明（只列 top 与 mediaAll 有值且值为 0.3–4 的）===");
for (const r of rows) {
  const keys = [...new Set([...r.top.keys(), ...r.mediaAll.keys()])].sort((a, b) => a - b);
  if (!keys.length) continue;
  console.log("\n" + r.id);
  for (const k of keys) {
    const t = r.top.get(k), m = r.mediaAll.get(k);
    console.log("  " + String(k).padEnd(5) + " CSS顶层:" + (t ? t.slice(0, 2).join(" ; ").slice(0, 100) : "—"));
    if (m) console.log("        CSS媒体:" + m.slice(0, 3).join(" ; ").slice(0, 120));
  }
  if (r.htmlAttr.size) console.log("  HTML属性:" + [...r.htmlAttr.entries()].map(([k, c]) => k + "×" + c).join(" "));
  if (r.inlineStyle.size) console.log("  HTML内联:" + [...r.inlineStyle.entries()].map(([k, c]) => k + "×" + c).join(" "));
  if (r.styleBlocks.size) console.log("  HTMLstyle:" + [...r.styleBlocks.entries()].map(([k, c]) => k + "×" + c).join(" "));
}
