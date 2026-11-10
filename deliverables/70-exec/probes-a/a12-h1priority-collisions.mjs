/**
 * 探针 a12：h1 字号「优先级阶梯」是否真的在 30 案里分出了胜负？
 *
 * h1SizeVerdict 按 裸 h1 → h1 后代 → h1 的 class 排优先级，取最高一档里最后一条。
 * 如果某一案同时有「裸 h1 的 font-size」和「.doctitle 的 font-size」，那优先级就是一个
 * **判断**（可能错），不是一个事实。本探针把这种情况全列出来，好让人复核。
 *
 * 判据：只统计「桌面成立」的规则（顶层 / min-width≤1440 / max-width≥1440 / @supports）。
 *
 * 重跑：node deliverables/70-exec/probes-a/a12-h1priority-collisions.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const desktopOk = (cond) => {
  if (!cond) return true;
  if (/prefers-|print|forced-colors/i.test(cond)) return false;
  const mins = [...cond.matchAll(/min-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
  const maxs = [...cond.matchAll(/max-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
  if (!mins.length && !maxs.length) return true; // @supports 之类
  return (!mins.length || Math.min(...mins) <= 1440) && (!maxs.length || Math.max(...maxs) >= 1440);
};

const collisions = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  const html = readFileSync(join(P, dir, "index.html"), "utf8");
  const tag = (html.match(/<h1\b[^>]*>/i) || [""])[0];
  const cls = ((tag.match(/\bclass\s*=\s*["']([^"']+)["']/i) || ["", ""])[1] || "").split(/\s+/).filter(Boolean);

  const blocks = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let d = 1, i = m.index + m[0].length;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    blocks.push({ cond: m[1].trim(), from: m.index, to: i });
  }
  const byKind = { bare: [], desc: [], cls: [] };
  for (const m of css.matchAll(/(?:^|[;{\s])([^{};]*?)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    if (!sel || /^@/.test(sel)) continue;
    const fm = m[2].match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/);
    if (!fm) continue;
    const at = m.index + m[0].indexOf(sel);
    const inside = blocks.filter((b) => at > b.from && at < b.to).pop();
    if (inside && !desktopOk(inside.cond)) continue;
    const groups = sel.split(",").map((s) => s.trim());
    const bare = groups.some((g) => /^h1(?![\w-])/i.test(g));
    const desc = groups.some((g) => /(^|[\s>+~])h1(?![\w-])/i.test(g));
    const clsHit = cls.some((c) => groups.some((g) => new RegExp("\\." + c + "(?![\\w-])").test(g)));
    if (!bare && !desc && !clsHit) continue;
    const rec = { sel, value: fm[1].trim(), media: inside ? inside.cond : "(顶层)" };
    byKind[bare ? "bare" : desc ? "desc" : "cls"].push(rec);
  }
  const kinds = Object.keys(byKind).filter((k) => byKind[k].length);
  if (kinds.length > 1) {
    collisions.push({ id, byKind });
  }
}

console.log("=== 桌面档里「多个优先级阶梯同时有字号」的案 ===");
if (!collisions.length) {
  console.log("  0 案 —— 每一案都只有唯一一档命中，优先级规则没有参与决策（结论无歧义）");
} else {
  for (const c of collisions) {
    console.log("\n" + c.id);
    for (const k of ["bare", "desc", "cls"]) {
      for (const r of c.byKind[k]) console.log("  [" + k.padEnd(4) + "] " + r.sel.padEnd(30) + " " + r.value.padEnd(28) + " @" + r.media);
    }
  }
}

/* 另外把「h1 上有 class、但字号写在别的 class 上」的案列出来 —— 那是 fetch 失败的另一类：
 * 名字对不上（h1.class 是 masthead__title，字号却写在 .masthead__title 之外的地方）。 */
console.log("\n=== 逐案：h1 的 class 列表 vs 实际命中的档位 ===");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  const html = readFileSync(join(P, dir, "index.html"), "utf8");
  const tag = (html.match(/<h1\b[^>]*>/i) || [""])[0];
  const cls = ((tag.match(/\bclass\s*=\s*["']([^"']+)["']/i) || ["", ""])[1] || "").split(/\s+/).filter(Boolean);
  const dna = JSON.parse(readFileSync(join(P, "_prompts/dna-clean.json"), "utf8")).find((x) => x.id === id);
  console.log(id + "  h1.class=" + JSON.stringify(cls).padEnd(30) + " h1Size=" + JSON.stringify(dna.h1Size));
}
