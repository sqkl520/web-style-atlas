/**
 * 探针 a05：线宽声明按「媒体条件」分类（只读）。
 *
 * 回答两个问题：
 *  ① 哪些线宽声明只出现在 @media 里（= 1440px 桌面视口不生效，属"窄屏专用"）？
 *  ② 有没有 `@media (min-width: …)` 里的线宽声明（这种在桌面成立，不能算窄屏）？
 *
 * 重跑：node deliverables/70-exec/probes-a/a05-linewidth-media-split.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const WIDTH_PROPS = /^(border|border-width|border-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end)(-width)?|outline|outline-width|column-rule|column-rule-width|stroke-width)$/i;

function walk(css, media, cb) {
  let i = 0, selStart = 0;
  const stack = [];
  while (i < css.length) {
    const ch = css[i];
    if (ch === "{") {
      stack.push({ sel: css.slice(selStart, i).trim(), start: i + 1, media });
      selStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (top) {
        const body = css.slice(top.start, i);
        if (/^@(media|supports|layer|container)\b/i.test(top.sel)) walk(body, top.sel.trim(), cb);
        else if (!stack.some((s) => /^@/.test(s.sel))) cb(top.sel, body, top.media);
      }
      selStart = i + 1;
    } else if (ch === ";" && !stack.length) selStart = i + 1;
    i++;
  }
}

const declsOf = (body) => {
  const out = [];
  for (const raw of body.split(";")) {
    const k = raw.indexOf(":");
    if (k < 0) continue;
    const prop = raw.slice(0, k).trim();
    if (!WIDTH_PROPS.test(prop)) continue;
    out.push({ prop, value: raw.slice(k + 1).trim() });
  }
  return out;
};

let minWidthMediaHits = 0;
const onlyMedia = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  const desktop = new Set(), narrow = new Set();
  walk(css, null, (sel, body, media) => {
    const isDesktop = !media || (/min-width/.test(media) && !/max-width/.test(media));
    if (media && isDesktop) minWidthMediaHits++;
    for (const d of declsOf(body)) {
      const nums = [...d.value.matchAll(/([0-9.]+)px/g)].map((m) => parseFloat(m[1]));
      if (/stroke-width/.test(d.prop)) {
        const bare = d.value.match(/^\s*([0-9.]+)\s*$/);
        if (bare) nums.push(parseFloat(bare[1]));
      }
      for (const n of nums.filter((n) => n > 0)) (isDesktop ? desktop : narrow).add(Math.round(n * 100) / 100);
    }
  });
  const mediaOnly = [...narrow].filter((n) => !desktop.has(n)).sort((a, b) => a - b);
  if (mediaOnly.length) {
    onlyMedia.push({ id, mediaOnly });
    console.log(id + "  桌面值=[" + [...desktop].sort((a, b) => a - b).join(",") + "]  仅媒体值=[" + mediaOnly.join(",") + "]");
  }
}

console.log("\n=== 汇总 ===");
console.log("  有「仅窄屏」线宽值的案：" + onlyMedia.length + "/30");
console.log("  @media(min-width:…)-only 里的线宽声明数：" + minWidthMediaHits + "（0 表示没有「桌面专用」媒体覆盖）");

/* HTML 侧：属性 / 内联 style / <style> / data-URI */
console.log("\n=== HTML 侧（属性 + 内联 + <style> + CSS data-URI）===");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const cssRaw = readFileSync(join(P, dir, "style.css"), "utf8");
  const html = readFileSync(join(P, dir, "index.html"), "utf8");
  const attr = [...html.matchAll(/\bstroke-width\s*=\s*["']([^"']+)["']/gi)].map((m) => +m[1]);
  const inline = [];
  for (const m of html.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi))
    for (const d of m[1].split(";")) {
      const mm = d.match(/^\s*(stroke-width|border(?:-[a-z-]+)?|outline(?:-width)?)\s*:\s*([^;]+)/i);
      if (mm) inline.push(mm[2].trim());
    }
  const styleBlock = [];
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    for (const d of strip(m[1]).split(";")) {
      const mm = d.match(/^\s*(stroke-width|border(?:-[a-z-]+)?|outline(?:-width)?)\s*:\s*([^;]+)/i);
      if (mm) styleBlock.push(mm[2].trim());
    }
  const dataUri = [...cssRaw.matchAll(/stroke-width(?:=|%3D)['"]?([%0-9.]+)/gi)].map((m) => m[1]);
  if (!attr.length && !inline.length && !styleBlock.length && !dataUri.length) continue;
  console.log(
    id.padEnd(4) +
    " attr=[" + [...new Set(attr)].sort().join(",") + "]" +
    " inline=[" + inline.join("|") + "]" +
    " style=[" + styleBlock.join("|") + "]" +
    (dataUri.length ? " dataURI=[" + dataUri.join(",") + "]" : "")
  );
}
