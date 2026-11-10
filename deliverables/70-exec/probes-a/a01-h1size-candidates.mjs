/**
 * 探针 a01：h1Size 的候选来源盘点（只读，不改任何文件）。
 *
 * 目的：回答三个问题
 *  1) dna-raw.json 里 h1Size 的那条正则 `/h1\s*\{[^}]*font-size/` 到底匹配到了哪条规则？
 *     （它不区分裸 h1 / .masthead h1 / @media 里的覆盖）
 *  2) 30 案各自「桌面档」的 h1 字号应当是什么？候选按 CSS 层叠优先级列出。
 *  3) var(--fs-h1) 的真实值，以及是否有多档 @media 覆盖。
 *
 * 重跑：node deliverables/70-exec/probes-a/a01-h1size-candidates.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const P = join(ROOT, "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/* 按花括号配对走规则，并记录「是否在 @media 内」以及条件原文。
 * 这是本探针的核心：旧抽取用的 `/h1\s*\{/` 完全看不到这条信息。 */
function walkRules(css, media, cb) {
  let i = 0, selStart = 0, depth = 0;
  const stack = [];
  while (i < css.length) {
    const ch = css[i];
    if (ch === "{") {
      const sel = css.slice(selStart, i).trim();
      stack.push({ sel, start: i + 1, media });
      depth++;
      selStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (top) {
        const body = css.slice(top.start, i);
        if (/^@(media|supports|layer|container)\b/i.test(top.sel)) {
          walkRules(body, top.sel, cb);
        } else if (!stack.some((s) => /^@/.test(s.sel))) {
          /* 只在「不在任何条件组里」时上报；条件组里的规则由上面的递归带 media 上报一次。
           * 漏掉这个判断会把 @media 里的覆盖同时算成顶层值（首版探针的真 bug）。 */
          cb(top.sel, body, top.media);
        }
      }
      depth--;
      selStart = i + 1;
    } else if (ch === ";" && depth === 0) {
      selStart = i + 1;
    }
    i++;
  }
}

const rootVars = (css) => {
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return vars;
};

const resolveVars = (value, vars, depth = 0) => {
  if (depth > 6 || !value.includes("var(")) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (all, name, fb) =>
    vars[name] ? resolveVars(vars[name], vars, depth + 1) : fb || "");
};

const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const rawCss = readFileSync(join(P, dir, "style.css"), "utf8");
  const css = stripComments(rawCss);
  const vars = rootVars(css);
  const html = readFileSync(join(P, dir, "index.html"), "utf8");
  const h1Tag = (html.match(/<h1\b[^>]*>/i) || [""])[0];
  const clsM = h1Tag.match(/\bclass\s*=\s*["']([^"']+)["']/i);
  const h1Classes = clsM ? clsM[1].trim().split(/\s+/).filter(Boolean) : [];

  /* 旧正则复现：/h1\s*\{[^}]*font-size\s*:\s*([^;}]+)/ —— 注意它在 @media 里也会命中，
   * 因为 @media 的花括号对它不可见（它只是文本匹配）。 */
  const legacy = css.match(/h1\s*\{[^}]*font-size\s*:\s*([^;}]+)/);

  const cands = [];
  walkRules(css, null, (sel, body, media) => {
    const fm = body.match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/);
    if (!fm) return;
    const groups = sel.split(",").map((s) => s.trim().replace(/\s+/g, " "));
    const hitBareH1 = groups.some((g) => /^h1(?![a-z0-9-])/i.test(g));
    const hitH1Desc = groups.some((g) => /(^|[\s>+~])h1(?![a-z0-9-])/i.test(g));
    const hitClass = h1Classes.some((c) => groups.some((g) => new RegExp("\\." + c + "(?![\\w-])").test(g)));
    if (!hitBareH1 && !hitH1Desc && !hitClass) return;
    cands.push({
      sel, media: media || "(顶层)", value: fm[1].trim(),
      resolved: resolveVars(fm[1].trim(), vars, 0),
      kind: hitBareH1 ? "bare-h1" : hitH1Desc ? "h1-desc" : "h1-class",
    });
  });

  rows.push({ id, dir, h1Classes, legacy: legacy ? legacy[1].trim() : "", cands });
}

/* 打印 */
console.log("=== 1) 旧正则命中了什么（dna-raw.json 的 h1Size 出处）===");
for (const r of rows) {
  const legacyCand = r.cands.find((c) => stripComments(r.legacy).includes(c.value)) || null;
  console.log(
    r.id.padEnd(4) + " legacy=" + JSON.stringify(r.legacy).padEnd(34) +
    " 命中规则=" + (legacyCand ? legacyCand.kind + " `" + legacyCand.sel + "` @ " + legacyCand.media : "(无/需人工看)")
  );
}

console.log("\n=== 2) 30 案 h1 字号候选（顶层优先，@media 单列）===");
for (const r of rows) {
  console.log("\n" + r.id + "  " + r.dir + "  h1.class=" + JSON.stringify(r.h1Classes));
  for (const c of r.cands) {
    console.log(
      "   [" + (c.media === "(顶层)" ? "顶层  " : "MEDIA ") + "] " + c.kind.padEnd(8) +
      " " + c.sel.padEnd(28).slice(0, 28) + "  " + c.value.padEnd(28) + " -> " + c.resolved
    );
  }
  if (!r.cands.length) console.log("   (没有任何 h1 相关 font-size 规则)");
}

console.log("\n=== 3) --fs-h1 的定义与覆盖 ===");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = stripComments(readFileSync(join(P, dir, "style.css"), "utf8"));
  const defs = [...css.matchAll(/(--fs-h1)\s*:\s*([^;]+);/g)].map((m) => m[2].trim());
  if (!defs.length) continue;
  /* 覆盖位置：把每处 --fs-h1 声明所在的选择器与媒体条件写出来 */
  const where = [];
  walkRules(css, null, (sel, body, media) => {
    const m = body.match(/--fs-h1\s*:\s*([^;]+);/);
    if (m) where.push({ sel, media: media || "(顶层)", value: m[1].trim() });
  });
  console.log(id + "  " + JSON.stringify(defs) + "  位置：" +
    where.map((w) => w.value + "@" + w.media).join(" | "));
}
